import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import type { Match } from '../types/database.types';

const MatchList = () => {
  // This will be replaced with actual Supabase data in stage 3
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    const mockMatches: Match[] = [
      {
        id: '1',
        user_id: 'user123',
        opponent_name: 'John Doe',
        date: '2023-05-15',
        match_score: '3-1',
        notes: 'Good match, struggled with his serves',
        created_at: '2023-05-15T10:30:00'
      },
      {
        id: '2',
        user_id: 'user123',
        opponent_name: 'Jane Smith',
        date: '2023-05-10',
        match_score: '2-3',
        notes: 'Need to work on my backhand',
        created_at: '2023-05-10T14:45:00'
      }
    ];

    setMatches(mockMatches);
    setLoading(false);
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
                  <Link to={`/matches/${match.id}`} className="btn secondary-btn">
                    View Details
                  </Link>
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