import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  Layers,
  Calendar,
  BarChart3,
  User,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/ai-outfits', label: 'AI Outfits', icon: Sparkles },
  { path: '/builder', label: 'Build Outfit', icon: Layers },
  { path: '/planner', label: 'Planner', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/profile', label: 'Profile', icon: User },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-luxury-charcoal/50 z-[90] backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside 
        className={`w-64 h-[100dvh] border-r border-luxury-stone/50 bg-white flex flex-col fixed md:sticky top-0 z-[100] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
      <div className="p-8">
        <Link to="/">
          <h1 className="text-2xl font-serif tracking-tight font-bold text-luxury-charcoal">
            Closet<span className="italic font-normal">OS</span>
          </h1>
          <p className="micro-label mt-1 opacity-60">The Digital Atelier</p>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <NavLink
              onClick={handleNavClick}
              key={item.path}
              to={item.path}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-luxury-charcoal text-white shadow-sm' 
                  : 'text-luxury-taupe hover:bg-luxury-ivory hover:text-luxury-charcoal'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-sm font-medium ${isActive ? 'translate-x-1' : ''} transition-transform duration-200`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1 h-4 bg-luxury-gold rounded-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 space-y-4">
        <Link onClick={handleNavClick} to="/wardrobe" className="w-full flex items-center justify-center space-x-2 bg-luxury-stone/30 hover:bg-luxury-stone/50 text-luxury-charcoal py-3 rounded-xl transition-colors border border-luxury-stone/50">
          <Plus size={18} />
          <span className="text-sm font-medium">Manage Wardrobe</span>
        </Link>
        
        <div className="pt-4 border-t border-luxury-stone/30">
          <Link onClick={handleNavClick} to="/profile" className="w-full flex items-center space-x-3 px-4 py-2 text-luxury-taupe hover:text-luxury-charcoal transition-colors group">
            <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-sm font-medium">Profile Settings</span>
          </Link>
          <button onClick={signOut} className="w-full flex items-center space-x-3 px-4 py-2 text-luxury-taupe hover:text-red-600 transition-colors">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
