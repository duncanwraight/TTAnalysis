import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import MatchList from './pages/MatchList';
import NewMatch from './pages/NewMatch';
import MatchTracker from './pages/MatchTracker-Refactored';
import MatchAnalysis from './pages/MatchAnalysis';
import './index.css';

function App() {
  // Log environment variables on startup
  useEffect(() => {
    console.log('Environment variables:');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/matches" element={<MatchList />} />
        <Route path="/matches/new" element={<NewMatch />} />
        <Route path="/matches/:id" element={<MatchTracker />} />
        <Route path="/matches/:id/analysis" element={<MatchAnalysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;