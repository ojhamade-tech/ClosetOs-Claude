import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Mail, Edit3, X, Plus, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile, getStylePreferences, updateStylePreferences, uploadAvatarImage } from '../lib/api';
import { Profile as UserProfile, StylePreferences } from '../types';

const TagEditor = ({ label, tags, onChange, placeholder, isEditing }: { label: string, tags: string[], onChange: (t: string[]) => void, placeholder: string, isEditing: boolean }) => {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault();
      if (!tags.includes(inputVal.trim())) {
        onChange([...tags, inputVal.trim()]);
      }
      setInputVal('');
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <p className="micro-label mb-2 text-luxury-charcoal/70">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="px-3 py-1.5 bg-luxury-ivory border border-luxury-stone/50 rounded-full text-xs font-medium text-luxury-charcoal flex items-center space-x-2">
            <span>{tag}</span>
            {isEditing && (
              <button 
                onClick={() => onChange(tags.filter(t => t !== tag))} 
                className="text-luxury-taupe hover:text-red-500 transition-colors"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        
        {isEditing && (
          <div className="relative">
            <input
              type="text"
              placeholder={placeholder}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-4 py-1.5 border border-dashed border-luxury-stone rounded-full text-xs font-medium text-luxury-charcoal bg-transparent focus:outline-none focus:border-luxury-charcoal pr-8"
            />
            <Plus size={14} className="absolute right-3 top-1.5 text-luxury-taupe" />
          </div>
        )}
        
        {!isEditing && tags.length === 0 && (
          <span className="text-xs text-luxury-taupe italic">Unspecified</span>
        )}
      </div>
    </div>
  );
};

export const Profile: React.FC = () => {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<StylePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Toggles
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile State
  const [editName, setEditName] = useState('');

  // Preference State
  const [styleIdentity, setStyleIdentity] = useState('');
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [avoidedCategories, setAvoidedCategories] = useState<string[]>([]);
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [avoidedColors, setAvoidedColors] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedProfile, fetchedPrefs] = await Promise.all([
        getProfile(user.id),
        getStylePreferences(user.id).catch(() => null)
      ]);
      
      setProfile(fetchedProfile);
      setPrefs(fetchedPrefs);
      
      setEditName(fetchedProfile?.display_name || user.email?.split('@')[0] || 'User');
      
      // Map preferences honestly to schema
      setStyleIdentity(fetchedPrefs?.style_identity || '');
      setFavoriteCategories(fetchedPrefs?.favorite_categories || []);
      setAvoidedCategories(fetchedPrefs?.avoided_categories || []);
      setPreferredColors(fetchedPrefs?.preferred_colors || []);
      setAvoidedColors(fetchedPrefs?.avoided_colors || []);
      setOccasions(fetchedPrefs?.occasions || []);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateProfile(user.id, { display_name: editName });
      setIsEditingProfile(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateStylePreferences(user.id, {
        style_identity: styleIdentity,
        favorite_categories: favoriteCategories,
        avoided_categories: avoidedCategories,
        preferred_colors: preferredColors,
        avoided_colors: avoidedColors,
        occasions: occasions
      });
      setIsEditingPreferences(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    setIsSaving(true);
    try {
      const url = await uploadAvatarImage(file, user.id);
      await updateProfile(user.id, { avatar_url: url });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to upload avatar. Check if avatars bucket exists.');
    } finally {
      setIsSaving(false);
    }
  };

  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently';

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-luxury-charcoal rounded-full animate-spin mb-4" />
        <p className="text-luxury-taupe text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      <header className="flex items-end justify-between">
        <div className="flex items-center space-x-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-luxury-stone/10 flex items-center justify-center font-serif text-3xl text-luxury-taupe">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" />
              ) : (
                editName.charAt(0).toUpperCase()
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
              className="absolute bottom-0 right-0 p-2 bg-luxury-charcoal text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              title="Update Avatar"
            >
              <Edit3 size={16} />
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              {isEditingProfile ? (
                 <input 
                   autoFocus
                   type="text" 
                   value={editName}
                   onChange={e => setEditName(e.target.value)}
                   className="text-4xl font-serif font-medium bg-luxury-ivory/50 border-b-2 border-luxury-charcoal focus:outline-none p-1"
                 />
              ) : (
                 <h2 className="text-4xl font-serif font-medium">{profile?.display_name || user?.email?.split('@')[0]}</h2>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-luxury-taupe">
              <div className="flex items-center space-x-1">
                <Mail size={14} />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>
        
        {isEditingProfile ? (
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-8 py-3 rounded-full bg-luxury-gold text-white text-sm font-bold hover:opacity-90 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Check size={16} />
            <span>Save Profile</span>
          </button>
        ) : (
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="px-8 py-3 rounded-full bg-luxury-charcoal text-white text-sm font-bold hover:bg-luxury-charcoal/90 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </header>

      <div className="flex justify-end mb-4">
        {isEditingPreferences ? (
          <button 
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="px-6 py-2 rounded-full border border-luxury-gold text-luxury-gold text-xs font-bold hover:bg-luxury-gold/10 transition-colors flex items-center space-x-2"
          >
            <Check size={14} />
            <span>Persist Aesthetic Choices</span>
          </button>
        ) : (
          <button 
            onClick={() => setIsEditingPreferences(true)}
            className="px-6 py-2 rounded-full border border-luxury-charcoal text-luxury-charcoal text-xs font-bold hover:bg-luxury-ivory transition-colors flex items-center space-x-2"
          >
            <Edit3 size={14} />
            <span>Modify Preferences</span>
          </button>
        )}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Color & General Preferences */}
          <div className="luxury-card p-8">
            <h4 className="font-serif text-xl mb-6">Color & Style Preferences</h4>
            
            <div className="space-y-6">
              <TagEditor 
                label="Preferred Colors" 
                tags={preferredColors} 
                onChange={setPreferredColors} 
                placeholder="e.g. Navy, Beige..." 
                isEditing={isEditingPreferences} 
              />
              <TagEditor 
                label="Avoided Colors" 
                tags={avoidedColors} 
                onChange={setAvoidedColors} 
                placeholder="e.g. Neon Green..." 
                isEditing={isEditingPreferences} 
              />
              <TagEditor 
                label="Typical Occasions" 
                tags={occasions} 
                onChange={setOccasions} 
                placeholder="e.g. Business Travel, Casual..." 
                isEditing={isEditingPreferences} 
              />
            </div>
          </div>

        </div>

        <div className="space-y-8">
          {/* Aesthetic Details & Categories */}
          <div className="luxury-card p-8">
            <h4 className="font-serif text-xl mb-6">Aesthetic Details</h4>
            
            <div className="space-y-8">
              <div>
                <p className="micro-label mb-3 text-luxury-charcoal/70">Core Identity</p>
                {isEditingPreferences ? (
                  <textarea
                    value={styleIdentity}
                    onChange={e => setStyleIdentity(e.target.value)}
                    placeholder="e.g. Quiet Luxury meets Architectural Minimalism"
                    className="w-full text-sm text-luxury-charcoal font-medium italic bg-luxury-stone/5 border border-luxury-stone/20 rounded-xl p-3 focus:outline-none focus:border-luxury-charcoal min-h-[80px]"
                  />
                ) : (
                  <p className="text-sm text-luxury-charcoal font-medium italic border-l-2 border-luxury-gold pl-3 py-1">
                    {styleIdentity ? `"${styleIdentity}"` : <span className="opacity-50">"Define your signature look..."</span>}
                  </p>
                )}
              </div>
              
              <div className="space-y-6 pt-4 border-t border-luxury-stone/30">
                <TagEditor 
                  label="Favorite Categories" 
                  tags={favoriteCategories} 
                  onChange={setFavoriteCategories} 
                  placeholder="e.g. Blazers, Knitwear..." 
                  isEditing={isEditingPreferences} 
                />
                <TagEditor 
                  label="Avoided Categories" 
                  tags={avoidedCategories} 
                  onChange={setAvoidedCategories} 
                  placeholder="e.g. Athleisure..." 
                  isEditing={isEditingPreferences} 
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
