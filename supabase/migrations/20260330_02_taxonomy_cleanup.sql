-- ==============================================================================
-- Migration: Taxonomy Cleanup & Analytics V2
-- Description: Safely normalizes wardrobe_items.category and updates analytics RPCs.
-- ==============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SAFE DATA MIGRATION
-- Normalizes existing categories to the new strict taxonomy constraint.
-- Subcategories and other fields are 100% untouched.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.wardrobe_items
SET category = 
  CASE
    -- Already normalized or exact matches (case-insensitive)
    WHEN trim(lower(category)) = 'tops' THEN 'Tops'
    WHEN trim(lower(category)) = 'bottoms' THEN 'Bottoms'
    WHEN trim(lower(category)) = 'outerwear' THEN 'Outerwear'
    WHEN trim(lower(category)) = 'footwear' THEN 'Footwear'
    WHEN trim(lower(category)) = 'accessories' THEN 'Accessories'
    WHEN trim(lower(category)) = 'other' THEN 'Other'
    
    -- High-confidence legacy mappings
    WHEN lower(category) LIKE '%denim%' THEN 'Bottoms'
    WHEN lower(category) LIKE '%shoes%' THEN 'Footwear'
    WHEN lower(category) LIKE '%access%' THEN 'Accessories'
    WHEN lower(category) LIKE '%outerwear%' THEN 'Outerwear'
    WHEN lower(category) LIKE '%knitwear%' THEN 'Tops'
    WHEN lower(category) LIKE '%silk & cashmere%' THEN 'Other'
    
    -- Ambiguous, null, blank -> Option B: Map to Other
    ELSE 'Other'
  END;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. UPDATE RPC: get_category_distribution
-- Serve normalized categories directly; fallback to 'Other' safety net.
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
      coalesce(nullif(trim(category), ''), 'Other') as category_bucket,
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
-- 3. UPDATE RPC: get_item_usage_analytics
-- Injects subcategory and image_url for UI widgets.
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
  subcategory    text,
  color          text,
  image_url      text,
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
    coalesce(nullif(trim(wi.category), ''), 'Other') as category,
    wi.subcategory,
    coalesce(nullif(trim(lower(wi.color)),    ''), 'unknown') as color,
    wi.image_url,
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
  group by wi.id, wi.name, wi.category, wi.subcategory, wi.color, wi.image_url
  order by worn_count desc, wi.name;
$$;

COMMIT;
