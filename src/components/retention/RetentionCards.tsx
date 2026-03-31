import React from 'react';
import { Flame, AlertCircle, BarChart2, ArrowRight } from 'lucide-react';

interface RetentionCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  subtitle: string;
  ctaLabel: string;
  onCTA?: () => void;
}

const RetentionCard: React.FC<RetentionCardProps> = ({
  icon: Icon, iconColor, iconBg,
  title, value, subtitle, ctaLabel, onCTA,
}) => (
  <div className="luxury-card p-6 flex flex-col justify-between space-y-6">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-2xl ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <span className="micro-label">{title}</span>
    </div>

    <div>
      <p className="text-3xl font-serif font-bold text-luxury-charcoal">{value}</p>
      <p className="text-sm text-luxury-taupe mt-1 leading-snug">{subtitle}</p>
    </div>

    <button
      onClick={onCTA}
      className="flex items-center justify-between w-full text-sm font-semibold text-luxury-charcoal hover:text-luxury-gold transition-colors group"
    >
      <span>{ctaLabel}</span>
      <ArrowRight size={16} className="transform group-hover:translate-x-0.5 transition-transform" />
    </button>
  </div>
);

interface RetentionCardsProps {
  wearStreak?: number;
  unusedItemCount?: number;
  hasWeeklyReport?: boolean;
  onPlanToday?: () => void;
  onViewUnused?: () => void;
  onViewReport?: () => void;
}

export const RetentionCards: React.FC<RetentionCardsProps> = ({
  wearStreak = 0,
  unusedItemCount = 0,
  hasWeeklyReport = false,
  onPlanToday,
  onViewUnused,
  onViewReport,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <RetentionCard
      icon={Flame}
      iconColor="text-orange-500"
      iconBg="bg-orange-50"
      title="Wear Streak"
      value={`${wearStreak} days`}
      subtitle="Keep it going — plan today's outfit to maintain your streak."
      ctaLabel="Plan Today"
      onCTA={onPlanToday}
    />
    <RetentionCard
      icon={AlertCircle}
      iconColor="text-luxury-taupe"
      iconBg="bg-luxury-stone/20"
      title="Unused Items"
      value={`${unusedItemCount} items`}
      subtitle="Unworn this month. Rotate your dormant collection back in."
      ctaLabel="View Items"
      onCTA={onViewUnused}
    />
    <RetentionCard
      icon={BarChart2}
      iconColor="text-luxury-gold"
      iconBg="bg-luxury-gold/10"
      title="Weekly Summary"
      value={hasWeeklyReport ? 'Ready' : 'Not Yet'}
      subtitle={hasWeeklyReport ? 'Your weekly style report is ready — see what worked.' : 'Log more outfits this week to unlock your summary.'}
      ctaLabel={hasWeeklyReport ? 'View Report' : 'Plan Outfits'}
      onCTA={onViewReport}
    />
  </div>
);
