import React, { useState } from 'react';
import { X, Plus, Sliders } from 'lucide-react';

interface ToggleRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface OutfitRulesPanelProps {
  onApply?: (rules: ToggleRule[], preferredColors: string[], avoidedCategories: string[]) => void;
}

export const OutfitRulesPanel: React.FC<OutfitRulesPanelProps> = ({ onApply }) => {
  const [rules, setRules] = useState<ToggleRule[]>([
    { id: 'no_repeats',       label: 'Avoid outfit repeats within 7 days', description: 'Prevents the same outfit being planned in consecutive weeks', enabled: true  },
    { id: 'preferred_colors', label: 'Prefer colors from my palette',      description: 'AI will prioritize items in your preferred color palette',   enabled: true  },
    { id: 'avoid_categories', label: 'Avoid avoided categories',           description: 'Exclude avoided wardrobe categories from AI suggestions',    enabled: false },
    { id: 'match_occasion',   label: 'Match occasion context',             description: 'Align outfit suggestions to planned events and occasions',    enabled: false },
  ]);

  const [preferredColors, setPreferredColors] = useState<string[]>(['Navy', 'Ivory', 'Camel']);
  const [avoidedCategories, setAvoidedCategories] = useState<string[]>(['Athleisure', 'Bold Prints']);
  const [newColor, setNewColor] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addColor = () => {
    const val = newColor.trim();
    if (val && !preferredColors.includes(val)) {
      setPreferredColors(prev => [...prev, val]);
    }
    setNewColor('');
  };

  const addCategory = () => {
    const val = newCategory.trim();
    if (val && !avoidedCategories.includes(val)) {
      setAvoidedCategories(prev => [...prev, val]);
    }
    setNewCategory('');
  };

  return (
    <div className="luxury-card p-8 space-y-8">
      <div className="flex items-center space-x-2">
        <Sliders size={18} className="text-luxury-taupe" />
        <h4 className="font-serif text-xl text-luxury-charcoal">Outfit Rules & Constraints</h4>
      </div>

      {/* Toggle rules */}
      <div className="space-y-5">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-start justify-between space-x-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-luxury-charcoal">{rule.label}</p>
              <p className="text-xs text-luxury-taupe mt-0.5">{rule.description}</p>
            </div>
            <button
              onClick={() => toggleRule(rule.id)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                rule.enabled ? 'bg-luxury-charcoal' : 'bg-luxury-stone'
              }`}
              role="switch"
              aria-checked={rule.enabled}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                  rule.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Preferred Colors */}
      <div className="space-y-3 pt-6 border-t border-luxury-stone/30">
        <p className="micro-label">Preferred Color Constraints</p>
        <div className="flex flex-wrap gap-2">
          {preferredColors.map(color => (
            <span key={color} className="flex items-center space-x-2 px-3 py-1.5 bg-luxury-ivory border border-luxury-stone/50 rounded-full text-xs font-medium text-luxury-charcoal">
              <span>{color}</span>
              <button onClick={() => setPreferredColors(prev => prev.filter(c => c !== color))} className="text-luxury-taupe hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="+ Add Color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColor()}
              className="px-3 py-1.5 border border-dashed border-luxury-stone rounded-full text-xs text-luxury-charcoal bg-transparent focus:outline-none focus:border-luxury-charcoal w-28"
            />
          </div>
        </div>
      </div>

      {/* Avoided Categories */}
      <div className="space-y-3">
        <p className="micro-label">Avoid Categories</p>
        <div className="flex flex-wrap gap-2">
          {avoidedCategories.map(cat => (
            <span key={cat} className="flex items-center space-x-2 px-3 py-1.5 bg-luxury-charcoal/5 border border-luxury-stone/40 rounded-full text-xs font-medium text-luxury-charcoal">
              <span>{cat}</span>
              <button onClick={() => setAvoidedCategories(prev => prev.filter(c => c !== cat))} className="text-luxury-taupe hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="+ Add Category"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            className="px-3 py-1.5 border border-dashed border-luxury-stone rounded-full text-xs text-luxury-charcoal bg-transparent focus:outline-none focus:border-luxury-charcoal w-32"
          />
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={() => onApply?.(rules, preferredColors, avoidedCategories)}
        className="w-full py-3 rounded-2xl bg-luxury-charcoal text-white text-sm font-bold hover:bg-luxury-charcoal/90 transition-colors"
      >
        Apply Rules to AI Planning
      </button>
    </div>
  );
};
