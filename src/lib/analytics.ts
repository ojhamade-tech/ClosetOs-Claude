/**
 * analytics.ts
 *
 * Analytics service layer for ClosetOS.
 * All functions call Supabase RPC functions defined in 20260330_analytics_rpc.sql.
 * All queries are user-scoped via auth.uid() inside the RPC functions on the server.
 *
 * SOURCE-OF-TRUTH RULES (enforced in SQL, documented here for clarity):
 *   - Streaks / engagement:          activity_log
 *   - Item usage (worn appearances):  weekly_plans(status='worn') → outfit_items → wardrobe_items
 *   - Distribution metrics:           wardrobe_items (category, color)
 *   - Outfit counts:                  outfits table
 *   - Planning/wear conversion:       weekly_plans
 *   - Normalize strings:              lower(trim(...)), null → 'unknown'
 *
 * STREAK METRIC — EXPLICIT PRODUCT DEFINITION:
 *   Metric name: wearStreakDays (displayed as "Wear Streak")
 *   Definition:  The length of the most recent consecutive run of calendar days
 *                on which the user logged at least one 'marked_worn' event,
 *                counting backward from the MOST RECENT wear date (not today).
 *   Implication: If the user wore something yesterday but not today, the streak
 *                is still alive. This is "latest consecutive wear run," not a
 *                today-anchored streak. This is the intended product definition.
 *                If we later want a today-anchored streak, add a separate metric.
 */

import { supabase } from './supabase';

// ─── Safe number coercion ────────────────────────────────────────────────────
// Number(undefined) === NaN, and NaN ?? 0 does NOT fallback (NaN is not nullish).
// This helper coerces safely: toNum(null) → 0, toNum(NaN) → 0, toNum('5') → 5.
function toNum(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Shared error guard ───────────────────────────────────────────────────────
// Soft-fail when the analytics migration has not been run yet.
// Supabase/PostgREST surfaces missing RPC functions inconsistently across
// environments — we cover the known codes and common message patterns.
// Any error NOT in this list is a genuine fault and is re-thrown.
function isMigrationError(error: { code?: string; message?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42P01'   || // PostgreSQL: undefined_table
    error.code === '42883'   || // PostgreSQL: undefined_function
    error.code === 'PGRST116'|| // PostgREST: no rows (.single() edge case)
    error.code === 'PGRST202'|| // PostgREST: function not found
    msg.includes('does not exist') ||
    msg.includes('could not find') ||
    msg.includes('function') && msg.includes('not found')
  );
}

// ─── Return types ─────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalItems: number;
  usedItems: number;
  unusedItems: number;
  wardrobeUsageRatePct: number;
  totalSavedOutfits: number;
  plannedDistinctOutfits: number;
  planningConversionRatePct: number;
  plannedOrWornDays: number;
  wornDays: number;
  wearConversionRatePct: number;
  totalEvents: number;
  totalSessions: number;
  eventsPerSession: number;
  activeDays: number;
  wearFrequency: number;
  planningFrequency: number;
  wearStreakDays: number;
}

export interface ItemUsageRow {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  color: string;
  imageUrl: string | null;
  purchasePrice: number | null;
  createdAt: string;
  wornCount: number;
  wornCountGlobal: number;
  lastWornDateGlobal: string | null;
}

export interface DistributionRow {
  bucket: string;
  itemCount: number;
  pct: number;
}

export interface EventMixRow {
  type: string;
  eventCount: number;
}

export interface RecentActivityRow {
  type: string;
  last7Days: number;
  last30Days: number;
}

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  topItems: ItemUsageRow[];
  leastUsedItems: ItemUsageRow[];
  dormantItems: ItemUsageRow[];
  notWornThisPeriodItems: ItemUsageRow[];
  neverWornEverItems: ItemUsageRow[];
  unwornSinceAddedItems: ItemUsageRow[];
  highValueLowUsageItems: ItemUsageRow[];
  categoryDistribution: DistributionRow[];
  colorDistribution: DistributionRow[];
  eventMix: EventMixRow[];
  recentActivityCounts: RecentActivityRow[];
}

// ─── Individual service functions ─────────────────────────────────────────────

/**
 * Aggregated KPIs: inventory usage, outfit conversion, engagement metrics, streak.
 */
export async function getAnalyticsSummary(
  startDate: string,
  endDate: string
): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc('get_analytics_summary', {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    if (isMigrationError(error)) return null;
    throw new Error(`getAnalyticsSummary failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    totalItems:                toNum(row.total_items),
    usedItems:                 toNum(row.used_items),
    unusedItems:               toNum(row.unused_items),
    wardrobeUsageRatePct:      toNum(row.wardrobe_usage_rate_pct),
    totalSavedOutfits:         toNum(row.total_saved_outfits),
    plannedDistinctOutfits:    toNum(row.planned_distinct_outfits),
    planningConversionRatePct: toNum(row.planning_conversion_rate_pct),
    plannedOrWornDays:         toNum(row.planned_or_worn_days),
    wornDays:                  toNum(row.worn_days),
    wearConversionRatePct:     toNum(row.wear_conversion_rate_pct),
    totalEvents:               toNum(row.total_events),
    totalSessions:             toNum(row.total_sessions),
    eventsPerSession:          toNum(row.events_per_session),
    activeDays:                toNum(row.active_days),
    wearFrequency:             toNum(row.wear_frequency),
    planningFrequency:         toNum(row.planning_frequency),
    wearStreakDays:            toNum(row.wear_streak_days),
  };
}

/**
 * Per-item worn appearance counts, derived from worn planner joins.
 * Returns all items (worn_count may be 0).
 */
export async function getItemUsageAnalytics(
  startDate: string,
  endDate: string
): Promise<ItemUsageRow[]> {
  const { data, error } = await supabase.rpc('get_item_usage_analytics', {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    if (isMigrationError(error)) return [];
    throw new Error(`getItemUsageAnalytics failed: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id:                 String(row.id ?? ''),
    name:               String(row.name ?? ''),
    category:           String(row.category ?? 'unknown'),
    subcategory:        row.subcategory ? String(row.subcategory) : null,
    brand:              row.brand ? String(row.brand) : null,
    color:              String(row.color ?? 'unknown'),
    imageUrl:           row.image_url ? String(row.image_url) : null,
    purchasePrice:      row.purchase_price !== null ? Number(row.purchase_price) : null,
    createdAt:          String(row.created_at ?? new Date().toISOString()),
    wornCount:          toNum(row.worn_count),
    wornCountGlobal:    toNum(row.worn_count_global),
    lastWornDateGlobal: row.last_worn_date_global ?? null,
  }));
}

/**
 * Category and color distributions from wardrobe_items.
 */
export async function getWardrobeDistributionAnalytics(): Promise<{
  categoryDistribution: DistributionRow[];
  colorDistribution: DistributionRow[];
}> {
  const [catResult, colResult] = await Promise.all([
    supabase.rpc('get_category_distribution'),
    supabase.rpc('get_color_distribution'),
  ]);

  if (catResult.error && !isMigrationError(catResult.error)) {
    throw new Error(`get_category_distribution failed: ${catResult.error.message}`);
  }
  if (colResult.error && !isMigrationError(colResult.error)) {
    throw new Error(`get_color_distribution failed: ${colResult.error.message}`);
  }

  const mapDist = (rows: any[] | null, bucketKey: string): DistributionRow[] =>
    (rows ?? []).map(r => ({
      bucket:    String(r[bucketKey] ?? 'unknown'),
      itemCount: toNum(r.item_count),
      pct:       toNum(r.pct),
    }));

  return {
    categoryDistribution: mapDist(catResult.data, 'category_bucket'),
    colorDistribution:    mapDist(colResult.data,  'color_bucket'),
  };
}

/**
 * Event type counts from activity_log within a date range.
 */
export async function getEngagementAnalytics(
  startDate: string,
  endDate: string
): Promise<EventMixRow[]> {
  // RPC expects timestamptz — convert date to start-of-day UTC
  const startTs = new Date(`${startDate}T00:00:00Z`).toISOString();
  const endTs   = new Date(`${endDate}T23:59:59Z`).toISOString();

  const { data, error } = await supabase.rpc('get_event_mix', {
    start_ts: startTs,
    end_ts:   endTs,
  });

  if (error) {
    if (isMigrationError(error)) return [];
    throw new Error(`getEngagementAnalytics failed: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    type:       String(row.type ?? ''),
    eventCount: toNum(row.event_count),
  }));
}

/**
 * Recent activity counts: last 7 and 30 days, grouped by type.
 */
export async function getRecentActivityCounts(): Promise<RecentActivityRow[]> {
  const { data, error } = await supabase.rpc('get_recent_activity_counts');

  if (error) {
    if (isMigrationError(error)) return [];
    throw new Error(`getRecentActivityCounts failed: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    type:       String(row.type ?? ''),
    last7Days:  toNum(row.last_7_days),
    last30Days: toNum(row.last_30_days),
  }));
}

/**
 * Wear streak in days.
 * Computed server-side from consecutive distinct marked_worn dates.
 * See STREAK LOGIC at the top of this file.
 * If startDate/endDate are omitted, uses the summary RPC defaults (all-time).
 */
export async function getWearStreak(
  startDate?: string,
  endDate?: string
): Promise<number> {
  const s = startDate ?? '2000-01-01';
  const e = endDate   ?? new Date().toISOString().split('T')[0];

  const summary = await getAnalyticsSummary(s, e);
  return summary?.wearStreakDays ?? 0;
}

// ─── Composite dashboard loader ───────────────────────────────────────────────

/**
 * getAnalyticsDashboard — single call to hydrate the full analytics page.
 *
 * All fetches run in parallel. Each function soft-fails gracefully if the
 * analytics migration has not yet been run (returns null / empty arrays).
 *
 * ITEM LIST RULES:
 *   topItems       — worn_count > 0, highest first
 *   leastUsedItems — worn_count > 0, ascending
 *   unusedItems    — worn_count === 0
 */
export async function getAnalyticsDashboard(
  startDate: string,
  endDate: string
): Promise<AnalyticsDashboard> {
  const [summary, items, dist, eventMix, recentActivity] = await Promise.all([
    getAnalyticsSummary(startDate, endDate),
    getItemUsageAnalytics(startDate, endDate),
    getWardrobeDistributionAnalytics(),
    getEngagementAnalytics(startDate, endDate),
    getRecentActivityCounts(),
  ]);

  const wornItems   = items.filter(i => i.wornCount > 0);
  const topItems    = [...wornItems].sort((a, b) => b.wornCount - a.wornCount).slice(0, 10);
  const leastUsed   = [...wornItems].sort((a, b) => a.wornCount - b.wornCount).slice(0, 10);
  
  const now = Date.now();
  const getDaysAgo = (dateStr: string) => Math.floor((now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

  // - Never Worn Ever: worn_count_global = 0
  // - Unworn Since Added: worn_count_global = 0 and created_at older than threshold
  const neverWornEverItems = items.filter(i => i.wornCountGlobal === 0);
  const unwornSinceAddedItems = neverWornEverItems.filter(i => getDaysAgo(i.createdAt) > 30);
  
  // - Not Worn This Period: worn_count = 0 and worn_count_global > 0
  const notWornThisPeriodItems = items.filter(i => i.wornCount === 0 && i.wornCountGlobal > 0);
  
  // - Dormant 30/60/90: worn_count_global > 0 and last_worn_date_global older than threshold
  const dormantItems = items
    .filter(i => i.wornCountGlobal > 0 && i.lastWornDateGlobal && getDaysAgo(i.lastWornDateGlobal) > 30)
    .sort((a, b) => (b.lastWornDateGlobal && a.lastWornDateGlobal ? new Date(a.lastWornDateGlobal).getTime() - new Date(b.lastWornDateGlobal).getTime() : 0));

  // - High Value, Low Usage: only if purchase_price is present
  const highValueLowUsageItems = items
    .filter(i => i.purchasePrice && i.purchasePrice > 100 && i.wornCountGlobal < 5)
    .sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0));

  const emptySummary: AnalyticsSummary = {
    totalItems: 0, usedItems: 0, unusedItems: 0, wardrobeUsageRatePct: 0,
    totalSavedOutfits: 0, plannedDistinctOutfits: 0, planningConversionRatePct: 0,
    plannedOrWornDays: 0, wornDays: 0, wearConversionRatePct: 0,
    totalEvents: 0, totalSessions: 0, eventsPerSession: 0, activeDays: 0,
    wearFrequency: 0, planningFrequency: 0, wearStreakDays: 0,
  };

  return {
    summary:              summary ?? emptySummary,
    topItems,
    leastUsedItems:       leastUsed,
    dormantItems,
    notWornThisPeriodItems,
    neverWornEverItems,
    unwornSinceAddedItems,
    highValueLowUsageItems,
    categoryDistribution: dist.categoryDistribution,
    colorDistribution:    dist.colorDistribution,
    eventMix,
    recentActivityCounts: recentActivity,
  };
}
