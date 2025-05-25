import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import '../styles/components/NewMatch.css';

/**
 * NewMatch component for creating a new table tennis match
 */
const NewMatch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  
  const [formData, setFormData] = useState({
    opponent_name: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    initial_server: 'player' as 'player' | 'opponent', // Default to player serving first
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        window.location.href = '/auth';
        return;
      }
      
      // Validate required fields
      if (!formData.opponent_name.trim()) {
        throw new Error('Opponent name is required');
      }
      
      if (!formData.date) {
        throw new Error('Match date is required');
      }
      
      // Create match data
      const matchData = {
        opponent_name: formData.opponent_name.trim(),
        date: formData.date,
        match_score: '0-0',
        notes: formData.notes,
        initial_server: formData.initial_server
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
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="player_serves"
                  name="initial_server"
                  value="player"
                  checked={formData.initial_server === 'player'}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label htmlFor="player_serves">You</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="opponent_serves"
                  name="initial_server"
                  value="opponent"
                  checked={formData.initial_server === 'opponent'}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label htmlFor="opponent_serves">Opponent</label>
              </div>
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