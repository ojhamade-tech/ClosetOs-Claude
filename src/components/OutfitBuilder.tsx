import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, Shirt, Sparkles, X, Plus, LogOut, Scissors, 
  Trash2, Layers, CheckCircle2, ChevronUp, ChevronDown 
} from 'lucide-react';
import { WardrobeItem } from '../types';
import { getWardrobeItems, createOutfit } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { TAXONOMY, CATEGORIES, mapLegacyCategory } from '../lib/taxonomy';

const categories = [
  'All Collections',
  ...CATEGORIES
];

interface FilterOptions {
  subcategory: string;
  color: string;
  isFavorite: 'all' | 'favorite' | 'unfavorite';
  wearStatus: 'all' | 'worn' | 'unworn';
  imageStatus: 'all' | 'has_image' | 'no_image';
}

const defaultFilters: FilterOptions = {
  subcategory: 'all',
  color: 'all',
  isFavorite: 'all',
  wearStatus: 'all',
  imageStatus: 'all',
};

export const OutfitBuilder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Wardrobe & Filter State
  const [activeCategory, setActiveCategory] = useState('All Collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder State
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [season, setSeason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTrayOpen, setMobileTrayOpen] = useState(false);

  useEffect(() => {
    loadItems();
  }, [user]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getWardrobeItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (item: WardrobeItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSaveOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitName.trim()) {
      alert("Please name your outfit.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }
    
    // Soft guidance
    if (selectedItems.length === 1) {
      const confirmSingle = window.confirm("Most outfits have at least 2 pieces. Are you sure you want to save a 1-item outfit?");
      if (!confirmSingle) return;
    }

    try {
      setIsSaving(true);
      await createOutfit(
        { 
          name: outfitName.trim(), 
          occasion: occasion || null, 
          season: season || null, 
          generated_by_ai: false 
        }, 
        selectedItems.map(i => i.id)
      );
      navigate('/ai-outfits'); // Navigate back to the outifits library
    } catch (err) {
      console.error(err);
      alert("Failed to save outfit.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Computation
  const uniqueSubcategories = Array.from(new Set(
    items
      .filter(i => activeCategory === 'All Collections' || mapLegacyCategory(i.category) === activeCategory)
      .map(i => i.subcategory)
      .filter(Boolean)
  )) as string[];

  const uniqueColors = Array.from(new Set(
    items.map(i => i.color?.toLowerCase()).filter(c => c && c !== 'unknown')
  )) as string[];

  const hasActiveFilters = 
    filters.subcategory !== 'all' || 
    filters.color !== 'all' || 
    filters.isFavorite !== 'all' || 
    filters.wearStatus !== 'all' || 
    filters.imageStatus !== 'all' ||
    searchQuery !== '';

  const filteredItems = items.filter(item => {
    const normCategory = mapLegacyCategory(item.category);
    if (activeCategory !== 'All Collections' && normCategory !== activeCategory) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.brand && item.brand.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (filters.subcategory !== 'all' && item.subcategory !== filters.subcategory) return false;
    if (filters.color !== 'all' && item.color?.toLowerCase() !== filters.color) return false;
    if (filters.isFavorite === 'favorite' && !item.favorite) return false;
    if (filters.isFavorite === 'unfavorite' && item.favorite) return false;
    if (filters.wearStatus === 'worn' && (item.wear_count || 0) === 0) return false;
    if (filters.wearStatus === 'unworn' && (item.wear_count || 0) > 0) return false;
    if (filters.imageStatus === 'has_image' && !item.image_url) return false;
    if (filters.imageStatus === 'no_image' && item.image_url) return false;

    return true;
  });

  // JSX block instead of a nested component to avoid losing input focus on every keystroke
  const renderOutfitForm = () => (
    <form onSubmit={handleSaveOutfit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Outfit Name *</label>
        <input 
          type="text" 
          value={outfitName}
          onChange={e => setOutfitName(e.target.value)}
          placeholder="e.g. Minimalist Spring Walk"
          className="w-full bg-white border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Occasion</label>
          <select 
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
            className="w-full bg-white border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
          >
            <option value="">Any</option>
            <option value="Casual">Casual</option>
            <option value="Work">Work</option>
            <option value="Evening">Evening</option>
            <option value="Formal">Formal</option>
            <option value="Travel">Travel</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Season</label>
          <select 
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="w-full bg-white border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
          >
            <option value="">Any</option>
            <option value="Spring">Spring</option>
            <option value="Summer">Summer</option>
            <option value="Fall">Fall</option>
            <option value="Winter">Winter</option>
          </select>
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isSaving || selectedItems.length === 0 || !outfitName.trim()}
        className="w-full mt-2 bg-luxury-charcoal text-white py-4 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Outfit'}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-32 lg:pb-12 h-full relative">
      {/* 
        ======================================================== 
        LEFT PANE: WARDROBE BROWSER 
        ======================================================== 
      */}
      <div className="flex-1 space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <div className="flex items-center space-x-2 text-luxury-taupe mb-2">
              <Link to="/wardrobe" className="hover:text-luxury-charcoal transition-colors">Wardrobe</Link>
              <span>/</span>
              <span className="text-luxury-charcoal font-medium">Builder</span>
            </div>
            <h2 className="text-4xl font-serif tracking-tight font-bold text-luxury-charcoal">Manual Builder</h2>
            <p className="text-luxury-taupe mt-2">Drape and curate new ensembles intentionally.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-taupe" size={18} />
              <input 
                type="text" 
                placeholder="Search collection..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-luxury-stone/50 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal transition-colors w-48 focus:w-64"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-full transition-colors flex items-center space-x-2 border shadow-sm ${showFilters || hasActiveFilters ? 'border-luxury-charcoal bg-luxury-charcoal text-white' : 'border-luxury-stone/50 bg-white text-luxury-charcoal hover:bg-luxury-stone/10'}`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline text-sm font-medium">Filters</span>
            </button>
          </div>
        </header>

        {/* Category Navigation */}
        <div className="flex items-center space-x-8 border-b border-luxury-stone/30 pb-4 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setFilters(prev => ({...prev, subcategory: 'all'}));
              }}
              className={`text-sm font-medium transition-all relative pb-4 whitespace-nowrap ${
                activeCategory === cat ? 'text-luxury-charcoal' : 'text-luxury-taupe hover:text-luxury-charcoal'
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <div className="absolute shadow-sm bottom-0 left-0 right-0 h-0.5 bg-luxury-charcoal rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Advanced Filters Panel */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white rounded-2xl p-6 border border-luxury-stone/30 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg text-luxury-charcoal">Filtering Collection</h4>
              <button 
                onClick={() => { setFilters(defaultFilters); setSearchQuery(''); setActiveCategory('All Collections'); }} 
                className="text-[10px] font-bold text-luxury-taupe hover:text-luxury-charcoal uppercase tracking-wider"
              >
                Reset All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
               <div className="md:hidden space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Search Items</label>
                 <input 
                   type="text" 
                   placeholder="Search by name or brand..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Subcategory</label>
                 <select 
                   value={filters.subcategory} 
                   onChange={e => setFilters({...filters, subcategory: e.target.value})} 
                   className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
                 >
                   <option value="all">Any Type</option>
                   {uniqueSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Color</label>
                 <select 
                   value={filters.color} 
                   onChange={e => setFilters({...filters, color: e.target.value})} 
                   className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal capitalize"
                 >
                   <option value="all">Any Color</option>
                   {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Favorites</label>
                 <select 
                   value={filters.isFavorite} 
                   onChange={e => setFilters({...filters, isFavorite: e.target.value as any})} 
                   className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
                 >
                   <option value="all">All Items</option>
                   <option value="favorite">Favorites Only</option>
                   <option value="unfavorite">Not Favorited</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Wear Status</label>
                 <select 
                   value={filters.wearStatus} 
                   onChange={e => setFilters({...filters, wearStatus: e.target.value as any})} 
                   className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
                 >
                   <option value="all">Any Status</option>
                   <option value="worn">Worn</option>
                   <option value="unworn">Never Worn</option>
                 </select>
               </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-luxury-taupe">Loading collection...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-luxury-stone/20 flex items-center justify-center mb-4">
              {items.length > 0 ? <Search className="text-luxury-taupe" size={24} /> : <Shirt className="text-luxury-taupe" size={24} />}
            </div>
            <h3 className="text-lg font-medium text-luxury-charcoal">
              {items.length > 0 ? "No matching pieces found" : "Your wardrobe is empty"}
            </h3>
            <p className="text-luxury-taupe mt-1 text-sm">
              {items.length > 0 ? "Adjust your filters or search terms." : "Add some pieces to build your digital wardrobe."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => handleToggleItem(item)}
                  className={`group relative cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden ${isSelected ? 'ring-2 ring-luxury-charcoal ring-offset-2' : 'hover:scale-105'} bg-luxury-stone/20 aspect-[3/4] border border-luxury-stone/10`}
                >
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isSelected ? 'opacity-80' : 'opacity-100'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-luxury-taupe text-xs tracking-widest uppercase text-center p-2">
                       {item.name}
                    </div>
                  )}
                  
                  {/* Selection Checkmark Overlay */}
                  <div className={`absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md shadow-sm transition-all duration-300 ${isSelected ? 'bg-luxury-charcoal text-white scale-100' : 'bg-white/50 text-transparent scale-0 group-hover:scale-100 group-hover:text-luxury-taupe'}`}>
                     <CheckCircle2 size={18} fill={isSelected ? 'currentColor' : 'none'} className={isSelected ? "text-luxury-gold" : ""} />
                  </div>

                  {!isSelected && item.brand && (
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-white/70 backdrop-blur-md border border-white/20 rounded-full text-[10px] uppercase font-bold tracking-wider text-luxury-charcoal">
                        {item.brand}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 
        ======================================================== 
        RIGHT PANE: DESKTOP TRAY
        ======================================================== 
      */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-20 bg-luxury-stone/5 rounded-3xl p-6 border border-luxury-stone/30 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-luxury-stone/30">
            <h3 className="font-serif text-xl text-luxury-charcoal">Staging Tray</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-luxury-taupe bg-white px-3 py-1 rounded-full shadow-sm">{selectedItems.length} Items</span>
          </div>

          {selectedItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center opacity-60">
              <Layers size={32} className="text-luxury-taupe mb-3" />
              <p className="text-sm font-medium text-luxury-charcoal">Tray is empty</p>
              <p className="text-xs text-luxury-taupe mt-1">Tap items in your wardrobe to begin styling.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-6 border-b border-luxury-stone/30">
              {selectedItems.map(item => (
                <div key={item.id} className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-luxury-stone/20 group">
                  <div className="w-12 h-12 rounded-lg bg-luxury-stone/10 overflow-hidden shrink-0">
                    {item.image_url ? (
                       <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-luxury-stone/20">
                         <Shirt size={16} className="text-luxury-taupe" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-luxury-charcoal truncate">{item.name}</p>
                    <p className="text-[10px] text-luxury-taupe uppercase tracking-wider">{item.category}</p>
                  </div>
                  <button 
                    onClick={(e) => handleRemoveItem(item.id, e)}
                    className="p-1.5 text-luxury-taupe hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {renderOutfitForm()}
        </div>
      </div>

      {/* 
        ======================================================== 
        MOBILE STICKY TRAY
        ======================================================== 
      */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
         {/* The Bar */}
         <div 
           className="bg-luxury-charcoal text-white px-6 py-4 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between cursor-pointer"
           onClick={() => setMobileTrayOpen(!mobileTrayOpen)}
         >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedItems.length}
              </div>
              <span className="font-medium text-sm">Items Selected</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-medium">
              <span>{mobileTrayOpen ? 'Close' : 'Review & Save'}</span>
              {mobileTrayOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>
         </div>

         {/* The Expanded Drawer */}
         <div className={`bg-white border-t border-luxury-stone/20 overflow-hidden transition-all duration-300 ease-in-out ${mobileTrayOpen ? 'max-h-[70vh] overflow-y-auto' : 'max-h-0'}`}>
            <div className="p-6 space-y-6 flex flex-col items-center">
              {selectedItems.length === 0 ? (
                <div className="py-6 text-center text-luxury-taupe text-sm">Tap items in the background to add them here.</div>
              ) : (
                <div className="w-full flex overflow-x-auto gap-3 pb-2 snap-x">
                  {selectedItems.map(item => (
                    <div key={item.id} className="w-24 shrink-0 snap-start relative group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-luxury-stone/10 border border-luxury-stone/20">
                         {item.image_url ? (
                           <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center"><Shirt size={20} className="text-luxury-taupe" /></div>
                         )}
                      </div>
                      <button 
                        onClick={(e) => handleRemoveItem(item.id, e)}
                        className="absolute -top-2 -right-2 bg-white text-luxury-charcoal rounded-full p-1 shadow-md border border-luxury-stone/20"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="w-full">
                 {renderOutfitForm()}
              </div>
              <div className="h-4"></div> {/* Safe padding */}
            </div>
         </div>
      </div>

    </div>
  );
};
