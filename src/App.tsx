import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Home from './pages/Home';
import Auth from './pages/Auth';
// Home and Auth stay in the main bundle so the prerendered brochure and the
// sign-in form appear without a wait. Every other page loads on first visit.
const MatchList = lazy(() => import('./pages/MatchList'));
const NewMatch = lazy(() => import('./pages/NewMatch'));
const MatchTracker = lazy(() => import('./pages/MatchTracker'));
const MatchAnalysis = lazy(() => import('./pages/MatchAnalysis'));
const PointsEditor = lazy(() => import('./pages/PointsEditor'));
const PointSweep = lazy(() => import('./pages/PointSweep'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminShots = lazy(() => import('./pages/AdminShots'));
const AdminStyles = lazy(() => import('./pages/AdminStyles'));
const Players = lazy(() => import('./pages/Players'));
const PlayerHistory = lazy(() => import('./pages/PlayerHistory'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PageErrorBoundary from './components/PageErrorBoundary';
import './styles/pages.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PageErrorBoundary>
          <Suspense fallback={<div className="state" role="status"><p>Loading...</p></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected routes requiring authentication */}
              <Route 
                path="/matches" 
                element={
                  <ProtectedRoute>
                    <MatchList />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches/new" 
                element={
                  <ProtectedRoute>
                    <NewMatch />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches/:id" 
                element={
                  <ProtectedRoute>
                    <MatchTracker />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches/:id/analysis" 
                element={
                  <ProtectedRoute>
                    <MatchAnalysis />
                  </ProtectedRoute>
                } 
              />
              
              <Route
                path="/matches/:id/summary"
                element={
                  <ProtectedRoute>
                    <MatchAnalysis />
                  </ProtectedRoute>
                }
              />
    
              <Route
                path="/matches/:id/points"
                element={
                  <ProtectedRoute>
                    <PointsEditor />
                  </ProtectedRoute>
                }
              />
    
              <Route
                path="/matches/:id/sweep/:tag"
                element={
                  <ProtectedRoute>
                    <PointSweep />
                  </ProtectedRoute>
                }
              />
    
              {/* Public shared analysis route - no authentication required */}
              <Route path="/shared/:token" element={<MatchAnalysis />} />
              <Route path="/shared/:token/summary" element={<MatchAnalysis />} />
              {/* A player's history shared by link, and each match in it */}
              <Route path="/shared/history/:token" element={<PlayerHistory />} />
              <Route path="/shared/history/:token/shots" element={<PlayerHistory />} />
              <Route path="/shared/history/:token/opponents" element={<PlayerHistory />} />
              <Route path="/shared/history/:token/matches/:id" element={<MatchAnalysis />} />
              <Route path="/shared/history/:token/matches/:id/summary" element={<MatchAnalysis />} />
              {/* Old-style links (match ID instead of token) now show the invalid link message */}
              <Route path="/shared/matches/:token/analysis" element={<MatchAnalysis />} />
              
              {/* Admin routes requiring admin status */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPanel />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/shots" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminShots />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/admin/styles"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminStyles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players"
                element={
                  <ProtectedRoute>
                    <Players />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players/:id/history"
                element={
                  <ProtectedRoute>
                    <PlayerHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players/:id/history/shots"
                element={
                  <ProtectedRoute>
                    <PlayerHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/players/:id/history/opponents"
                element={
                  <ProtectedRoute>
                    <PlayerHistory />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;