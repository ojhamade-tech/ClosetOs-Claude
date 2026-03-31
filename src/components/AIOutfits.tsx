import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wind, Cloud, Sun, MapPin, ChevronRight, Save, Calendar, Plus, Bookmark } from 'lucide-react';
import { getWardrobeItems, createOutfit, getOutfits, logActivity } from '../lib/api';
import { WardrobeItem, Outfit } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const AIOutfits: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'engine' | 'saved'>('engine');
  
  // Data
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  
  // Engine State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<Outfit | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getWardrobeItems().then(setWardrobe).catch(console.error);
    fetchSavedOutfits();
  }, []);

  const fetchSavedOutfits = async () => {
    setIsLoadingSaved(true);
    try {
      const data = await getOutfits();
      setSavedOutfits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleGenerate = () => {
    if (wardrobe.length < 2) {
      alert("You need at least 2 items in your wardrobe to generate an ensemble.");
      return;
    }
    
    setIsGenerating(true);
    setResult(null);
    
    // Fake AI using real items
    setTimeout(() => {
      // Pick 2-4 random items
      const shuffled = [...wardrobe].sort(() => 0.5 - Math.random());
      const selectedCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 items
      const selectedItems = shuffled.slice(0, selectedCount);
      
      const mockResult: Outfit = {
        id: 'temp-' + Date.now(),
        user_id: '', // Temporary
        name: `${selectedItems[0].category} Combination`,
        occasion: null,
        season: null,
        weather: null,
        mood: null,
        formality: null,
        explanation: `A random selection of ${selectedItems.length} items from your wardrobe. Review the combination and save it if it inspires you.`,
        generated_by_ai: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: selectedItems
      };
      
      setIsGenerating(false);
      setResult(mockResult);

      // Log generated_outfit event (non-blocking — temporary result only, not yet saved)
      // source: 'random_engine' | 'rules_engine' | 'gemini_flash' | 'gemini_pro'
      if (user?.id) {
        logActivity(user.id, 'generated_outfit', {
          source: 'random_engine',
          metadata: { itemCount: selectedItems.length }
        });
      }
    }, 2000);
  };

  const handleSaveOutfit = async () => {
    if (!result || !result.items) return;
    setIsSaving(true);
    try {
      const itemIds = result.items.map(i => i.id);
      await createOutfit({
        name: result.name,
        occasion: result.occasion,
        season: result.season,
        weather: result.weather,
        mood: result.mood,
        formality: result.formality,
        explanation: result.explanation,
        generated_by_ai: result.generated_by_ai
      }, itemIds, 'ai_builder');
      
      // Refresh saved outfits
      await fetchSavedOutfits();
      // Switch tab to show it
      setActiveTab('saved');
    } catch (error) {
      console.error(error);
      alert('Failed to save ensemble.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8">
      {/* Configuration/List Panel */}
      <div className="w-96 luxury-card flex flex-col overflow-hidden">
        <div className="flex border-b border-luxury-stone/30">
          <button 
            onClick={() => setActiveTab('engine')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'engine' ? 'text-luxury-charcoal bg-luxury-stone/5' : 'text-luxury-taupe hover:bg-luxury-stone/5'}`}
          >
            Styling Engine
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'saved' ? 'text-luxury-charcoal bg-luxury-stone/5' : 'text-luxury-taupe hover:bg-luxury-stone/5'}`}
          >
            Saved Ensembles
          </button>
        </div>

        {activeTab === 'engine' ? (
          <div className="flex-1 p-8 overflow-y-auto flex flex-col">
            <div className="flex items-center space-x-2 mb-8">
              <Sparkles size={20} className="text-luxury-gold" />
              <h3 className="font-serif text-xl">Serendipity Engine</h3>
            </div>

            <div className="flex-1 space-y-8 pr-2">
              <div className="bg-luxury-ivory/30 border border-luxury-stone/30 rounded-2xl p-6 text-sm text-luxury-taupe leading-relaxed">
                <span className="font-bold uppercase tracking-widest text-[10px] block mb-3 text-luxury-charcoal/50">Discovery Tool</span>
                The styling engine surfaces random item combinations directly from your collection to break patterns and spark new aesthetic ideas.
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || wardrobe.length === 0}
              className="w-full bg-luxury-charcoal text-white py-4 rounded-2xl text-sm font-bold mt-8 hover:bg-luxury-charcoal/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <span>Shuffling...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Ensemble</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto bg-luxury-stone/5">
            {isLoadingSaved ? (
              <p className="text-center py-10 text-sm text-luxury-taupe">Loading library...</p>
            ) : savedOutfits.length === 0 ? (
              <div className="text-center py-10">
                <Bookmark size={32} className="mx-auto text-luxury-stone mb-4" />
                <p className="text-sm text-luxury-taupe">No saved ensembles yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedOutfits.map(outfit => (
                  <button 
                    key={outfit.id} 
                    onClick={() => { setActiveTab('saved'); setResult(outfit); setIsGenerating(false); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-colors ${result?.id === outfit.id ? 'border-luxury-charcoal bg-white shadow-sm' : 'border-luxury-stone/30 bg-white hover:border-luxury-taupe'}`}
                  >
                    <h4 className="font-serif font-medium truncate">{outfit.name}</h4>
                    <p className="text-xs text-luxury-taupe mt-1">{outfit.items?.length || 0} pieces{outfit.occasion ? ` • ${outfit.occasion}` : ''}</p>
                    
                    {/* Mini thumbnails */}
                    <div className="flex mt-3 -space-x-2">
                      {outfit.items?.slice(0, 4).map((img, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-luxury-ivory">
                          {img.image_url ? (
                            <img src={img.image_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-luxury-taupe">?</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Panel */}
      <div className="flex-1 luxury-card overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!result && !isGenerating && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-12 bg-luxury-stone/5"
            >
              <div className="w-24 h-24 rounded-full bg-luxury-ivory flex items-center justify-center mb-6 shadow-sm">
                <Wind size={40} className="text-luxury-stone" />
              </div>
              <h4 className="text-2xl font-serif italic text-luxury-charcoal mb-2">Ready to Discover</h4>
              <p className="text-luxury-taupe max-w-xs text-sm">Press Generate to shuffle random items from your wardrobe, or select a saved ensemble from the sidebar.</p>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center bg-luxury-stone/5"
            >
              <div className="relative w-32 h-32">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-t-2 border-luxury-gold rounded-full"
                />
                <div className="absolute inset-4 border border-luxury-stone/30 rounded-full flex items-center justify-center bg-white shadow-sm">
                  <Sparkles size={24} className="text-luxury-gold animate-pulse" />
                </div>
              </div>
              <p className="mt-8 micro-label animate-pulse">Selecting random pieces...</p>
            </motion.div>
          )}

          {result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col"
            >
              <div className="p-10 border-b border-luxury-stone/30 flex justify-between items-start bg-white">
                <div>
                  <span className="micro-label text-luxury-gold mb-2 block">
                    {activeTab === 'engine' ? 'Generated Ensemble' : 'Library Ensemble'}
                  </span>
                  <h3 className="text-4xl font-serif text-luxury-charcoal">{result.name}</h3>
                  {(result.occasion || result.season) && (
                    <div className="flex items-center space-x-4 mt-4">
                      {result.occasion && <span className="text-sm font-medium text-luxury-taupe">{result.occasion}</span>}
                      {result.occasion && result.season && <span className="w-1 h-1 bg-luxury-stone rounded-full" />}
                      {result.season && <span className="text-sm font-medium text-luxury-taupe">{result.season}</span>}
                    </div>
                  )}
                </div>
                
                {result.id.startsWith('temp-') && (
                  <button 
                    onClick={handleSaveOutfit}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-6 py-3 rounded-full bg-luxury-charcoal text-white hover:bg-luxury-charcoal/90 transition-colors text-sm font-bold disabled:opacity-50"
                  >
                    <Bookmark size={16} />
                    <span>{isSaving ? 'Preserving...' : 'Preserve Ensemble'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-luxury-stone/5">
                <p className="text-base text-luxury-charcoal leading-relaxed max-w-2xl mb-12">
                  {result.explanation}
                </p>

                <h4 className="micro-label mb-6">Curated Pieces</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {result.items?.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-luxury-stone/20">
                      <div className="aspect-square rounded-xl overflow-hidden bg-luxury-ivory mb-4">
                        {item.image_url ? (
                          <img src={item.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-luxury-taupe uppercase tracking-widest">No Image</div>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-luxury-charcoal uppercase tracking-wider truncate pb-1">{item.brand || item.category || 'Item'}</p>
                      <p className="text-sm font-medium text-luxury-taupe truncate">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
