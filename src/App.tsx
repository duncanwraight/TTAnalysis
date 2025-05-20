import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import MatchList from './pages/MatchList';
import NewMatch from './pages/NewMatch';
import MatchTracker from './pages/MatchTracker';
import MatchAnalysis from './pages/MatchAnalysis';
import './styles/index.css';

function App() {
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
