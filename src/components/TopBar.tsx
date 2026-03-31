import React, { useState, useEffect } from 'react';
import { PlusCircle, User, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../lib/api';
import { Profile } from '../types';

interface TopBarProps {
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      getProfile(user.id).then(setProfile).catch(console.error);
    }
  }, [user]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'ClosetOS User';
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };
  return (
    <header className="h-20 border-b border-luxury-stone/30 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
      <div className="flex-1 max-w-xl flex items-center">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 mr-4 text-luxury-charcoal hover:bg-luxury-stone/10 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-6">

        
        <Link to="/wardrobe" className="p-2 text-luxury-taupe hover:text-luxury-charcoal transition-colors">
          <PlusCircle size={20} />
        </Link>

        <div className="h-8 w-px bg-luxury-stone/50 mx-2"></div>

        <Link to="/profile" className="flex items-center space-x-3 group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-luxury-charcoal">{displayName}</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-luxury-stone/50 overflow-hidden group-hover:border-luxury-taupe transition-colors bg-luxury-ivory flex items-center justify-center text-luxury-taupe">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={displayName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-serif font-bold tracking-widest">{getInitials(displayName)}</span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};
