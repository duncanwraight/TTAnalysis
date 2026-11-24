import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { MAX_EVENT, MAX_PLAYER_NAME, MAX_VIDEO_URL, cleanText, playerLabel, validateDetails } from '../lib/matchDetails';
import '../styles/components/NewMatch.css';

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
        throw new Error('Authentication error: You must be logged in to create a match');
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
        errorMessage = 'Authentication error. Please log out and log in again.';
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="new-match-container">
        <h2>New Match</h2>
        
        {!user && (
          <div className="error-message">
            You must be logged in to create a match. Please <a href="/auth">sign in</a> first.
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="match-form">
          <div className="form-group">
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
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', marginTop: '0.5rem', fontWeight: 400, minHeight: '44px', textAlign: 'left' }}>
                <input
                  type="checkbox"
                  style={{ width: '1.2rem', height: '1.2rem', flex: 'none', margin: 0 }}
                  checked={saveAsMyName}
                  onChange={e => setSaveAsMyName(e.target.checked)}
                  disabled={isSubmitting}
                />
                This is me: use it as my name on new matches
              </label>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="opponent_name">Opponent Name</label>
            <input
              type="text"
              id="opponent_name"
              name="opponent_name"
              value={formData.opponent_name}
              onChange={handleChange}
              required
              placeholder="Enter opponent's name"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Match Date</label>
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
          
          <div className="form-group">
            <label htmlFor="event">Event <span style={{ fontWeight: 400 }}>(optional)</span></label>
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

          <div className="form-group">
            <label htmlFor="video_url">Video link <span style={{ fontWeight: 400 }}>(optional)</span></label>
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

          <div className="form-group">
            <label htmlFor="best_of">Best of</label>
            <select
              id="best_of"
              name="best_of"
              value={formData.best_of}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            >
              <option value={1}>1 Set</option>
              <option value={3}>3 Sets</option>
              <option value={5}>5 Sets</option>
              <option value={7}>7 Sets</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="initial_server">First Server</label>
            <div className="server-button-group">
              <button
                type="button"
                className={`server-button ${formData.initial_server === 'player' ? 'selected' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, initial_server: 'player' }))}
                disabled={isSubmitting}
              >
                {playerLabel(formData.player_name, displayName ?? (saveAsMyName ? formData.player_name : null))}
              </button>
              <button
                type="button"
                className={`server-button ${formData.initial_server === 'opponent' ? 'selected' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, initial_server: 'opponent' }))}
                disabled={isSubmitting}
              >
                Opponent
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any notes about the match..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-buttons">
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={() => navigate('/matches')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Start Match'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewMatch;