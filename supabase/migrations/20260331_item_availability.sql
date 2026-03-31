-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: feat/item-availability-state
-- Adds availability tracking to wardrobe_items so users can mark items as
-- available, unavailable, or needing a wash. The frontend uses this to:
--   • Show availability badges on wardrobe cards
--   • Filter the wardrobe and outfit builder by availability
--   • Warn in the planner when an outfit contains unavailable items
--   • Guide composition in the manual outfit builder draft panel
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add the column
--    DEFAULT 'available' means all existing rows are immediately valid.
--    NOT NULL ensures no ambiguous nulls go into the frontend.
ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available';

-- 2. Add the check constraint
--    Wrapped in a DO block so it's safe to re-run (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname    = 'wardrobe_items_availability_check'
    AND    conrelid   = 'public.wardrobe_items'::regclass
  ) THEN
    ALTER TABLE public.wardrobe_items
      ADD CONSTRAINT wardrobe_items_availability_check
      CHECK (availability IN ('available', 'unavailable', 'needs_washing'));
  END IF;
END $$;

-- 3. Index for filtering queries
--    Wardrobe and builder both filter by (user_id, availability) so a
--    composite index keeps those queries fast as the collection grows.
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_availability
  ON public.wardrobe_items (user_id, availability);

-- ─────────────────────────────────────────────────────────────────────────────
-- No RLS changes required.
-- The existing catch-all policy on wardrobe_items already covers all columns:
--   CREATE POLICY "Users control own wardrobe items"
--   ON public.wardrobe_items FOR ALL USING (auth.uid() = user_id);
-- ─────────────────────────────────────────────────────────────────────────────
