import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Sparkles, Check, X, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { getWeeklyPlans, getOutfits, setPlannerOutfit, updateWardrobeItem, deletePlannerOutfit } from '../lib/api';
import { Outfit, WeeklyPlan } from '../types';

export const Planner: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal for selecting outfit
  const [isSelectingOutfit, setIsSelectingOutfit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Just load a broad range around current date for MVP
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      const [fetchedPlans, fetchedOutfits] = await Promise.all([
        getWeeklyPlans(startDate, endDate),
        getOutfits()
      ]);
      setPlans(fetchedPlans);
      setOutfits(fetchedOutfits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const handleAssignOutfit = async (outfitId: string) => {
    setIsSaving(true);
    try {
      const newPlan = await setPlannerOutfit(selectedDate, outfitId);
      // Reload plans to get the joined outfits data correctly
      await loadData();
      setIsSelectingOutfit(false);
    } catch (e) {
      console.error(e);
      alert('Failed to assign outfit');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveOutfit = async (plan: WeeklyPlan) => {
    if (!window.confirm('Remove this outfit from your plan?')) return;
    setIsSaving(true);
    try {
      await deletePlannerOutfit(plan.date);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to remove plan.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleMarkAsWorn = async (plan: WeeklyPlan) => {
    setIsSaving(true);
    try {
      await setPlannerOutfit(plan.date, plan.outfit_id, 'worn');
      
      // Optionally update wear counts
      if (plan.outfits && plan.outfits.items) {
        await Promise.all(plan.outfits.items.map((item: any) => 
          updateWardrobeItem(item.id, { wear_count: item.wear_count + 1 })
        ));
      }
      
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Find plan for selected date
  const selectedPlan = plans.find(p => p.date === selectedDate);
  // In `getWeeklyPlans` we asked for outfits(*) join, so p.outfits should contain it.
  const selectedOutfit = selectedPlan?.outfits;

  // Change month handlers
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8">
      {/* Calendar View */}
      <div className="flex-1 luxury-card p-8 flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h3 className="text-2xl font-serif text-luxury-charcoal">{currentMonthName}</h3>
            <div className="flex items-center space-x-1">
              <button onClick={prevMonth} className="p-2 hover:bg-luxury-ivory text-luxury-taupe hover:text-luxury-charcoal rounded-full transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={nextMonth} className="p-2 hover:bg-luxury-ivory text-luxury-taupe hover:text-luxury-charcoal rounded-full transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDate(today.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 text-sm font-medium text-luxury-taupe hover:text-luxury-charcoal"
            >
              Today
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-t-2 border-luxury-charcoal animate-spin" />
            <p className="mt-4 text-luxury-taupe text-sm">Synchronizing Calendar...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-luxury-stone/20 rounded-2xl overflow-hidden border border-luxury-stone/20">
            {/* Day Headers (Fixed Height) */}
            <div className="grid grid-cols-7 gap-px border-b border-luxury-stone/20">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="bg-luxury-ivory/50 p-3 text-center">
                  <span className="text-[10px] font-bold text-luxury-taupe uppercase tracking-widest">{day}</span>
                </div>
              ))}
            </div>
            {/* Days Grid (Dynamic Fractional Height) */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-luxury-stone/20">
            {days.map(day => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const planForDay = plans.find(p => p.date === dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`bg-white p-3 flex flex-col items-start transition-all hover:bg-luxury-ivory/30 relative h-full w-full overflow-hidden ${
                    isSelected ? 'ring-2 ring-inset ring-luxury-charcoal z-10' : ''
                  }`}
                >
                  <span className={`text-sm font-medium flex items-center justify-center w-6 h-6 rounded-full mb-1 shrink-0 ${isSelected ? 'bg-luxury-charcoal text-white' : 'text-luxury-taupe'}`}>
                    {day}
                  </span>
                  {planForDay && planForDay.outfits && (
                    <div className="mt-1 w-full overflow-hidden">
                      <div className={`h-1.5 w-1.5 rounded-full mb-1 border shrink-0 ${planForDay.status === 'worn' ? 'bg-luxury-charcoal border-luxury-charcoal' : 'bg-luxury-gold border-luxury-gold'}`} />
                      <div className={`p-1.5 text-[10px] text-left truncate font-medium rounded-md ${planForDay.status === 'worn' ? 'bg-luxury-stone/10 text-luxury-taupe' : 'bg-luxury-ivory text-luxury-charcoal'}`}>
                        {planForDay.outfits.name}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* Details Sidebar */}
      <div className="w-96 flex flex-col space-y-6">
        <div className="luxury-card p-8 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-luxury-stone/30">
            <h4 className="font-serif text-xl text-luxury-charcoal">Day Details</h4>
            <span className="text-sm font-medium text-luxury-taupe bg-luxury-ivory px-3 py-1 rounded-full">
              {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {selectedPlan && selectedOutfit ? (
            <div className="space-y-8 flex-1 flex flex-col">
              <div className="flex items-center space-x-3 text-luxury-charcoal bg-luxury-ivory/50 p-4 rounded-2xl border border-luxury-stone/20">
                <CalendarIcon size={20} className="text-luxury-gold" />
                <h5 className="text-sm font-bold tracking-wide uppercase">{selectedOutfit.occasion || 'General Event'}</h5>
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <label className="micro-label">Planned Ensemble</label>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-sm ${
                    selectedPlan.status === 'worn' ? 'bg-luxury-charcoal text-white' : 'bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30'
                  }`}>
                    {selectedPlan.status}
                  </span>
                </div>
                
                <div className="bg-white rounded-2xl p-4 border border-luxury-stone/30">
                  <h4 className="font-serif text-lg mb-4 text-luxury-charcoal">{selectedOutfit.name}</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {selectedOutfit.items && selectedOutfit.items.length > 0 ? (
                      selectedOutfit.items.map((item: any) => (
                        <div key={item.id} className="aspect-square bg-luxury-stone/10 rounded-lg flex flex-col items-center justify-center text-luxury-taupe text-[10px] overflow-hidden border border-luxury-stone/20 relative group">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="uppercase tracking-widest p-2 text-center text-[8px]">{item.brand || item.category || 'Item'}</span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-white font-bold truncate w-full flex-1">{item.name}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                       <div className="col-span-2 aspect-[4/1] bg-luxury-stone/10 rounded-lg flex items-center justify-center text-luxury-taupe text-[10px]">
                         No items linked to this ensemble.
                       </div>
                    )}
                  </div>
                  <p className="text-xs text-luxury-taupe leading-relaxed">
                    {selectedOutfit.explanation || "No explanation provided for this ensemble."}
                  </p>
                </div>
              </div>

              {selectedOutfit.items && selectedOutfit.items.some((i: any) => (i.availability ?? 'available') !== 'available') && (
                <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-snug">
                    <span className="font-semibold">Some items may not be available.</span>{' '}
                    Check your wardrobe before wearing this outfit.
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-luxury-stone/30 space-y-3 mt-auto">
                {selectedPlan.status === 'planned' && (
                  <button
                    onClick={() => handleMarkAsWorn(selectedPlan)}
                    disabled={isSaving}
                    className="w-full bg-luxury-charcoal text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:bg-black transition-colors"
                  >
                    <Check size={16} />
                    <span>Conclude & Mark as Worn</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setIsSelectingOutfit(true)}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl border border-luxury-stone/50 text-sm font-medium hover:bg-luxury-ivory transition-colors text-luxury-charcoal"
                >
                  Change Outfit
                </button>
                
                <button 
                  onClick={() => handleRemoveOutfit(selectedPlan)}
                  disabled={isSaving}
                  className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                >
                  Remove Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 rounded-full bg-luxury-ivory border border-luxury-stone/30 flex items-center justify-center mb-6 shadow-sm">
                <CalendarIcon size={32} className="text-luxury-stone" />
              </div>
              <p className="text-luxury-charcoal font-serif text-xl mb-2">Unscheduled</p>
              <p className="text-luxury-taupe text-sm max-w-[200px] mb-8">No ensemble has been assigned to this date yet.</p>
              
              <button 
                onClick={() => setIsSelectingOutfit(true)}
                className="bg-white border border-luxury-stone/50 hover:border-luxury-charcoal text-luxury-charcoal px-6 py-3 rounded-full text-sm font-bold transition-all shadow-sm"
              >
                Assign Ensemble
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Outfit Selection Modal */}
      {isSelectingOutfit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-luxury-charcoal/40 backdrop-blur-sm" onClick={() => !isSaving && setIsSelectingOutfit(false)} />
          <div className="bg-white w-full max-w-2xl rounded-3xl p-10 relative z-10 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-luxury-stone/30">
              <div>
                <h3 className="text-2xl font-serif text-luxury-charcoal">Library Ensembles</h3>
                <p className="text-sm text-luxury-taupe mt-1">Select an outfit to assign to {selectedDate}</p>
              </div>
              <button disabled={isSaving} onClick={() => setIsSelectingOutfit(false)} className="text-luxury-taupe hover:text-luxury-charcoal">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {outfits.length === 0 ? (
                <div className="text-center py-12 text-luxury-taupe text-sm border border-dashed border-luxury-stone/50 rounded-2xl">
                  No saved ensembles found. Generate one in the Styled Engine first.
                </div>
              ) : (
                outfits.map(outfit => (
                  <button 
                    key={outfit.id}
                    onClick={() => handleAssignOutfit(outfit.id)}
                    disabled={isSaving}
                    className="w-full text-left p-4 rounded-2xl border border-luxury-stone/30 bg-white hover:border-luxury-charcoal hover:shadow-sm transition-all group flex items-start justify-between"
                  >
                    <div>
                      <h4 className="font-serif text-lg text-luxury-charcoal group-hover:text-black">{outfit.name}</h4>
                      <p className="text-xs text-luxury-taupe mt-1 uppercase tracking-wider">{outfit.occasion} • {outfit.season}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-luxury-stone/30 flex items-center justify-center text-luxury-taupe group-hover:bg-luxury-charcoal group-hover:text-white group-hover:border-luxury-charcoal transition-colors">
                      <Plus size={16} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
