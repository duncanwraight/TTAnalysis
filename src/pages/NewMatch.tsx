import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { MAX_EVENT, MAX_PLAYER_NAME, MAX_VIDEO_URL, cleanText, playerLabel, validateDetails } from '../lib/matchDetails';

/**
 * NewMatch component for creating a new table tennis match
 */
const NewMatch = () => {
  const navigate = useNavigate();
  const { user, displayName, saveDisplayName } = useAuth();
  const api = useApi();
  
  const [formData, setFormData] = useState({
    player_name: displayName ?? '',
    opponent_name: '',
    event: '',
    video_url: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    initial_server: 'player' as 'player' | 'opponent', // Default to player serving first
    notes: ''
  });
  
  // Offered when the account has no name yet, so the next match prefills it
  const [saveAsMyName, setSaveAsMyName] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The name can arrive after the first render
  useEffect(() => {
    if (displayName) setFormData(prev => (prev.player_name ? prev : { ...prev, player_name: displayName }));
  }, [displayName]);
  const [error, setError] = useState<string | null>(null);
  
  // Error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = () => {
      if (isSubmitting) {
        setIsSubmitting(false);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isSubmitting]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle form submission to create a new match
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('You need to be signed in to create a match');
      }
      
      const problem = validateDetails(formData);
      if (problem) throw new Error(problem);

      const playerName = cleanText(formData.player_name);
      if (!displayName && saveAsMyName && playerName) {
        // Not worth failing the match over
        await saveDisplayName(playerName).catch(err => console.error('Failed to save your name:', err));
      }

      // Create match data
      const matchData = {
        opponent_name: formData.opponent_name.trim(),
        player_name: playerName,
        event: cleanText(formData.event),
        video_url: cleanText(formData.video_url),
        date: formData.date,
        match_score: '0-0',
        notes: formData.notes,
        initial_server: formData.initial_server,
        // <select> values arrive as strings
        best_of: Number(formData.best_of)
      };
      
      // Send API request to create match using our API hook
      // Pass user ID from context to avoid hanging auth call
      const newMatch = await api.match.createMatch(matchData, user.id);
      
      if (!newMatch.id) {
        throw new Error('No match ID returned');
      }
      
      // Navigate to the match tracker with the new match ID
      navigate(`/matches/${newMatch.id}`);
    } catch (err) {
      // Handle error cases
      let errorMessage = 'Failed to create match. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('auth')) {
        errorMessage = 'Your sign-in has expired. Sign out and sign in again.';
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const serverButtonLabel = playerLabel(formData.player_name, displayName ?? (saveAsMyName ? formData.player_name : null));

  return (
    <Layout>
      <div className="page narrow">
        <div className="page-head">
          <div>
            <h1>New match</h1>
            <p>Check best of and first server carefully. They can't be changed once you start.</p>
          </div>
        </div>

        {!user && (
          <div className="notice error" role="alert">
            You need to be signed in to create a match. <a href="/auth">Sign in</a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card form">
          <div className="fields">
            <div className="field">
              <label htmlFor="player_name">Player</label>
              <input
                type="text"
                id="player_name"
                name="player_name"
                value={formData.player_name}
                onChange={handleChange}
                maxLength={MAX_PLAYER_NAME}
                placeholder="Your name, or a friend's"
                autoComplete="off"
                disabled={isSubmitting}
              />
              {!displayName && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={saveAsMyName}
                    onChange={e => setSaveAsMyName(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  This is me. Fill it in on new matches.
                </label>
              )}
            </div>

            <div className="field">
              <label htmlFor="opponent_name">Opponent</label>
              <input
                type="text"
                id="opponent_name"
                name="opponent_name"
                value={formData.opponent_name}
                onChange={handleChange}
                required
                autoComplete="off"
                placeholder="Their name"
                disabled={isSubmitting}
              />
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="field">
              <label htmlFor="event">Event <span className="optional">(optional)</span></label>
              <input
                type="text"
                id="event"
                name="event"
                value={formData.event}
                onChange={handleChange}
                maxLength={MAX_EVENT}
                placeholder="e.g. Winter 2026/27 league"
                disabled={isSubmitting}
              />
            </div>

            <div className="field wide">
              <span id="best_of_label">Best of</span>
              <div className="segmented" role="group" aria-labelledby="best_of_label">
                {[1, 3, 5, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={Number(formData.best_of) === n}
                    onClick={() => setFormData(prev => ({ ...prev, best_of: n }))}
                    disabled={isSubmitting}
                  >
                    {n === 1 ? '1 set' : `${n} sets`}
                  </button>
                ))}
              </div>
            </div>

            <div className="field wide">
              <span id="initial_server_label">First server</span>
              <div className="segmented" role="group" aria-labelledby="initial_server_label">
                <button
                  type="button"
                  aria-pressed={formData.initial_server === 'player'}
                  onClick={() => setFormData(prev => ({ ...prev, initial_server: 'player' }))}
                  disabled={isSubmitting}
                >
                  {serverButtonLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={formData.initial_server === 'opponent'}
                  onClick={() => setFormData(prev => ({ ...prev, initial_server: 'opponent' }))}
                  disabled={isSubmitting}
                >
                  {cleanText(formData.opponent_name) || 'Opponent'}
                </button>
              </div>
            </div>

            <div className="field wide">
              <label htmlFor="video_url">Video link <span className="optional">(optional)</span></label>
              <input
                type="url"
                id="video_url"
                name="video_url"
                value={formData.video_url}
                onChange={handleChange}
                maxLength={MAX_VIDEO_URL}
                placeholder="https://"
                disabled={isSubmitting}
              />
            </div>

            <div className="field wide">
              <label htmlFor="notes">Notes <span className="optional">(optional)</span></label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}

          <div className="form-actions end">
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/matches')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Start entering points'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewMatch;
