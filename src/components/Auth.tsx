import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email for the confirmation link!"); 
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-luxury-ivory p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-luxury-stone/30">
        <h2 className="text-3xl font-serif tracking-tight text-center font-bold text-luxury-charcoal mb-2">
          Closet<span className="italic font-normal">OS</span>
        </h2>
        <p className="text-center text-luxury-taupe mb-8">{isLogin ? 'Sign in to your digital atelier' : 'Create your digital atelier'}</p>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-luxury-charcoal mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-luxury-stone/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-luxury-charcoal mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-luxury-stone/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:border-transparent transition-all"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-luxury-charcoal text-white rounded-xl py-3 font-medium hover:bg-black transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-luxury-taupe hover:text-luxury-charcoal transition-colors focus:outline-none"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};
