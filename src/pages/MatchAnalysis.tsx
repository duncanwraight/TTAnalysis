import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Match } from '../types/database.types';

const MatchAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Mock data - will be replaced with Supabase in Stage 3
    setTimeout(() => {
      const mockMatch: Match = {
        id: id || 'match-id',
        user_id: 'user123',
        opponent_name: 'John Doe',
        date: new Date().toISOString().split('T')[0],
        match_score: '3-1',
        notes: 'Good match, need to work on backhand',
        created_at: new Date().toISOString()
      };
      
      setMatch(mockMatch);
      setLoading(false);
    }, 500);
  }, [id]);
  
  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading analysis...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="match-analysis-container">
        <div className="analysis-header">
          <h2>Match Analysis</h2>
          <h3>vs. {match?.opponent_name}</h3>
          <p className="match-date">{new Date(match?.date || '').toLocaleDateString()}</p>
        </div>
        
        <div className="analysis-summary">
          <div className="summary-card">
            <h3>Match Summary</h3>
            <p>Final Score: {match?.match_score}</p>
            <p>Total Points Won: 25</p>
            <p>Total Points Lost: 18</p>
          </div>
          
          <div className="summary-card">
            <h3>Shot Performance</h3>
            <p>Best Performing Shot: Forehand Loop (78% win rate)</p>
            <p>Needs Improvement: Backhand Push (40% win rate)</p>
          </div>
        </div>
        
        <div className="shot-analysis">
          <h3>Shot Analysis</h3>
          <p className="placeholder-message">
            Shot analysis charts will be displayed here in a future update.
          </p>
          
          <div className="placeholder-charts">
            <div className="placeholder-chart"></div>
            <div className="placeholder-chart"></div>
          </div>
        </div>
        
        <div className="analysis-actions">
          <button
            className="btn secondary-btn"
            onClick={() => navigate('/matches')}
          >
            Back to Matches
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MatchAnalysis;