import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Wardrobe } from './components/Wardrobe';
import { WardrobeDetail } from './components/WardrobeDetail';
import { AIOutfits } from './components/AIOutfits';
import { Planner } from './components/Planner';
import { Analytics } from './components/Analytics';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TaxonomyReview } from './components/TaxonomyReview';
import { ManualOutfitBuilder } from './components/ManualOutfitBuilder';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected layout routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wardrobe" element={<Wardrobe />} />
                <Route path="/wardrobe/:id" element={<WardrobeDetail />} />
                <Route path="/ai-outfits" element={<AIOutfits />} />
                <Route path="/builder" element={<ManualOutfitBuilder />} />
                <Route path="/outfit-builder" element={<Navigate to="/builder" replace />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/taxonomy-review" element={<TaxonomyReview />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
