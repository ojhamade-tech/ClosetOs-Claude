import React, { useState, useEffect, useRef } from 'react';
import { Filter, Plus, Heart, MoreHorizontal, Trash2, Camera, X, Shirt, Search, SlidersHorizontal } from 'lucide-react';
import { WardrobeItem } from '../types';
import { getWardrobeItems, updateWardrobeItem, deleteWardrobeItem, createWardrobeItem, uploadWardrobeImage } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
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
  availability: 'all' | 'available' | 'unavailable' | 'needs_washing';
}

const defaultFilters: FilterOptions = {
  subcategory: 'all',
  color: 'all',
  isFavorite: 'all',
  wearStatus: 'all',
  imageStatus: 'all',
  availability: 'all',
};

export const Wardrobe: React.FC = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All Collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formSubcategory, setFormSubcategory] = useState(TAXONOMY[CATEGORIES[0]][0]);
  const [formPrice, setFormPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formName || !formCategory) return;
    try {
      setIsUploading(true);
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadWardrobeImage(file, user.id);
      }
      
      const priceVal = formPrice ? parseFloat(formPrice) : 0;
      
      const newItem = await createWardrobeItem({
        user_id: user.id,
        name: formName,
        brand: formBrand,
        category: formCategory,
        subcategory: formSubcategory,
        purchase_price: priceVal,
        image_url: imageUrl,
        wear_count: 0,
        favorite: false,
      });
      
      setItems([newItem, ...items]);
      
      // Reset
      setIsAddingItem(false);
      setFormName('');
      setFormBrand('');
      setFormPrice('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error('Failed to create item', err);
      alert('Failed to upload item. Make sure images bucket exists and RLS allows upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, item: WardrobeItem) => {
    e.preventDefault(); 
    e.stopPropagation();
    try {
      const updated = await updateWardrobeItem(item.id, { favorite: !item.favorite });
      setItems(items.map(i => i.id === item.id ? updated : i));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteWardrobeItem(id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

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
    filters.availability !== 'all' ||
    searchQuery !== '';

  const filteredItems = items.filter(item => {
    // 1. Category matches
    const normCategory = mapLegacyCategory(item.category);
    if (activeCategory !== 'All Collections' && normCategory !== activeCategory) return false;
    
    // 2. Search matches
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.brand && item.brand.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // 3. Subcategory matches
    if (filters.subcategory !== 'all' && item.subcategory !== filters.subcategory) return false;

    // 4. Color matches
    if (filters.color !== 'all' && item.color?.toLowerCase() !== filters.color) return false;

    // 5. Favorite matches
    if (filters.isFavorite === 'favorite' && !item.favorite) return false;
    if (filters.isFavorite === 'unfavorite' && item.favorite) return false;

    // 6. Wear status matches
    if (filters.wearStatus === 'worn' && (item.wear_count || 0) === 0) return false;
    if (filters.wearStatus === 'unworn' && (item.wear_count || 0) > 0) return false;

    // 7. Image status matches
    if (filters.imageStatus === 'has_image' && !item.image_url) return false;
    if (filters.imageStatus === 'no_image' && item.image_url) return false;

    // 8. Availability matches
    if (filters.availability !== 'all') {
      const itemAvailability = item.availability ?? 'available';
      if (itemAvailability !== filters.availability) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 pb-12 relative">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-serif tracking-tight font-bold text-luxury-charcoal">Curated Essentials</h2>
          <p className="text-luxury-taupe mt-2">Manage your collection with architectural precision.</p>
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
          <Link 
            to="/builder"
            className="hidden sm:flex items-center space-x-2 px-6 py-3 rounded-full border border-luxury-charcoal text-luxury-charcoal hover:bg-luxury-stone/10 transition-colors text-sm font-medium"
          >
            <span>Build Outfit</span>
          </Link>
          <button 
            onClick={() => setIsAddingItem(true)}
            className="flex items-center space-x-2 px-6 py-3 rounded-full bg-luxury-charcoal text-white hover:bg-luxury-charcoal/90 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            <span>Add New Piece</span>
          </button>
        </div>
      </header>

      {/* Add Item Overlay */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-luxury-charcoal/40 backdrop-blur-sm" onClick={() => !isUploading && setIsAddingItem(false)} />
          <div className="bg-white w-full max-w-lg rounded-3xl p-10 relative z-10 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-serif">Digitize New Item</h3>
              <button disabled={isUploading} onClick={() => setIsAddingItem(false)} className="text-luxury-taupe hover:text-luxury-charcoal">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video rounded-2xl border-2 border-dashed border-luxury-stone flex flex-col items-center justify-center text-luxury-taupe hover:border-luxury-taupe transition-colors cursor-pointer group overflow-hidden relative bg-luxury-stone/5"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={40} className="group-hover:scale-110 transition-transform text-luxury-stone" />
                    <p className="mt-4 text-sm font-medium">Upload or Drag Image</p>
                    <p className="text-xs opacity-60">High-resolution preferred</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider">Item Name</label>
                  <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Silk Crepe Blouse" className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider">Brand</label>
                  <input type="text" value={formBrand} onChange={e => setFormBrand(e.target.value)} placeholder="e.g. The Row" className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider">Purchase Price ($)</label>
                  <input type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider">Category</label>
                  <select 
                    value={formCategory} 
                    onChange={e => {
                      const newCat = e.target.value;
                      setFormCategory(newCat);
                      setFormSubcategory(TAXONOMY[newCat]?.[0] || '');
                    }} 
                    className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider">Type</label>
                  <select 
                    value={formSubcategory} 
                    onChange={e => setFormSubcategory(e.target.value)} 
                    className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
                  >
                    {TAXONOMY[formCategory]?.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>

              <button disabled={isUploading} type="submit" className="w-full bg-luxury-charcoal text-white py-4 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50">
                {isUploading ? 'Uploading & Saving...' : 'Save to Collection'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Navigation */}
      <div className="flex items-center space-x-8 border-b border-luxury-stone/30 pb-4 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              // Reset subcategory filter when switching top-level category
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
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
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
             {/* Mobile specific search */}
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

             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Image</label>
               <select
                 value={filters.imageStatus}
                 onChange={e => setFilters({...filters, imageStatus: e.target.value as any})}
                 className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
               >
                 <option value="all">All Items</option>
                 <option value="has_image">Has Image</option>
                 <option value="no_image">Without Image</option>
               </select>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold tracking-widest text-luxury-taupe">Availability</label>
               <select
                 value={filters.availability}
                 onChange={e => setFilters({...filters, availability: e.target.value as any})}
                 className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-charcoal"
               >
                 <option value="all">All Items</option>
                 <option value="available">Available</option>
                 <option value="needs_washing">Needs Washing</option>
                 <option value="unavailable">Unavailable</option>
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
          {items.length > 0 && (
            <button 
              onClick={() => { setFilters(defaultFilters); setSearchQuery(''); setActiveCategory('All Collections'); }} 
              className="mt-6 px-6 py-2 rounded-full border border-luxury-stone shadow-sm text-luxury-charcoal hover:bg-white text-sm font-medium transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item) => {
            return (
              <Link to={`/wardrobe/${item.id}`} key={item.id} className="group block">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-luxury-stone/20 mb-4 border border-luxury-stone/10">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-luxury-taupe text-xs tracking-widest uppercase">No Image</div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={(e) => toggleFavorite(e, item)}
                      className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm transition-colors ${
                      item.favorite ? 'bg-luxury-gold text-white' : 'bg-white/70 text-luxury-charcoal hover:bg-white'
                    }`}>
                      <Heart size={16} fill={item.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-2 rounded-full bg-white/70 backdrop-blur-md border border-white/20 shadow-sm text-red-600 hover:bg-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {(item.availability ?? 'available') !== 'available' && (
                    <div className="absolute top-4 left-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                        item.availability === 'needs_washing'
                          ? 'bg-amber-50/90 border-amber-200 text-amber-700'
                          : 'bg-red-50/90 border-red-200 text-red-600'
                      }`}>
                        {item.availability === 'needs_washing' ? 'Washing' : 'Unavailable'}
                      </span>
                    </div>
                  )}
                  {item.brand && (
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-white/70 backdrop-blur-md border border-white/20 rounded-full text-[10px] uppercase font-bold tracking-wider text-luxury-charcoal">
                        {item.brand}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 px-1">
                  <h4 className="text-sm font-medium text-luxury-charcoal truncate">{item.name}</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-luxury-taupe font-medium">${item.purchase_price?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-luxury-taupe uppercase tracking-wider font-semibold">Wears: {item.wear_count || 0}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
