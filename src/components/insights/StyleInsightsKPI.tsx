import React from 'react';
import { TrendingUp, Sparkles, Calendar, Flame } from 'lucide-react';

export interface KPIData {
  totalItems: number;
  outfitsCreated: number;
  daysPlanned: number;
  wearStreak: number;
}

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, unit, badge, badgeColor = 'bg-luxury-gold/10 text-luxury-gold', icon: Icon }) => (
  <div className="luxury-card p-6 flex flex-col justify-between h-36">
    <div className="flex items-center justify-between">
      <span className="micro-label">{label}</span>
      <Icon size={14} className="text-luxury-taupe" />
    </div>
    <div className="flex items-end justify-between">
      <p className="text-3xl font-serif font-bold text-luxury-charcoal">
        {value}
        {unit && <span className="text-sm font-sans font-normal text-luxury-taupe ml-1">{unit}</span>}
      </p>
      {badge && (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  </div>
);

interface StyleInsightsKPIProps {
  data?: KPIData;
}

export const StyleInsightsKPI: React.FC<StyleInsightsKPIProps> = ({ data }) => {
  const kpis = [
    {
      label: 'Total Items',
      value: data?.totalItems ?? '—',
      badge: data ? '+3 this month' : undefined,
      badgeColor: 'bg-luxury-olive/10 text-luxury-olive',
      icon: Sparkles,
    },
    {
      label: 'Outfits Created',
      value: data?.outfitsCreated ?? '—',
      badge: 'Saved',
      badgeColor: 'bg-luxury-gold/10 text-luxury-gold',
      icon: Sparkles,
    },
    {
      label: 'Days Planned',
      value: data?.daysPlanned ?? '—',
      badge: 'Active',
      badgeColor: 'bg-luxury-olive/10 text-luxury-olive',
      icon: Calendar,
    },
    {
      label: 'Wear Streak',
      value: data?.wearStreak ?? '—',
      unit: 'days',
      badge: 'Running',
      badgeColor: 'bg-luxury-charcoal/10 text-luxury-charcoal',
      icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => (
        <KPICard key={i} {...kpi} />
      ))}
    </div>
  );
};
