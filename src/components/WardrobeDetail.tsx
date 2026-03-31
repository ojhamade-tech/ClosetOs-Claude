import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem, uploadWardrobeImage } from '../lib/api';
import { WardrobeItem } from '../types';
import { ArrowLeft, Edit2, Trash2, Heart, Check, Camera, RefreshCw } from 'lucide-react';
import { TAXONOMY, CATEGORIES, mapLegacyCategory } from '../lib/taxonomy';

export const WardrobeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edited state
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editSubcategory, setEditSubcategory] = useState(TAXONOMY[CATEGORIES[0]][0]);
  const [editPrice, setEditPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadItem(id);
    }
  }, [id]);

  const loadItem = async (itemId: string) => {
    try {
      setLoading(true);
      const data = await getWardrobeItem(itemId);
      setItem(data);
      if (data) {
        setEditName(data.name || '');
        setEditBrand(data.brand || '');
        const normCat = mapLegacyCategory(data.category);
        setEditCategory(normCat);
        setEditSubcategory(data.subcategory || TAXONOMY[normCat]?.[0] || '');
        setEditPrice(data.purchase_price ? data.purchase_price.toString() : '');
      }
    } catch (error) {
      console.error(error);
      navigate('/wardrobe');
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

  const saveChanges = async () => {
    if (!item) return;
    try {
      setIsSaving(true);
      let imageUrl = item.image_url;
      if (file && user) {
        imageUrl = await uploadWardrobeImage(file, user.id);
      }
      
      const priceVal = editPrice ? parseFloat(editPrice) : 0;
      
      const updatedItem = await updateWardrobeItem(item.id, {
        name: editName,
        brand: editBrand,
        category: editCategory,
        subcategory: editSubcategory,
        purchase_price: priceVal,
        image_url: imageUrl
      });
      
      setItem(updatedItem);
      setIsEditing(false);
      setFile(null);
      setPreview(null);
    } catch (error) {
      console.error(error);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !window.confirm('Delete this item permanently?')) return;
    try {
      await deleteWardrobeItem(item.id);
      navigate('/wardrobe');
    } catch (error) {
      console.error(error);
    }
  };

  const toggleFavorite = async () => {
    if (!item) return;
    const prev = item;
    setItem({ ...item, favorite: !item.favorite });
    try {
      const updated = await updateWardrobeItem(item.id, { favorite: !prev.favorite });
      setItem(updated);
    } catch (error) {
      console.error(error);
      setItem(prev);
    }
  };

  const incrementWearCount = async () => {
    if (!item) return;
    const prev = item;
    setItem({ ...item, wear_count: item.wear_count + 1 });
    try {
      const updated = await updateWardrobeItem(item.id, { wear_count: prev.wear_count + 1 });
      setItem(updated);
    } catch (error) {
      console.error(error);
      setItem(prev);
    }
  };

  const setAvailabilityStatus = async (newAvailability: 'available' | 'unavailable' | 'needs_washing') => {
    if (!item) return;
    const prev = item;
    setItem({ ...item, availability: newAvailability }); // optimistic — feels instant
    try {
      const updated = await updateWardrobeItem(item.id, { availability: newAvailability });
      setItem(updated);
    } catch (error) {
      console.error(error);
      setItem(prev); // revert if DB update fails
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-luxury-taupe">Loading item...</div>;
  }

  if (!item) {
    return <div className="py-20 text-center text-luxury-taupe">Item not found.</div>;
  }



  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/wardrobe')}
          className="flex items-center space-x-2 text-luxury-taupe hover:text-luxury-charcoal transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Core Collection</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={incrementWearCount}
            className="flex items-center space-x-2 px-4 py-2 rounded-full border border-luxury-stone/50 hover:bg-white text-luxury-charcoal transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} />
            <span>Mark as Worn</span>
          </button>
          <button 
            onClick={toggleFavorite}
            className={`p-2.5 rounded-full border transition-colors ${
              item.favorite ? 'bg-luxury-gold border-luxury-gold text-white' : 'border-luxury-stone/50 hover:bg-white text-luxury-charcoal'
            }`}
          >
            <Heart size={18} fill={item.favorite ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-2.5 rounded-full border border-luxury-stone/50 hover:bg-white text-luxury-charcoal transition-colors"
          >
            {isEditing ? <Check size={18} onClick={(e) => { e.stopPropagation(); saveChanges(); }} /> : <Edit2 size={18} />}
          </button>
          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-full border border-luxury-stone/50 hover:bg-red-50 text-red-600 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-luxury-stone/10 border border-luxury-stone/20 group">
          {item.image_url ? (
            <img 
              src={preview || item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover" 
            />
          ) : preview ? (
            <img src={preview} alt="New Upload" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-luxury-taupe tracking-widest uppercase">
              No Image Digitized
            </div>
          )}

          {isEditing && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <div className="flex flex-col items-center">
                <Camera size={32} />
                <span className="mt-2 text-sm font-medium">Replace Image</span>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          )}
        </div>

        <div className="space-y-10">
          {isEditing ? (
            <div className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-luxury-stone/30">
              <h3 className="text-xl font-serif mb-6">Edit Attributes</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider block mb-2">Item Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider block mb-2">Brand</label>
                  <input type="text" value={editBrand} onChange={e => setEditBrand(e.target.value)} className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider block mb-2">Category</label>
                  <select 
                    value={editCategory} 
                    onChange={e => {
                      const newCat = e.target.value;
                      setEditCategory(newCat);
                      setEditSubcategory(TAXONOMY[newCat]?.[0] || '');
                    }} 
                    className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider block mb-2">Type</label>
                  <select 
                    value={editSubcategory} 
                    onChange={e => setEditSubcategory(e.target.value)} 
                    className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe"
                  >
                    {TAXONOMY[editCategory]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider block mb-2">Purchase Price ($)</label>
                  <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full bg-luxury-ivory border border-luxury-stone/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-luxury-taupe" />
                </div>
                <button 
                  onClick={saveChanges} 
                  disabled={isSaving}
                  className="w-full bg-luxury-charcoal text-white rounded-xl py-3 font-medium mt-4 hover:bg-black transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold tracking-widest text-luxury-taupe uppercase mb-2">
                  {item.brand || 'No Brand'} • {item.subcategory ? `${item.category} / ${item.subcategory}` : item.category}
                </p>
                <h1 className="text-5xl font-serif text-luxury-charcoal tracking-tight">{item.name}</h1>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-luxury-stone/30">
                <div>
                  <p className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider mb-1">Purchase Price</p>
                  <p className="text-2xl font-medium text-luxury-charcoal">${item.purchase_price?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-luxury-taupe uppercase tracking-wider mb-1">Wear Count</p>
                  <p className="text-2xl font-medium text-luxury-charcoal">{item.wear_count}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-luxury-stone/30 space-y-4">
                <h4 className="text-sm font-semibold text-luxury-charcoal uppercase tracking-wider">Item Attributes</h4>
                <div className="flex flex-wrap gap-2">
                  {[item.category, item.subcategory, item.brand, item.color].filter(Boolean).map(tag => (
                    <span key={tag} className="px-4 py-2 bg-white border border-luxury-stone/50 rounded-full text-xs font-medium text-luxury-charcoal">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-luxury-stone/30 space-y-3">
                <h4 className="text-sm font-semibold text-luxury-charcoal uppercase tracking-wider">Availability</h4>
                <div className="flex flex-wrap gap-2">
                  {(['available', 'needs_washing', 'unavailable'] as const).map(status => {
                    const current = item.availability ?? 'available';
                    const isActive = current === status;
                    const label = status === 'available' ? 'Available' : status === 'needs_washing' ? 'Needs Washing' : 'Unavailable';
                    const activeClass = status === 'available'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : status === 'needs_washing'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-red-50 border-red-300 text-red-600';
                    return (
                      <button
                        key={status}
                        onClick={() => setAvailabilityStatus(status)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                          isActive ? activeClass : 'bg-white border-luxury-stone/30 text-luxury-taupe hover:border-luxury-taupe'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
