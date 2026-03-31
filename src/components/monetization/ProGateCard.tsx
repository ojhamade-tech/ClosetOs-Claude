import React from 'react';
import { Lock, Check, Sparkles } from 'lucide-react';

interface ProGateCardProps {
  featureName: string;
  description: string;
  features: string[];
  onUpgrade?: () => void;
}

export const ProGateCard: React.FC<ProGateCardProps> = ({
  featureName,
  description,
  features,
  onUpgrade,
}) => (
  <div className="relative bg-white rounded-2xl border-2 border-luxury-gold/30 p-8 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
    {/* Gold shimmer accent */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

    {/* PRO Badge */}
    <div className="flex items-center space-x-3 mb-6">
      <span className="px-3 py-1 bg-luxury-gold text-white text-[10px] uppercase tracking-widest font-bold rounded-full">
        PRO
      </span>
      <div className="p-1.5 rounded-full bg-luxury-stone/30">
        <Lock size={14} className="text-luxury-taupe" />
      </div>
    </div>

    <h4 className="font-serif text-xl text-luxury-charcoal mb-2">{featureName}</h4>
    <p className="text-sm text-luxury-taupe mb-6 leading-relaxed">{description}</p>

    <ul className="space-y-3 mb-8">
      {features.map((f, i) => (
        <li key={i} className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-luxury-gold/10 flex items-center justify-center shrink-0">
            <Check size={10} className="text-luxury-gold" />
          </div>
          <span className="text-sm text-luxury-charcoal">{f}</span>
        </li>
      ))}
    </ul>

    <button
      onClick={onUpgrade}
      className="w-full py-3 rounded-2xl bg-luxury-charcoal text-white text-sm font-bold hover:bg-luxury-charcoal/90 transition-colors"
    >
      Upgrade to Pro
    </button>
    <p className="text-center text-[10px] text-luxury-taupe mt-3 uppercase tracking-wider">
      Starting at $8/month · Cancel anytime
    </p>
  </div>
);

// Pre-built gated feature cards for easy use
export const WardrobeIntelligenceGate: React.FC<{ onUpgrade?: () => void }> = ({ onUpgrade }) => (
  <ProGateCard
    featureName="Unlock Wardrobe Intelligence"
    description="Get deep analytics on your collection — cost-per-wear, style efficiency, and wardrobe gap analysis."
    features={[
      'Cost-per-wear tracking across all items',
      'AI-driven wardrobe gap detection',
      'Monthly style efficiency reports',
    ]}
    onUpgrade={onUpgrade}
  />
);

export const AIOutfitGate: React.FC<{ onUpgrade?: () => void }> = ({ onUpgrade }) => (
  <ProGateCard
    featureName="Unlock AI Outfit Generation"
    description="Let ClosetOS compose full outfit ensembles from your existing wardrobe based on occasion."
    features={[
      'Unlimited AI outfit generation',
      'Occasion-aware styling suggestions',
      'One-tap weekly planning automation',
    ]}
    onUpgrade={onUpgrade}
  />
);

// Upgrade Banner (for inline use)
export const UpgradeBanner: React.FC<{ message?: string; onUpgrade?: () => void }> = ({
  message = 'Unlock advanced analytics by upgrading to Pro.',
  onUpgrade,
}) => (
  <div className="flex items-center justify-between p-5 bg-luxury-gold/5 border border-luxury-gold/30 rounded-2xl">
    <div className="flex items-center space-x-3">
      <Sparkles size={18} className="text-luxury-gold shrink-0" />
      <p className="text-sm text-luxury-charcoal font-medium">{message}</p>
    </div>
    <button
      onClick={onUpgrade}
      className="ml-4 shrink-0 px-5 py-2 rounded-full bg-luxury-charcoal text-white text-xs font-bold hover:bg-luxury-charcoal/90 transition-colors whitespace-nowrap"
    >
      Upgrade
    </button>
  </div>
);
