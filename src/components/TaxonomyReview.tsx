import React, { useState, useEffect } from 'react';
import { TAXONOMY, CATEGORIES } from '../lib/taxonomy';
import { getOtherWardrobeItems, updateOtherWardrobeItemCategory } from '../lib/api';
import { Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TaxonomyItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  image_url: string | null;
}

function suggestCategoryFromSubcategory(sub: string | null): string | null {
  if (!sub) return null;
  const s = sub.trim().toLowerCase();
  for (const [cat, subs] of Object.entries(TAXONOMY)) {
    if (subs.map(x => x.toLowerCase()).includes(s)) {
      return cat;
    }
  }
  return null;
}

export function TaxonomyReview() {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOtherItems();
  }, []);

  async function fetchOtherItems() {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getOtherWardrobeItems();
      
      // Typecasting because getOtherWardrobeItems returns Partial<WardrobeItem>[]
      setItems(data as TaxonomyItem[]);
      
      // Initialize selectedCategories with suggestions or defaults
      const initialSelections: Record<string, string> = {};
      data.forEach(item => {
        if (!item.id) return;
        const suggested = suggestCategoryFromSubcategory(item.subcategory || null);
        if (suggested) {
          initialSelections[item.id] = suggested;
        } else {
          initialSelections[item.id] = CATEGORIES[0];
        }
      });
      setSelectedCategories(initialSelections);
      
    } catch (err: any) {
      console.error('Error fetching items for review:', err);
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }

  async function updateCategory(id: string, newCategory: string) {
    if (!CATEGORIES.includes(newCategory) && newCategory !== 'Other') return;
    
    try {
      setUpdatingId(id);
      
      await updateOtherWardrobeItemCategory(id, newCategory);
      
      // Remove item from the list
      setItems(prev => prev.filter(i => i.id !== id));
      
      // Clean up selection
      const newSelections = { ...selectedCategories };
      delete newSelections[id];
      setSelectedCategories(newSelections);
      
    } catch (err: any) {
      console.error('Error updating category:', err);
      alert('Failed to update category: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-luxury-gray">Loading records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-12 border border-luxury-border shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-luxury-charcoal mb-2">All Caught Up!</h2>
          <p className="text-luxury-gray max-w-md mx-auto">
            There are no wardrobe items left in the "Other" category. Your taxonomy cleanup is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-luxury-charcoal mb-2">Taxonomy Review</h1>
        <p className="text-luxury-gray">
          These items were automatically placed in "Other" during the database taxonomy normalization. 
          Review the details below and select the correct parent category.
        </p>
      </header>
      
      <div className="bg-white rounded-2xl border border-luxury-border p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between font-medium text-sm text-luxury-charcoal px-4 pb-2 border-b border-luxury-border">
          <div className="flex-1 min-w-0">Item Preview</div>
          <div className="w-1/4 px-4 text-center">Metadata</div>
          <div className="w-1/3 text-right">Action</div>
        </div>

        <div className="space-y-4">
          {items.map(item => {
            const suggestedCategory = suggestCategoryFromSubcategory(item.subcategory);
            const isUpdating = updatingId === item.id;
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-4 rounded-xl border border-luxury-border/50 bg-luxury-ivory/30 hover:bg-luxury-ivory/80 transition-colors ${
                  isUpdating ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Visuals & Identity */}
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="h-16 w-16 bg-white rounded-lg border border-luxury-border/50 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-luxury-border" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-luxury-charcoal truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="text-xs text-luxury-gray mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {item.brand && <span><span className="opacity-70">Brand:</span> {item.brand}</span>}
                      {item.subcategory && <span><span className="opacity-70">Sub:</span> {item.subcategory}</span>}
                      {item.color && <span><span className="opacity-70">Color:</span> {item.color}</span>}
                    </div>
                  </div>
                </div>

                {/* Extended Metadata (Notes, current category) */}
                <div className="w-1/4 px-4 border-l border-r border-luxury-border/30 text-xs text-luxury-gray">
                  {item.notes ? (
                    <div className="line-clamp-2 italic" title={item.notes}>"{item.notes}"</div>
                  ) : (
                    <div className="opacity-50">No notes provided</div>
                  )}
                  <div className="mt-2 text-[10px] uppercase font-bold tracking-wider opacity-60">
                    Current Cat: {item.category}
                  </div>
                </div>

                {/* Actions */}
                <div className="w-1/3 flex items-center justify-end gap-3 pl-4">
                  
                  {/* Smart suggestion button if we detect obvious mapping */}
                  {suggestedCategory && (
                    <button
                      onClick={() => updateCategory(item.id, suggestedCategory)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      title="Quick match derived from subcategory exact string"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Map to {suggestedCategory}
                    </button>
                  )}

                  {/* Manual Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm bg-white border border-luxury-border rounded-md px-3 py-1.5 text-luxury-charcoal focus:outline-none focus:ring-1 focus:ring-luxury-gold/50"
                      value={selectedCategories[item.id] || CATEGORIES[0]}
                      onChange={(e) => setSelectedCategories(prev => ({...prev, [item.id]: e.target.value}))}
                    >
                      {CATEGORIES.filter(c => c !== 'Other').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => updateCategory(item.id, selectedCategories[item.id] || CATEGORIES[0])}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-luxury-charcoal rounded-md hover:bg-luxury-gray transition-colors whitespace-nowrap"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
