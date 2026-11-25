import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import MatchList from './pages/MatchList';
import NewMatch from './pages/NewMatch';
import MatchTracker from './pages/MatchTracker';
import MatchAnalysis from './pages/MatchAnalysis';
import PointsEditor from './pages/PointsEditor';
import PointSweep from './pages/PointSweep';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import AdminShots from './pages/AdminShots';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './styles/pages.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;