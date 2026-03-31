-- ClosetOS Analytics RPC Layer
-- Run AFTER 20260330_create_activity_log.sql
-- All functions are user-scoped via auth.uid() — no cross-user data leakage.
-- Safe divide-by-zero via nullif(). All functions are STABLE/SECURITY DEFINER.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_analytics_summary
-- Returns one row of aggregated KPIs for the authenticated user.
-- Engagement KPIs come from activity_log.
-- Usage KPIs come from weekly_plans -> outfits -> outfit_items -> wardrobe_items.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_analytics_summary(date, date);

create or replace function public.get_analytics_summary(
  start_date date,
  end_date   date
)
returns table (
  total_items                  bigint,
  used_items                   bigint,
  unused_items                 bigint,
  wardrobe_usage_rate_pct      numeric,
  total_saved_outfits          bigint,
  planned_distinct_outfits     bigint,
  planning_conversion_rate_pct numeric,
  planned_or_worn_days         bigint,
  worn_days                    bigint,
  wear_conversion_rate_pct     numeric,
  total_events                 bigint,
  total_sessions               bigint,
  events_per_session           numeric,
  active_days                  bigint,
  wear_frequency               bigint,
  planning_frequency           bigint,
  wear_streak_days             int
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  with uid as (select auth.uid() as id),

  -- Inventory
  all_items as (
    select id from public.wardrobe_items where user_id = (select id from uid)
  ),

  -- Items that appeared in at least one worn plan in the period
  worn_item_ids as (
    select distinct oi.wardrobe_item_id as item_id
    from public.weekly_plans wp
    join public.outfit_items oi on oi.outfit_id = wp.outfit_id
    where wp.user_id = (select id from uid)
      and wp.status  = 'worn'
      and wp.date   >= start_date
      and wp.date   <= end_date
  ),

  -- Outfits saved (owned by user)
  saved_outfits as (
    select id from public.outfits where user_id = (select id from uid)
  ),

  -- Distinct outfits that were planned at least once in period
  planned_outfits as (
    select distinct outfit_id
    from public.weekly_plans
    where user_id = (select id from uid)
      and date >= start_date
      and date <= end_date
  ),

  -- Planner day buckets
  plan_days as (
    select
      date,
      bool_or(status in ('planned','worn')) as is_planned_or_worn,
      bool_or(status = 'worn')              as is_worn
    from public.weekly_plans
    where user_id = (select id from uid)
      and date >= start_date
      and date <= end_date
    group by date
  ),

  -- Activity log aggregates
  activity_agg as (
    select
      count(*)                                                      as total_events,
      count(distinct session_id) filter (where session_id is not null) as total_sessions,
      count(distinct event_timestamp::date)                         as active_days,
      count(*) filter (where type = 'marked_worn')                  as wear_frequency,
      count(*) filter (where type = 'planned_outfit')              as planning_frequency
    from public.activity_log
    where user_id = (select id from uid)
      and event_timestamp >= start_date::timestamptz
      and event_timestamp <  (end_date + interval '1 day')::timestamptz
  ),

  -- Streak: consecutive distinct calendar days with a marked_worn event,
  -- counting backward from the most recent wear date (not necessarily today).
  -- Interpretation: "current streak" stops at the first missing day.
  wear_dates as (
    select distinct event_timestamp::date as wear_date
    from public.activity_log
    where user_id = (select id from uid)
      and type = 'marked_worn'
    order by wear_date desc
  ),
  streak_calc as (
    select
      wear_date,
      row_number() over (order by wear_date desc) as rn
    from wear_dates
  ),
  streak_result as (
    select count(*) as streak_days
    from streak_calc
    where wear_date = (select max(wear_date) from wear_dates) - (rn - 1)
  )

  select
    -- Inventory
    (select count(*) from all_items)                                             as total_items,
    (select count(*) from worn_item_ids)                                         as used_items,
    (select count(*) from all_items) - (select count(*) from worn_item_ids)      as unused_items,
    round(
      100.0 * (select count(*) from worn_item_ids)::numeric
      / nullif((select count(*) from all_items), 0), 1
    )                                                                            as wardrobe_usage_rate_pct,

    -- Outfit counts
    (select count(*) from saved_outfits)                                         as total_saved_outfits,
    (select count(*) from planned_outfits)                                       as planned_distinct_outfits,
    round(
      100.0 * (select count(*) from planned_outfits)::numeric
      / nullif((select count(*) from saved_outfits), 0), 1
    )                                                                            as planning_conversion_rate_pct,

    -- Planning / wear conversion
    (select count(*) filter (where is_planned_or_worn) from plan_days)           as planned_or_worn_days,
    (select count(*) filter (where is_worn)            from plan_days)           as worn_days,
    round(
      100.0 * (select count(*) filter (where is_worn) from plan_days)::numeric
      / nullif((select count(*) filter (where is_planned_or_worn) from plan_days), 0), 1
    )                                                                            as wear_conversion_rate_pct,

    -- Engagement (from activity_log)
    a.total_events,
    a.total_sessions,
    round(a.total_events::numeric / nullif(a.total_sessions, 0), 2)              as events_per_session,
    a.active_days,
    a.wear_frequency,
    a.planning_frequency,
    coalesce((select streak_days from streak_result), 0)::int                   as wear_streak_days

  from activity_agg a;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_item_usage_analytics
-- Per-item worn counts derived from worn weekly_plans -> outfit_items chain.
-- NOT from wardrobe_items.wear_count.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_item_usage_analytics(date, date);

create or replace function public.get_item_usage_analytics(
  start_date date,
  end_date   date
)
returns table (
  id             uuid,
  name           text,
  category       text,
  color          text,
  worn_count     bigint,
  last_worn_date date
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  select
    wi.id,
    wi.name,
    coalesce(nullif(trim(lower(wi.category)), ''), 'unknown') as category,
    coalesce(nullif(trim(lower(wi.color)),    ''), 'unknown') as color,
    count(wp.id)                                              as worn_count,
    max(wp.date)                                              as last_worn_date
  from public.wardrobe_items wi
  left join public.outfit_items oi on oi.wardrobe_item_id = wi.id
  left join public.weekly_plans wp
    on  wp.outfit_id = oi.outfit_id
    and wp.user_id   = wi.user_id
    and wp.status    = 'worn'
    and wp.date     >= start_date
    and wp.date     <= end_date
  where wi.user_id = auth.uid()
  group by wi.id, wi.name, wi.category, wi.color
  order by worn_count desc, wi.name;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_category_distribution
-- Count and percentage of wardrobe items by normalized category.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_category_distribution();

create or replace function public.get_category_distribution()
returns table (
  category_bucket text,
  item_count      bigint,
  pct             numeric
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  with buckets as (
    select
      coalesce(nullif(trim(lower(category)), ''), 'unknown') as category_bucket,
      count(*) as item_count
    from public.wardrobe_items
    where user_id = auth.uid()
    group by 1
  ),
  total as (select sum(item_count) as n from buckets)
  select
    b.category_bucket,
    b.item_count,
    round(100.0 * b.item_count / nullif(t.n, 0), 1) as pct
  from buckets b, total t
  order by item_count desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. get_color_distribution
-- Count and percentage of wardrobe items by normalized color.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_color_distribution();

create or replace function public.get_color_distribution()
returns table (
  color_bucket text,
  item_count   bigint,
  pct          numeric
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  with buckets as (
    select
      coalesce(nullif(trim(lower(color)), ''), 'unknown') as color_bucket,
      count(*) as item_count
    from public.wardrobe_items
    where user_id = auth.uid()
    group by 1
  ),
  total as (select sum(item_count) as n from buckets)
  select
    b.color_bucket,
    b.item_count,
    round(100.0 * b.item_count / nullif(t.n, 0), 1) as pct
  from buckets b, total t
  order by item_count desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. get_event_mix
-- Counts per event type from activity_log within a timestamptz range.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_event_mix(timestamptz, timestamptz);

create or replace function public.get_event_mix(
  start_ts timestamptz,
  end_ts   timestamptz
)
returns table (
  type        text,
  event_count bigint
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  select type, count(*) as event_count
  from public.activity_log
  where user_id         = auth.uid()
    and event_timestamp >= start_ts
    and event_timestamp <  end_ts
  group by type
  order by event_count desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_recent_activity_counts
-- Grouped event counts for the last 7 and 30 days by type.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_recent_activity_counts();

create or replace function public.get_recent_activity_counts()
returns table (
  type          text,
  last_7_days   bigint,
  last_30_days  bigint
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $$
  select
    type,
    count(*) filter (where event_timestamp >= now() - interval '7 days')  as last_7_days,
    count(*) filter (where event_timestamp >= now() - interval '30 days') as last_30_days
  from public.activity_log
  where user_id = auth.uid()
    and event_timestamp >= now() - interval '30 days'
  group by type
  order by last_30_days desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANT execute to authenticated users
-- ─────────────────────────────────────────────────────────────────────────────
grant execute on function public.get_analytics_summary(date, date)           to authenticated;
grant execute on function public.get_item_usage_analytics(date, date)        to authenticated;
grant execute on function public.get_category_distribution()                 to authenticated;
grant execute on function public.get_color_distribution()                    to authenticated;
grant execute on function public.get_event_mix(timestamptz, timestamptz)     to authenticated;
grant execute on function public.get_recent_activity_counts()                to authenticated;
