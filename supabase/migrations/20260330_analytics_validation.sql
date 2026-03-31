-- ClosetOS Analytics — Live Validation Checklist
-- Run these in the Supabase SQL Editor after both migrations are applied.
-- Replace <your_user_id> with your auth.users.id value.

-- ─────────────────────────────
-- 1. Activity log counts by type
-- Expected: rows for added_item, saved_outfit, planned_outfit, etc.
-- If empty: migration ran but no events logged yet. Perform actions in the app first.
-- ─────────────────────────────
select type, count(*) as event_count
from public.activity_log
where user_id = auth.uid()
group by type
order by event_count desc;

-- ─────────────────────────────
-- 2. Weekly plans counts by status
-- Expected: rows for 'planned', 'worn', 'skipped'
-- Source of truth for item usage analytics.
-- ─────────────────────────────
select status, count(*) as plan_count
from public.weekly_plans
where user_id = auth.uid()
group by status;

-- ─────────────────────────────
-- 3. Wardrobe items missing category or color
-- These will map to 'unknown' bucket in distribution analytics.
-- Action: edit these items in the app to populate the fields.
-- ─────────────────────────────
select id, name, category, color
from public.wardrobe_items
where user_id = auth.uid()
  and (trim(category) = '' or category is null
    or trim(color)    = '' or color    is null);

-- ─────────────────────────────
-- 4. Item usage aggregates vs summary
-- RELATIONSHIP: sum(worn_count) >= used_items (always)
--   used_items counts DISTINCT items worn at least once.
--   sum(worn_count) counts TOTAL worn appearances (one item worn 5 times = 5).
--   So total appearances >= distinct used items.
-- ACTION: if sum(worn_count) < items_with_appearances, something is wrong in the join.
-- ─────────────────────────────
select
  count(*) filter (where worn_count > 0) as items_with_appearances,
  count(*) filter (where worn_count = 0) as items_never_worn,
  sum(worn_count) as total_worn_appearances
from public.get_item_usage_analytics(
  (current_date - interval '30 days')::date,
  current_date
);

-- Cross-check with summary:
select used_items, unused_items, total_items
from public.get_analytics_summary(
  (current_date - interval '30 days')::date,
  current_date
);

-- ─────────────────────────────
-- 5. Streak correctness: verify it counts DISTINCT dates, not raw event count
-- If streak_days > number of distinct wear dates something is wrong.
-- ─────────────────────────────
-- Distinct wear dates:
select count(distinct event_timestamp::date) as distinct_wear_days
from public.activity_log
where user_id = auth.uid()
  and type = 'marked_worn';

-- Summary streak (should be <= distinct_wear_days unless all days are consecutive):
select wear_streak_days
from public.get_analytics_summary(
  '2000-01-01'::date,
  current_date
);

-- Wear date series (manual verification):
select distinct event_timestamp::date as wear_date
from public.activity_log
where user_id = auth.uid()
  and type = 'marked_worn'
order by wear_date desc
limit 20;

-- ─────────────────────────────
-- 6. Zero-data safety check
-- All RPC functions must return empty result sets (not errors) for new users.
-- ─────────────────────────────
select * from public.get_analytics_summary('2000-01-01', current_date);
select * from public.get_item_usage_analytics('2000-01-01', current_date);
select * from public.get_category_distribution();
select * from public.get_color_distribution();
select * from public.get_event_mix(now() - interval '30 days', now());
select * from public.get_recent_activity_counts();
