import React, { useEffect, useState } from 'react';
import { Layers, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getActivityLog, ActivityLogEntry } from '../lib/api';
import { getAnalyticsDashboard, AnalyticsDashboard } from '../lib/analytics';
import { WardrobeItem } from '../types';

// Stitch-generated insight components
import { StyleInsightsKPI, KPIData } from './insights/StyleInsightsKPI';
import { StyleDNA, ColorDNAItem, CategoryItem, DormantCollectionItem } from './insights/StyleDNA';
import { ActivityFeed } from './insights/ActivityFeed';

// ─────────────────────────────────────────────────────────────
// Adapter: maps analytics service types → Stitch component props
// Only called once data is loaded; never blocks the UI.
// ─────────────────────────────────────────────────────────────

// Well-known color → display hex. Supplemented by analytics color_bucket names.
const COLOR_HEX: Record<string, string> = {
  navy: '#1B2A4A', black: '#1A1A1A', white: '#F9F8F6', ivory: '#F5F0E8',
  camel: '#C19A6B', brown: '#8B6346', charcoal: '#3D3D3D', grey: '#8C857B',
  gray: '#8C857B', olive: '#5A5A40', beige: '#D2CFC9', cream: '#EDE8DE',
  burgundy: '#800020', red: '#B22222', blue: '#264E8C', green: '#4A6741',
  unknown: '#C4C4C4',
};

function toKPIData(dashboard: AnalyticsDashboard): KPIData {
  return {
    totalItems: dashboard.summary.totalItems,
    outfitsCreated: dashboard.summary.totalSavedOutfits,
    daysPlanned: dashboard.summary.plannedOrWornDays,
    wearStreak: dashboard.summary.wearStreakDays,
  };
}

function toColorDNA(dashboard: AnalyticsDashboard): ColorDNAItem[] {
  // Source: get_color_distribution (wardrobe_items, normalized)
  return dashboard.colorDistribution.slice(0, 5).map(row => ({
    color: row.bucket.charAt(0).toUpperCase() + row.bucket.slice(1),
    hex: COLOR_HEX[row.bucket.toLowerCase()] ?? '#C4C4C4',
    count: row.itemCount,
  }));
}

function toCategoryItems(dashboard: AnalyticsDashboard): CategoryItem[] {
  // Source: get_category_distribution (wardrobe_items, normalized via backend migration)
  return dashboard.categoryDistribution.slice(0, 6).map((row) => ({ 
    label: row.bucket, 
    percent: row.pct 
  }));
}

function toDormantItems(dashboard: AnalyticsDashboard): DormantCollectionItem[] {
  // Only show truly dormant items: items that HAVE been worn but not recently.
  // Never use createdAt as a proxy for lastWornDate.
  return dashboard.dormantItems
    .filter(item => item.lastWornDateGlobal) // Only items with real last-worn data
    .slice(0, 3)
    .map(item => ({
      name: item.name,
      daysAgo: Math.floor((Date.now() - new Date(item.lastWornDateGlobal!).getTime()) / (1000 * 60 * 60 * 24)),
      imageUrl: item.imageUrl || undefined,
    }));
}

function toActivityFeedEvents(activityLog: ActivityLogEntry[]) {
  const fmt = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hrs < 24) return `${hrs} hr ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const EVENT_LABELS: Record<string, string> = {
    added_item:       'Added item to wardrobe',
    saved_outfit:     'Saved outfit',
    planned_outfit:   'Planned outfit for {date}',
    removed_plan:     'Removed plan for {date}',
    marked_worn:      'Marked outfit as worn on {date}',
    generated_outfit: 'Generated outfit ensemble',
  };

  return activityLog.map(entry => ({
    id: entry.event_id,
    type: entry.type,
    description:
      entry.type === 'planned_outfit' || entry.type === 'removed_plan' || entry.type === 'marked_worn'
        ? EVENT_LABELS[entry.type].replace('{date}', entry.plan_date ?? '').trim()
        : EVENT_LABELS[entry.type] ?? entry.type,
    timestamp: fmt(entry.event_timestamp),
    sessionId: entry.session_id ? 'Session' : undefined,
  }));
}

// ─────────────────────────────────────────────────────────────
// Main Analytics component
// ─────────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const today = new Date();
        const start = new Date(today); start.setDate(today.getDate() - 30);
        const startStr = start.toISOString().split('T')[0];
        const endStr   = today.toISOString().split('T')[0];

        const [dash, log] = await Promise.all([
          getAnalyticsDashboard(startStr, endStr),
          getActivityLog({ limit: 20 }).catch(() => [] as ActivityLogEntry[]),
        ]);

        setDashboard(dash);
        setActivityLog(log);
      } catch (e: any) {
        console.error('Analytics data load failed:', e);
        setError(e?.message ?? 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Adapter-derived props — computed once after load, never on every render
  const kpiData      = dashboard ? toKPIData(dashboard)        : null;
  const colorDNA     = dashboard ? toColorDNA(dashboard)        : [];
  const categories   = dashboard ? toCategoryItems(dashboard)   : [];
  const dormantItems = dashboard ? toDormantItems(dashboard)    : [];
  const activityFeed = toActivityFeedEvents(activityLog);

  const barItems = categories;
  const BAR_COLORS = [
    'bg-luxury-charcoal', 'bg-luxury-taupe', 'bg-luxury-sand',
    'bg-luxury-stone', 'bg-luxury-gold', 'bg-luxury-olive',
  ];

  // Efficiency ring: wardrobe_usage_rate_pct from real data (PHASE 1 metric replacing proxy)
  const efficiencyScore = dashboard?.summary.wardrobeUsageRatePct ?? 0;
  const efficiencyLabel = efficiencyScore > 0 ? `${Math.round(efficiencyScore)}%` : 'No Data';
  const dashOffset = 282.7 - (282.7 * efficiencyScore / 100);

  if (error) {
    return (
      <div className="space-y-10 pb-12">
        <header>
          <h2 className="text-4xl font-serif font-medium text-luxury-charcoal">Wardrobe Intelligence</h2>
        </header>
        <div className="luxury-card p-8 text-center text-luxury-taupe">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2">Run the analytics SQL migration in Supabase to enable this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <header>
        <h2 className="text-4xl font-serif font-medium text-luxury-charcoal">Wardrobe Intelligence</h2>
        <p className="text-luxury-taupe mt-2">Data-driven insights for your personal collection.</p>
      </header>

      {/* ── STITCH: KPI Row — now backed by real analytics data ─── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="luxury-card h-36 animate-pulse bg-luxury-stone/20" />
          ))}
        </div>
      ) : kpiData ? (
        <StyleInsightsKPI data={kpiData} />
      ) : null}

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── STITCH: StyleDNA ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          {loading ? (
            <div className="luxury-card h-96 animate-pulse bg-luxury-stone/20" />
          ) : (
            <StyleDNA
              colors={colorDNA.length > 0 ? colorDNA : undefined}
              categories={categories.length > 0 ? categories : undefined}
              dormantItems={dormantItems.length > 0 ? dormantItems : undefined}
            />
          )}

          {/* Collection Distribution chart — live category data */}
          <div className="luxury-card p-8">
            <div className="flex items-center justify-between mb-10">
              <h4 className="font-serif text-xl">Collection Distribution</h4>
              <span className="text-[10px] uppercase font-bold text-luxury-taupe tracking-widest">By Item Count</span>
            </div>
            {barItems.length > 0 ? (
              <div className="h-48 flex space-x-4">
                {barItems.map((cat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 group-hover:opacity-80 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ height: `${cat.percent}%` }}
                      />
                    </div>
                    <span className="mt-4 text-[10px] uppercase font-bold tracking-tighter text-luxury-taupe text-center">{cat.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center border-2 border-dashed border-luxury-stone/20 rounded-2xl">
                 <p className="text-sm text-luxury-taupe">No collection data found.</p>
              </div>
            )}
          </div>

          {/* ── NEW: Event Mix + Recent Activity Counts ──────────── */}
          {!loading && dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Mix */}
              <div className="luxury-card p-6">
                <h4 className="font-serif text-lg mb-5">Activity Mix</h4>
                <div className="space-y-3">
                  {dashboard.eventMix.length > 0 ? dashboard.eventMix.map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-luxury-charcoal capitalize">{row.type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-1 bg-luxury-stone/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-luxury-charcoal rounded-full"
                            style={{ width: `${Math.min(100, (row.eventCount / (dashboard.eventMix[0]?.eventCount || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-luxury-taupe w-6 text-right">{row.eventCount}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-luxury-taupe italic">No events in selected period. Run the SQL migration first.</p>
                  )}
                </div>
              </div>

              {/* Recent Activity Counts (7d vs 30d) */}
              <div className="luxury-card p-6">
                <h4 className="font-serif text-lg mb-5">Last 7 vs 30 Days</h4>
                <div className="space-y-3">
                  {dashboard.recentActivityCounts.length > 0 ? dashboard.recentActivityCounts.map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-luxury-charcoal capitalize">{row.type.replace(/_/g, ' ')}</span>
                      <div className="flex space-x-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-taupe">7d: {row.last7Days}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-charcoal">30d: {row.last30Days}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-luxury-taupe italic">No activity data yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── NEW: Top Items + Unused Items ─────────────────────── */}
          {!loading && dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Worn */}
              <div className="luxury-card p-6">
                <h4 className="font-serif text-lg mb-5">Most Worn</h4>
                {dashboard.topItems.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topItems.slice(0, 5).map((item, i) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-luxury-stone/20 last:border-0">
                        <div className="flex items-center space-x-4 min-w-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-luxury-stone/20" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-luxury-stone/20 border border-luxury-stone/20 flex items-center justify-center text-[8px] text-luxury-taupe uppercase tracking-widest text-center" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-luxury-charcoal truncate">{item.name}</p>
                            <p className="text-[10px] uppercase tracking-widest text-luxury-taupe">
                              {item.brand ? `${item.brand} • ` : ''}{item.subcategory ? `${item.category} / ${item.subcategory}` : item.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <span className="text-xs font-bold text-luxury-olive">{item.wornCount}× <span className="text-[10px] text-luxury-taupe font-normal">this period</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-luxury-taupe italic">Mark outfits as worn to see usage data.</p>
                )}
              </div>

              {/* Never Worn */}
              <div className="luxury-card p-6 flex flex-col">
                <h4 className="font-serif text-lg mb-5">Never Worn Ever</h4>
                {dashboard.neverWornEverItems.length > 0 ? (
                  <div className="space-y-3 flex-1">
                    {dashboard.neverWornEverItems.slice(0, 5).map((item, i) => {
                      const daysOld = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      const isNew = daysOld < 14;
                      return (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-luxury-stone/20 last:border-0">
                          <div className="flex items-center space-x-4 min-w-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg bg-luxury-stone/20" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-luxury-stone/20 border border-luxury-stone/20" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-luxury-charcoal truncate">{item.name}</p>
                              <p className="text-[10px] uppercase tracking-widest text-luxury-taupe">
                                {item.subcategory ? `${item.category} / ${item.subcategory}` : item.category}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                             <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${isNew ? 'bg-luxury-gold/20 text-luxury-gold' : 'bg-luxury-stone/20 text-luxury-taupe'}`}>
                               {isNew ? 'Added recently' : `added ${daysOld}d ago`}
                             </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-luxury-olive italic font-medium mt-auto">Every item has been worn at least once. 🎉</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────── */}
        <div className="space-y-8">
          {/* ── STITCH: Activity Feed — real activity_log data ──── */}
          {loading ? (
            <div className="luxury-card h-80 animate-pulse bg-luxury-stone/20" />
          ) : (
            <ActivityFeed
              events={activityFeed.length > 0 ? activityFeed : undefined}
              maxItems={6}
            />
          )}

          {/* Usage Summary — driven by real summary values */}
          <div className="luxury-card p-8 bg-luxury-charcoal text-white">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-serif text-xl">Usage Summary</h4>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Usage Rate</p>
                <h5 className="text-lg font-serif">{dashboard?.summary.wardrobeUsageRatePct ?? 0}% of wardrobe worn</h5>
                <p className="text-sm text-white/70 leading-relaxed">
                  {dashboard?.summary.unusedItems ?? 0} items haven't appeared in any worn outfit this period.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Wear Streak</p>
                <h5 className="text-lg font-serif">{dashboard?.summary.wearStreakDays ?? 0} consecutive days</h5>
                <p className="text-sm text-white/70 leading-relaxed">
                  Planning conversion: {dashboard?.summary.planningConversionRatePct ?? 0}% of saved outfits were planned.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Efficiency + Frequency section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="luxury-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-serif text-xl">Wear Frequency</h4>
            <ArrowUpRight size={20} className="text-luxury-stone" />
          </div>
          <div className="space-y-6">
            {/* Frequency still uses wardrobe_items.wear_count as fallback — no relational path yet */}
            {/* TODO(insights-v2): replace with worn_count from get_item_usage_analytics */}
            {dashboard?.topItems.length === 0 && (
              <p className="text-sm text-luxury-taupe italic">
                Mark outfits as worn to populate frequency data.
              </p>
            )}
            {(dashboard?.topItems ?? []).slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-4 border-b border-luxury-stone/30 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-luxury-taupe">{item.wornCountGlobal} appearances (all-time)</p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">{item.wornCountGlobal}× all-time</span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency ring — now uses real wardrobeUsageRatePct */}
        <div className="luxury-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-serif text-xl">Wardrobe Efficiency</h4>
            <Layers size={20} className="text-luxury-stone" />
          </div>
          <div className="flex items-center justify-center py-10">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E4E3E0" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1A1A1A" strokeWidth="8"
                  strokeDasharray="282.7" strokeDashoffset={dashOffset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-serif font-bold">{Math.round(efficiencyScore)}</span>
                <span className="micro-label">% worn</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
