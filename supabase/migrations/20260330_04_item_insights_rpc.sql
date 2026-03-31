-- ─────────────────────────────────────────────────────────────────────────────
-- item_insights_rpc Update
-- Extends get_item_usage_analytics to return global wear data alongside 
-- period-specific data so the frontend can calculate true item dormancy.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.get_item_usage_analytics(date, date);

create or replace function public.get_item_usage_analytics(
  start_date date,
  end_date   date
)
returns table (
  id                     uuid,
  name                   text,
  category               text,
  subcategory            text,
  brand                  text,
  color                  text,
  image_url              text,
  purchase_price         numeric,
  created_at             timestamptz,
  worn_count_period      bigint,
  worn_count_global      bigint,
  last_worn_date_global  date
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
    coalesce(nullif(trim(lower(wi.subcategory)), ''), null)   as subcategory,
    coalesce(nullif(trim(wi.brand), ''), null)                as brand,
    coalesce(nullif(trim(lower(wi.color)),    ''), 'unknown') as color,
    wi.image_url,
    wi.purchase_price,
    wi.created_at,
    count(wp.id) filter (where wp.date >= start_date and wp.date <= end_date) as worn_count_period,
    count(wp.id)                                                              as worn_count_global,
    max(wp.date)                                                              as last_worn_date_global
  from public.wardrobe_items wi
  left join public.outfit_items oi on oi.wardrobe_item_id = wi.id
  left join public.weekly_plans wp
    on  wp.outfit_id = oi.outfit_id
    and wp.user_id   = wi.user_id
    and wp.status    = 'worn'
  where wi.user_id = auth.uid()
  group by 
    wi.id, 
    wi.name, 
    wi.category, 
    wi.subcategory, 
    wi.brand, 
    wi.color, 
    wi.image_url, 
    wi.purchase_price, 
    wi.created_at
  order by worn_count_period desc, wi.name;
$$;

grant execute on function public.get_item_usage_analytics(date, date) to authenticated;
