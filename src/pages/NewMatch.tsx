import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { matchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../styles/components/NewMatch.css';
import ApiDebug from '../components/ApiDebug';
import * as directApi from '../utils/directApi';
import * as xhr from '../utils/xhr';
import * as form from '../utils/form';

const NewMatch = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const [formData, setFormData] = useState({
    opponent_name: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    initial_server: 'player' as 'player' | 'opponent', // Default to player serving first
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add global error handler to catch any unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('UNHANDLED PROMISE REJECTION:', event.reason);
      // This ensures we see any unhandled rejections
      if (isSubmitting) {
        setIsSubmitting(false);
        setError('An unexpected error occurred. Check the console for details.');
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log('Creating match with data:', formData);
      console.log('User authentication status:', !!user, user?.id);
      console.log('Session available:', !!session, session?.access_token ? 'token available' : 'no token');
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('Authentication error: You must be logged in to create a match');
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
      
      console.log('Using form submission for match creation as a last resort...');
      
      // Form submission approach with callbacks
      form.createMatch(
        matchData,
        // Success callback
        (newMatch) => {
          console.log('Form Match creation completed successfully');
          
          if (!newMatch?.id) {
            console.error('Match was created but no ID was returned!', newMatch);
            setError('Match was created but no ID was returned');
            setIsSubmitting(false);
            return;
          }
          
          console.log('Match created successfully, ID:', newMatch.id);
          console.log('Navigating to:', `/matches/${newMatch.id}`);
          
          // Navigate to the match tracker with the new match ID
          navigate(`/matches/${newMatch.id}`);
        },
        // Error callback
        (apiError) => {
          console.error('Form error during match creation:', apiError);
          setError(apiError.message || 'Error creating match');
          setIsSubmitting(false);
        }
      );
      
      // Don't set isSubmitting to false here - do it in the callbacks
      return; // Early return to prevent the finally block from executing
    } catch (err) {
      console.error('Error creating match:', err);
      
      // Show more detailed error message
      let errorMessage = 'Failed to create match. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      
      if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('auth')) {
        errorMessage = 'Authentication error. Please log out and log in again.';
      }
      
      // Special handling for timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        errorMessage = 'Request timed out. Please check if the API server is running and try again.';
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
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* API debugging tool - remove this in production */}
        <ApiDebug />
        
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