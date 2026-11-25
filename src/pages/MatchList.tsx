import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { cleanText } from '../lib/matchDetails';
import type { Match } from '../types/database.types';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** "Won 3–1" in blue, "Lost 1–3" in orange, or "In progress" while recording. */
const matchResult = (match: Match): { label: string; tone: string } => {
  const [won, lost] = (match.match_score ?? '0-0').split('-').map(n => Number(n) || 0);
  if (!match.is_complete) return { label: won + lost > 0 ? `In progress ${won}–${lost}` : 'Not started', tone: '' };
  if (won > lost) return { label: `Won ${won}–${lost}`, tone: 'you' };
  if (lost > won) return { label: `Lost ${won}–${lost}`, tone: 'opp' };
  return { label: `${won}–${lost}`, tone: '' };
};

const MatchList = () => {
  const api = useApi();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useAuth();
  const userId = user?.id;

  const fetchMatches = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);

      const data = await api.match.getAllMatches(userId);
      setMatches(data);
    } catch (err) {
      setError('Failed to load matches. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  // Handle match deletion
  const handleDeleteMatch = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (window.confirm('Delete this match and all its points? This can\'t be undone.')) {
      try {
        setIsDeleting(true);
        await api.match.deleteMatch(id);
        // Refresh the match list after deletion
        fetchMatches();
      } catch (err) {
        alert('The match could not be deleted. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Your matches</h1>
            {!loading && !error && matches.length > 0 && (
              <p>{matches.length === 1 ? '1 match' : `${matches.length} matches`}, newest first.</p>
            )}
          </div>
          <div className="page-head-actions">
            <Link to="/matches/new" className="btn primary">New match</Link>
          </div>
        </div>

        {loading ? (
          <div className="state" role="status"><p>Loading your matches...</p></div>
        ) : error ? (
          <div className="state">
            <h2>Your matches did not load</h2>
            <p>{error}</p>
            <div className="form-actions">
              <button onClick={fetchMatches} className="btn primary">Try again</button>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="card dashed state">
            <h2>No matches yet</h2>
            <p>Create a match, then enter it point by point from the video.</p>
            <div className="form-actions">
              <Link to="/matches/new" className="btn primary">Enter your first match</Link>
            </div>
          </div>
        ) : (
          <ul className="match-cards">
            {matches.map((match) => {
              const result = matchResult(match);
              const player = cleanText(match.player_name);
              return (
                <li key={match.id} className="card match-card">
                  <div className="match-card-head">
                    <h2>{player ? `${player} vs ${match.opponent_name}` : `vs ${match.opponent_name}`}</h2>
                    <span className={`chip small ${result.tone}`}>{result.label}</span>
                  </div>
                  <p className="match-card-meta">
                    {formatDate(match.date)}
                    {cleanText(match.event) && <> · {match.event}</>}
                  </p>
                  {match.notes && <p className="match-card-notes">{match.notes}</p>}
                  <div className="match-card-actions">
                    {match.is_complete ? (
                      <>
                        <Link to={`/matches/${match.id}/analysis`} className="btn primary small">Analysis</Link>
                        <Link to={`/matches/${match.id}/points`} className="btn small">Edit points</Link>
                        <Link to={`/matches/${match.id}`} className="btn small">Tracker</Link>
                      </>
                    ) : (
                      <>
                        <Link to={`/matches/${match.id}`} className="btn primary small">Continue entering points</Link>
                        <Link to={`/matches/${match.id}/analysis`} className="btn small">Analysis</Link>
                        <Link to={`/matches/${match.id}/points`} className="btn small">Edit points</Link>
                      </>
                    )}
                    <button
                      onClick={(e) => handleDeleteMatch(match.id, e)}
                      className="btn danger small match-card-delete"
                      disabled={isDeleting}
                      aria-label={`Delete the match against ${match.opponent_name}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default MatchList;
