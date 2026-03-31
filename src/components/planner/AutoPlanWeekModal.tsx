import React from 'react';
import { X, AlertTriangle, Sparkles } from 'lucide-react';

interface DayPreview {
  day: string;
  date: string;
  outfitName?: string;
  outfitImage?: string;
  hasConflict?: boolean;
}

interface AutoPlanWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onCustomizeRules: () => void;
  weekDays?: DayPreview[];
  conflictCount?: number;
  isGenerating?: boolean;
}

const DAYS: DayPreview[] = [
  { day: 'Mon', date: '31' },
  { day: 'Tue', date: '01', outfitName: 'Monochrome Edit' },
  { day: 'Wed', date: '02' },
  { day: 'Thu', date: '03', outfitName: 'Executive Lunch', hasConflict: true },
  { day: 'Fri', date: '04', outfitName: 'Minimal Knit' },
  { day: 'Sat', date: '05' },
  { day: 'Sun', date: '06' },
];

export const AutoPlanWeekModal: React.FC<AutoPlanWeekModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onCustomizeRules,
  weekDays = DAYS,
  conflictCount = 2,
  isGenerating = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-luxury-charcoal/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl p-10 max-w-2xl w-full shadow-2xl z-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-luxury-ivory transition-colors text-luxury-taupe"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-luxury-gold/10 rounded-xl">
            <Sparkles size={20} className="text-luxury-gold" />
          </div>
          <h3 className="text-3xl font-serif font-medium text-luxury-charcoal">Auto-Plan Your Week</h3>
        </div>
        <p className="text-luxury-taupe text-sm mb-8 ml-14">
          Let ClosetOS build your outfit schedule based on your style DNA and calendar.
        </p>

        {/* Conflict warning */}
        {conflictCount > 0 && (
          <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              <span className="font-bold">{conflictCount} outfit repeats detected</span> — AI will resolve automatically based on your rules.
            </p>
          </div>
        )}

        {/* Week preview */}
        <div className="grid grid-cols-7 gap-2 mb-10">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">{day.day}</span>
              <div className={`w-full aspect-[3/4] rounded-2xl overflow-hidden border flex flex-col items-center justify-center relative ${
                day.outfitName
                  ? 'border-luxury-stone/50 bg-luxury-stone/10'
                  : 'border-dashed border-luxury-stone/40 bg-luxury-ivory'
              }`}>
                {day.hasConflict && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                )}
                {day.outfitName ? (
                  <p className="text-[9px] text-luxury-charcoal font-medium text-center px-1 leading-tight">
                    {day.outfitName}
                  </p>
                ) : (
                  <span className="text-luxury-stone text-lg">+</span>
                )}
              </div>
              <span className="text-xs text-luxury-charcoal font-medium">{day.date}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-luxury-charcoal text-white text-sm font-bold hover:bg-luxury-charcoal/90 transition-colors disabled:opacity-60 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                <span>Generating Plan...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Plan</span>
              </>
            )}
          </button>
          <button
            onClick={onCustomizeRules}
            className="w-full py-3 rounded-2xl border border-luxury-charcoal/20 text-luxury-charcoal text-sm font-semibold hover:bg-luxury-ivory transition-colors"
          >
            Customize Rules First
          </button>
        </div>
      </div>
    </div>
  );
};
