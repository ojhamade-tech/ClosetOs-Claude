import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Plus, Heart, Image as ImageIcon, Layers } from 'lucide-react';
import { getWardrobeItems, createOutfit } from '../lib/api';
import { WardrobeItem } from '../types';
import { CATEGORIES, TAXONOMY, mapLegacyCategory } from '../lib/taxonomy';

const OCCASIONS = ['Casual', 'Work', 'Formal', 'Sport', 'Evening', 'Weekend'];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];

const COMPOSITION_HINTS = [
  'Start with a top, bottom, or full piece.',
  'Add footwear to complete the look.',
  'Outerwear and accessories are optional.',
];

// ─── Outfit Draft Panel ───────────────────────────────────────────────────────

interface DraftPanelProps {
  selected: WardrobeItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  name: string;
  setName: (v: string) => void;
  occasion: string;
  setOccasion: (v: string) => void;
  season: string;
  setSeason: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

const DraftPanel: React.FC<DraftPanelProps> = ({
  selected, onRemove, onClearAll,
  name, setName,
  occasion, setOccasion,
  season, setSeason,
  onSave, isSaving,
}) => {
  const canSave = selected.length >= 2 && name.trim().length > 0;

  let saveHint = '';
  if (selected.length < 2) {
    const needed = 2 - selected.length;
    saveHint = `Add ${needed} more item${needed === 1 ? '' : 's'} to save`;
  } else if (!name.trim()) {
    saveHint = 'Give your outfit a name to save';
  }

  const coveredCats = Array.from(
    new Set(selected.map(i => mapLegacyCategory(i.category)))
  ).filter(c => c !== 'Other');

  const onlyAccessories =
    selected.length > 0 &&
    selected.every(i => {
      const c = mapLegacyCategory(i.category);
      return c === 'Accessories' || c === 'Other';
    });

  const compositionHints: string[] = [];
  if (selected.length > 0) {
    if (onlyAccessories) {
      compositionHints.push('No clothing pieces — consider adding a top, bottom, or outerwear.');
    } else {
      const hasTop = selected.some(i => mapLegacyCategory(i.category) === 'Tops');
      const hasBottom = selected.some(i => mapLegacyCategory(i.category) === 'Bottoms');
      if (!hasTop && !hasBottom) {
        compositionHints.push('No top or bottom yet.');
      } else if (hasTop && !hasBottom) {
        compositionHints.push('No bottom to pair with your top.');
      } else if (!hasTop && hasBottom) {
        compositionHints.push('No top to pair with your bottom.');
      }
      if (
        selected.length >= 2 &&
        !selected.some(i => mapLegacyCategory(i.category) === 'Footwear')
      ) {
        compositionHints.push('No footwear selected.');
      }
    }

    const unavailable = selected.filter(i => (i.availability ?? 'available') !== 'available');
    if (unavailable.length === 1) {
      compositionHints.push(`"${unavailable[0].name}" is not currently available.`);
    } else if (unavailable.length > 1) {
      compositionHints.push(`${unavailable.length} items are not currently available.`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-6 pt-6 pb-4 border-b border-luxury-stone/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg text-luxury-charcoal">Outfit Draft</h3>
            <p className="text-xs text-luxury-taupe mt-0.5">
              {selected.length} piece{selected.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          {selected.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-luxury-taupe hover:text-red-500 transition-colors font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Selected items or empty state */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {selected.length === 0 ? (
          <div className="pt-2">
            <p className="text-sm font-medium text-luxury-charcoal mb-4 leading-snug">
              Tap items from your wardrobe to build your outfit.
            </p>
            <div className="space-y-3">
              {COMPOSITION_HINTS.map((hint, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-luxury-stone/30 flex items-center justify-center text-[10px] font-bold text-luxury-taupe flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-luxury-taupe leading-snug">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {selected.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: -10, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center space-x-3 bg-luxury-ivory/60 rounded-xl p-2 mb-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-luxury-stone/20 flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          className="w-full h-full object-cover"
                          alt={item.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-luxury-taupe uppercase tracking-widest">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-luxury-charcoal truncate">{item.name}</p>
                      <p className="text-[10px] text-luxury-taupe">{item.subcategory || item.category}</p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 rounded-full text-luxury-taupe hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {(coveredCats.length > 0 || compositionHints.length > 0) && (
              <div className="mt-3 pt-3 border-t border-luxury-stone/20 space-y-2">
                {coveredCats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {coveredCats.map(cat => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 bg-luxury-stone/30 text-luxury-charcoal text-[10px] font-semibold uppercase tracking-wider rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                {compositionHints.map((hint, i) => (
                  <p key={i} className="text-[11px] text-luxury-taupe leading-snug">· {hint}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Save form */}
      <div className="px-6 pb-6 pt-4 border-t border-luxury-stone/20 space-y-3 flex-shrink-0">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-luxury-taupe">
            Outfit Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Sunday Morning"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full mt-1 bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-luxury-taupe">
              Occasion
            </label>
            <select
              value={occasion}
              onChange={e => setOccasion(e.target.value)}
              className="w-full mt-1 bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
            >
              <option value="">Any</option>
              {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-luxury-taupe">
              Season
            </label>
            <select
              value={season}
              onChange={e => setSeason(e.target.value)}
              className="w-full mt-1 bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
            >
              <option value="">Any</option>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={onSave}
            disabled={isSaving || !canSave}
            className="w-full bg-luxury-charcoal text-white py-3 rounded-xl text-sm font-bold hover:bg-luxury-charcoal/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Outfit'}
          </button>
          {!canSave && saveHint && (
            <p className="text-center text-xs text-luxury-taupe mt-2">{saveHint}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const ManualOutfitBuilder: React.FC = () => {
  const navigate = useNavigate();

  // Data
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Retrieval filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [filterColor, setFilterColor] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [filterHasImage, setFilterHasImage] = useState(false);
  const [filterWearStatus, setFilterWearStatus] = useState<'' | 'worn' | 'unworn'>('');
  const [filterAvailability, setFilterAvailability] = useState<'' | 'available' | 'unavailable' | 'needs_washing'>('');

  // Composition
  const [selected, setSelected] = useState<WardrobeItem[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);

  // Save form
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [season, setSeason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getWardrobeItems()
      .then(setWardrobe)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Reset subcategory when category changes
  useEffect(() => {
    setActiveSubcategory('All');
  }, [activeCategory]);

  // Derived
  const uniqueColors = Array.from(
    new Set(wardrobe.map(i => i.color).filter(Boolean) as string[])
  ).sort();

  const subcategories: string[] = activeCategory !== 'All' ? (TAXONOMY[activeCategory] ?? []) : [];

  const activeFilterCount =
    (filterColor ? 1 : 0) +
    (filterFavorite ? 1 : 0) +
    (filterHasImage ? 1 : 0) +
    (filterWearStatus ? 1 : 0) +
    (filterAvailability ? 1 : 0);

  const filteredItems = wardrobe.filter(item => {
    const normCategory = mapLegacyCategory(item.category);
    if (activeCategory !== 'All' && normCategory !== activeCategory) return false;
    if (activeSubcategory !== 'All' && item.subcategory !== activeSubcategory) return false;
    if (filterColor && item.color?.toLowerCase() !== filterColor.toLowerCase()) return false;
    if (filterFavorite && !item.favorite) return false;
    if (filterHasImage && !item.image_url) return false;
    if (filterWearStatus === 'worn' && (item.wear_count ?? 0) === 0) return false;
    if (filterWearStatus === 'unworn' && (item.wear_count ?? 0) > 0) return false;
    if (filterAvailability && (item.availability ?? 'available') !== filterAvailability) return false;
    const q = search.toLowerCase();
    if (q && !item.name.toLowerCase().includes(q) && !(item.brand?.toLowerCase().includes(q))) return false;
    return true;
  });

  const isSelected = (id: string) => selected.some(s => s.id === id);

  const toggleItem = (item: WardrobeItem) => {
    setSelected(prev =>
      prev.find(s => s.id === item.id)
        ? prev.filter(s => s.id !== item.id)
        : [...prev, item]
    );
  };

  const clearAllFilters = () => {
    setSearch('');
    setActiveCategory('All');
    setFilterColor('');
    setFilterFavorite(false);
    setFilterHasImage(false);
    setFilterWearStatus('');
    setFilterAvailability('');
  };

  const handleSave = async () => {
    if (selected.length < 2 || !name.trim()) return;
    setIsSaving(true);
    try {
      await createOutfit(
        {
          name: name.trim(),
          occasion: occasion || null,
          season: season || null,
          generated_by_ai: false,
        },
        selected.map(i => i.id),
        'manual_builder'
      );
      navigate('/ai-outfits');
    } catch (e) {
      console.error(e);
      alert('Failed to save outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  const draftPanelProps: DraftPanelProps = {
    selected,
    onRemove: id => setSelected(prev => prev.filter(s => s.id !== id)),
    onClearAll: () => setSelected([]),
    name, setName,
    occasion, setOccasion,
    season, setSeason,
    onSave: handleSave,
    isSaving,
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">

      {/* ── LEFT: Wardrobe picker ── */}
      <div className="flex-1 luxury-card flex flex-col overflow-hidden min-h-0">

        {/* Page header + search */}
        <div className="px-6 pt-6 pb-3 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-luxury-charcoal">Build Outfit</h2>
              <p className="text-xs text-luxury-taupe mt-0.5">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-taupe pointer-events-none"
              size={15}
            />
            <input
              type="text"
              placeholder="Search by name or brand..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-taupe hover:text-luxury-charcoal transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="px-6 pb-3 flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Color filter */}
          {uniqueColors.length > 0 && (
            <select
              value={filterColor}
              onChange={e => setFilterColor(e.target.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none ${
                filterColor
                  ? 'bg-luxury-charcoal text-white border-luxury-charcoal'
                  : 'bg-luxury-stone/20 text-luxury-taupe border-luxury-stone/20 hover:bg-luxury-stone/40'
              }`}
            >
              <option value="">Color</option>
              {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Favorites toggle */}
          <button
            onClick={() => setFilterFavorite(v => !v)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterFavorite
                ? 'bg-luxury-charcoal text-white border-luxury-charcoal'
                : 'bg-luxury-stone/20 text-luxury-taupe border-luxury-stone/20 hover:bg-luxury-stone/40'
            }`}
          >
            <Heart size={11} fill={filterFavorite ? 'currentColor' : 'none'} />
            <span>Favorites</span>
          </button>

          {/* Has photo toggle */}
          <button
            onClick={() => setFilterHasImage(v => !v)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterHasImage
                ? 'bg-luxury-charcoal text-white border-luxury-charcoal'
                : 'bg-luxury-stone/20 text-luxury-taupe border-luxury-stone/20 hover:bg-luxury-stone/40'
            }`}
          >
            <ImageIcon size={11} />
            <span>With photo</span>
          </button>

          {/* Wear status filter */}
          <select
            value={filterWearStatus}
            onChange={e => setFilterWearStatus(e.target.value as '' | 'worn' | 'unworn')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none ${
              filterWearStatus
                ? 'bg-luxury-charcoal text-white border-luxury-charcoal'
                : 'bg-luxury-stone/20 text-luxury-taupe border-luxury-stone/20 hover:bg-luxury-stone/40'
            }`}
          >
            <option value="">Wear status</option>
            <option value="worn">Worn</option>
            <option value="unworn">Never worn</option>
          </select>

          {/* Availability filter */}
          <select
            value={filterAvailability}
            onChange={e => setFilterAvailability(e.target.value as '' | 'available' | 'unavailable' | 'needs_washing')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus:outline-none ${
              filterAvailability
                ? 'bg-luxury-charcoal text-white border-luxury-charcoal'
                : 'bg-luxury-stone/20 text-luxury-taupe border-luxury-stone/20 hover:bg-luxury-stone/40'
            }`}
          >
            <option value="">Availability</option>
            <option value="available">Available</option>
            <option value="needs_washing">Needs washing</option>
            <option value="unavailable">Unavailable</option>
          </select>

          {/* Clear active filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex overflow-x-auto px-6 pb-2 gap-2 flex-shrink-0">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeCategory === cat
                  ? 'bg-luxury-charcoal text-white'
                  : 'bg-luxury-stone/20 text-luxury-taupe hover:bg-luxury-stone/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Subcategory pills — only visible when a specific category is active */}
        {subcategories.length > 0 && (
          <div className="flex overflow-x-auto px-6 pb-3 gap-2 flex-shrink-0">
            {['All', ...subcategories].map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeSubcategory === sub
                    ? 'bg-luxury-taupe text-white'
                    : 'bg-luxury-ivory border border-luxury-stone/30 text-luxury-taupe hover:border-luxury-taupe'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <div className="border-b border-luxury-stone/20 flex-shrink-0" />

        {/* Item grid — pb-24 on mobile so FAB never clips the last row */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
          {loading ? (
            <p className="text-center py-16 text-luxury-taupe text-sm">Loading wardrobe...</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-luxury-taupe text-sm">No items match.</p>
              {(search || activeFilterCount > 0 || activeCategory !== 'All') && (
                <button
                  onClick={clearAllFilters}
                  className="mt-3 text-xs text-luxury-charcoal underline underline-offset-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const sel = isSelected(item.id);
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    whileTap={{ scale: 0.96 }}
                    className={`relative rounded-2xl overflow-hidden text-left transition-all duration-150 ${
                      sel
                        ? 'ring-2 ring-luxury-charcoal shadow-md'
                        : 'ring-1 ring-luxury-stone/30 hover:ring-luxury-taupe hover:shadow-sm'
                    }`}
                  >
                    {/* Image area */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-luxury-stone/20">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          className={`w-full h-full object-cover transition-all duration-300 ${sel ? 'brightness-95' : ''}`}
                          alt={item.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-luxury-taupe uppercase tracking-widest">
                          No Image
                        </div>
                      )}

                      {/* Availability badge — top-left, only when not available */}
                      {(item.availability ?? 'available') !== 'available' && (
                        <div className="absolute top-2 left-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm border ${
                            item.availability === 'needs_washing'
                              ? 'bg-amber-50/90 border-amber-200 text-amber-700'
                              : 'bg-red-50/90 border-red-200 text-red-600'
                          }`}>
                            {item.availability === 'needs_washing' ? 'Washing' : 'Unavail.'}
                          </span>
                        </div>
                      )}

                      {/* Add/remove affordance — always visible, bottom-right */}
                      <div
                        className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all duration-150 ${
                          sel
                            ? 'bg-luxury-charcoal'
                            : 'bg-white/85 backdrop-blur-sm border border-luxury-stone/40'
                        }`}
                      >
                        {sel
                          ? <Check size={13} className="text-white" strokeWidth={3} />
                          : <Plus size={13} className="text-luxury-charcoal" strokeWidth={2.5} />
                        }
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className={`px-2.5 py-2 transition-colors ${sel ? 'bg-luxury-stone/10' : 'bg-white'}`}>
                      <p className="text-xs font-medium text-luxury-charcoal truncate">{item.name}</p>
                      <p className="text-[10px] text-luxury-taupe mt-0.5">
                        {item.subcategory || item.category}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Desktop draft panel ── */}
      <div className="hidden md:flex w-80 flex-col luxury-card overflow-hidden">
        <DraftPanel {...draftPanelProps} />
      </div>

      {/* ── MOBILE: Floating button + slide-up sheet ── */}
      <div className="md:hidden">
        <motion.button
          onClick={() => setTrayOpen(true)}
          animate={{ y: 0 }}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 bg-luxury-charcoal text-white px-5 py-3.5 rounded-full shadow-xl"
        >
          <Layers size={18} />
          <span className="text-sm font-semibold">
            {selected.length > 0 ? `Draft · ${selected.length}` : 'Outfit Draft'}
          </span>
          {selected.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-luxury-gold flex-shrink-0" />
          )}
        </motion.button>

        <AnimatePresence>
          {trayOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-luxury-charcoal/50 z-40 backdrop-blur-sm"
                onClick={() => setTrayOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Drag handle + close */}
                <div className="flex-shrink-0 pt-3 pb-1">
                  <div className="w-10 h-1 bg-luxury-stone/40 rounded-full mx-auto" />
                  <div className="flex justify-end px-5 pt-2">
                    <button
                      onClick={() => setTrayOpen(false)}
                      className="p-1 text-luxury-taupe hover:text-luxury-charcoal transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <DraftPanel
                    {...draftPanelProps}
                    onSave={() => { setTrayOpen(false); handleSave(); }}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
