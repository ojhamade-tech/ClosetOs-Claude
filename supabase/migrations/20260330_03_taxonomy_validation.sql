-- ==============================================================================
-- VALIDATION: Taxonomy Cleanup & Analytics V2
-- Description: Test queries to verify the taxonomy migration succeeded and
-- that the backend data state is completely normalized.
-- ==============================================================================

-- 1. Distinct raw categories
-- Expected output: Only strict mapped sets (e.g. Tops, Bottoms, Outerwear, Footwear, Accessories, Other)
SELECT
  category,
  count(*) as count
FROM public.wardrobe_items
GROUP BY category
ORDER BY count DESC;

-- 2. Count of items routed to the conservative "Other" bucket
-- Expected: The number of items successfully preserved from ambiguous data
SELECT
  count(*) as total_other_mapped
FROM public.wardrobe_items
WHERE category = 'Other';

-- 3. Item usage analytics API structure
-- Expected: Must output updated schema (id, name, category, subcategory, color, image_url, worn_count, last_worn_date)
SELECT * FROM public.get_item_usage_analytics(
  '2026-01-01'::date,
  '2026-12-31'::date
) LIMIT 5;

-- 4. Category distribution summation
-- Expected: Normalized buckets explicitly mapped from the RPC, percentages calculate cleanly to 100%
SELECT * FROM public.get_category_distribution();

-- 5. Zero-data safety
-- Expected: Empty result set (no pg/division errors)
SELECT * FROM public.get_item_usage_analytics('2100-01-01'::date, '2100-12-31'::date);
