import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import type { Match } from '../types/database.types';
import { matchApi } from '../lib/api';

const MatchList = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await matchApi.getAllMatches();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Failed to load matches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle match deletion
  const handleDeleteMatch = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        await matchApi.deleteMatch(id);
        // Refresh the match list after deletion
        fetchMatches();
      } catch (err) {
        console.error('Failed to delete match:', err);
        alert('Failed to delete match. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <Layout>
      <div className="match-list-container">
        <div className="match-list-header">
          <h2>Your Matches</h2>
          <Link to="/matches/new" className="btn primary-btn">
            New Match
          </Link>
        </div>

        {loading ? (
          <p>Loading matches...</p>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn secondary-btn">
              Try Again
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="no-matches">
            <p>You haven't recorded any matches yet.</p>
            <Link to="/matches/new" className="btn primary-btn">
              Record Your First Match
            </Link>
          </div>
        ) : (
          <div className="match-cards">
            {matches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-card-header">
                  <h3>vs. {match.opponent_name}</h3>
                  <span className="match-date">{new Date(match.date).toLocaleDateString()}</span>
                </div>
                <div className="match-card-body">
                  <p className="match-score">Score: {match.match_score}</p>
                  {match.notes && <p className="match-notes">{match.notes}</p>}
                </div>
                <div className="match-card-footer">
                  <div className="match-card-actions">
                    <Link to={`/matches/${match.id}`} className="btn secondary-btn">
                      Edit
                    </Link>
                    <Link to={`/matches/${match.id}/analysis`} className="btn primary-btn">
                      Analysis
                    </Link>
                    <button 
                      onClick={(e) => handleDeleteMatch(match.id, e)} 
                      className="btn danger-btn"
                      disabled={isDeleting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MatchList;