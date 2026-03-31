import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, TrendingUp, Layers, Sparkles, Shirt, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAnalyticsDashboard, AnalyticsDashboard } from '../lib/analytics';
import { getActivityLog, getWeeklyPlans, getOutfits, getProfile, ActivityLogEntry } from '../lib/api';
import { WeeklyPlan, Outfit, Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [featuredOutfit, setFeaturedOutfit] = useState<Outfit | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    
    getProfile(user.id).then(setProfile).catch(console.error);

    const load = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        
        // Use 30-day lookback for the dashboard metrics
        const startLookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dashStartDate = `${startLookback.getFullYear()}-${String(startLookback.getMonth() + 1).padStart(2, '0')}-${String(startLookback.getDate()).padStart(2, '0')}`;
        
        const startDate = `${year}-${month}-${d}`;
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const endDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

        const [dashData, logData, outfits, upcomingPlans] = await Promise.all([
          getAnalyticsDashboard(dashStartDate, endDate),
          getActivityLog({ limit: 5 }).catch(() => [] as ActivityLogEntry[]),
          getOutfits().catch(() => [] as Outfit[]),
          getWeeklyPlans(startDate, endDate).catch(() => [] as WeeklyPlan[])
        ]);
        
        setDashboard(dashData);
        setActivity(logData);
        
        // Filter out past plans for the upcoming preview
        const futurePlans = upcomingPlans.filter(p => new Date(`${p.date}T00:00:00Z`).getTime() >= new Date(`${startDate}T00:00:00Z`).getTime());
        setPlans(futurePlans.slice(0, 3));
        
        // Hero Outfit Logic: Most recently planned outfit > Most recently saved outfit
        if (futurePlans.length > 0 && futurePlans[0].outfits) {
          setFeaturedOutfit(futurePlans[0].outfits);
        } else if (outfits && outfits.length > 0) {
          setFeaturedOutfit(outfits[0]);
        }
      } catch (e) {
        console.error("Dashboard load error", e);
      }
    };
    load();
  }, [user]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Julian';

  const formatPlanDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return {
      day: d.toLocaleString('en-US', { weekday: 'short' }),
      date: d.getDate().toString()
    };
  };

  const getEventMessage = (entry: ActivityLogEntry) => {
    if (entry.type === 'added_item') return 'Added a piece to the collection';
    if (entry.type === 'saved_outfit') return 'Reserved a new ensemble';
    if (entry.type === 'planned_outfit') return 'Assigned an ensemble to planner';
    if (entry.type === 'marked_worn') return 'Concluded and marked ensemble as worn';
    if (entry.type === 'removed_plan') return 'Removed an ensemble from planner';
    if (entry.type === 'generated_outfit') return 'Synthesized a new ensemble';
    return entry.type;
  };

  const getTimeAgo = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-10 pb-12">
      <header>
        <h2 className="text-4xl font-serif font-medium text-luxury-charcoal">Morning, {displayName}</h2>
        <p className="text-luxury-taupe mt-2">Your digital atelier is curated and ready for the day.</p>
      </header>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative group overflow-hidden rounded-3xl aspect-[16/9] lg:aspect-auto lg:h-[450px]">
          {featuredOutfit ? (
            <>
              {featuredOutfit.items && featuredOutfit.items[0]?.image_url ? (
                <img 
                  src={featuredOutfit.items[0].image_url} 
                  alt={featuredOutfit.name || 'Featured'}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-luxury-stone/20 transition-transform duration-700 group-hover:scale-105 flex items-center justify-center text-luxury-taupe font-serif text-2xl">
                  {featuredOutfit.name}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-luxury-charcoal/90 via-luxury-charcoal/40 to-transparent flex flex-col justify-end p-10">
                <div className="space-y-4 max-w-lg">
                  <span className="micro-label text-white/80">Latest Creation</span>
                  <h3 className="text-4xl text-white font-serif italic">{featuredOutfit.name}</h3>
                  <p className="text-white/70 text-sm leading-relaxed truncate">{featuredOutfit.explanation || "No description provided."}</p>
                  <div className="flex items-center space-x-4 pt-4">
                    <button 
                      onClick={() => navigate('/ai-outfits')}
                      className="bg-white text-luxury-charcoal px-6 py-3 rounded-full text-sm font-semibold hover:bg-luxury-ivory transition-colors"
                    >
                      View Ensembles
                    </button>
                    <button 
                      onClick={() => navigate('/planner')}
                      className="text-white border border-white/30 px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Plan for Today
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-luxury-stone/10 border-2 border-dashed border-luxury-stone/30 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="text-luxury-stone" size={24} />
              </div>
              <h3 className="text-2xl font-serif text-luxury-charcoal mb-2">No Ensembles Yet</h3>
              <p className="text-luxury-taupe text-sm max-w-xs mb-6">Create your first styled look in the AI styling engine.</p>
              <button 
                onClick={() => navigate('/ai-outfits')}
                className="bg-luxury-charcoal text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-black transition-colors"
              >
                Go to Styling Engine
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="luxury-card p-8 flex flex-col justify-between h-[210px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="micro-label">Collection Impact</span>
                <div className="p-2 bg-luxury-olive/10 text-luxury-olive rounded-full">
                  <Shirt size={16} />
                </div>
              </div>
              <p className="text-3xl font-serif font-bold text-luxury-charcoal">{dashboard?.summary?.wardrobeUsageRatePct || 0}%</p>
            </div>
            <div className="flex items-center justify-between text-xs text-luxury-taupe mt-4 border-t border-luxury-stone/30 pt-3">
              <span><span className="font-bold text-luxury-charcoal">{dashboard?.summary?.totalItems || 0}</span> Total Items</span>
              <span><span className="font-bold text-luxury-charcoal">{dashboard?.summary?.unusedItems || 0}</span> Unused</span>
            </div>
          </div>

          <div className="luxury-card p-8 flex flex-col justify-between h-[210px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="micro-label">Momentum</span>
                <div className="p-2 bg-luxury-gold/10 text-luxury-gold rounded-full">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="text-3xl font-serif font-bold text-luxury-charcoal">{dashboard?.summary?.wearStreakDays || 0} Days</p>
            </div>
            <div className="flex items-center text-xs text-luxury-taupe mt-4 border-t border-luxury-stone/30 pt-3">
              <span><span className="font-bold text-luxury-charcoal">{dashboard?.summary?.totalSavedOutfits || 0}</span> Ensembles Saved</span>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Planner Preview */}
        <div className="luxury-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-serif text-xl">Upcoming Plans</h4>
            <Link to="/planner" className="text-luxury-taupe hover:text-luxury-charcoal transition-colors">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="space-y-6">
            {plans.length > 0 ? plans.map((plan) => {
              const { day, date } = formatPlanDate(plan.date);
              return (
                <div key={plan.id} className="flex items-center space-x-4 group cursor-pointer" onClick={() => navigate('/planner')}>
                  <div className="text-center w-10">
                    <p className="text-[10px] uppercase text-luxury-taupe font-bold">{day}</p>
                    <p className="text-lg font-serif">{date}</p>
                  </div>
                  <div className="flex-1 border-l border-luxury-stone/50 pl-4 py-1 overflow-hidden">
                    <p className="text-sm font-semibold text-luxury-charcoal truncate">{plan.outfits?.name || 'Ensemble'}</p>
                    <p className="text-xs text-luxury-taupe uppercase tracking-widest mt-1">{plan.status}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-6">
                <CalendarIcon className="mx-auto text-luxury-stone mb-2" size={24} />
                <p className="text-sm text-luxury-taupe">No upcoming plans.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="luxury-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-serif text-xl">Recent Activity</h4>
            <Layers size={20} className="text-luxury-stone" />
          </div>
          <div className="space-y-6">
            {activity.length > 0 ? activity.map((entry) => (
              <div key={entry.event_id} className="flex space-x-4">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  entry.type === 'added_item' ? 'bg-luxury-gold' : 
                  entry.type === 'planned_outfit' ? 'bg-luxury-olive' : 
                  entry.type === 'marked_worn' ? 'bg-luxury-charcoal' : 'bg-luxury-taupe'
                }`} />
                <div>
                  <p className="text-sm text-luxury-charcoal leading-tight">{getEventMessage(entry)}</p>
                  <p className="text-[10px] text-luxury-taupe uppercase mt-1 tracking-widest">{getTimeAgo(entry.event_timestamp)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <Clock className="mx-auto text-luxury-stone mb-2" size={24} />
                <p className="text-sm text-luxury-taupe">No recent activity.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
