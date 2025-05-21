import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { matchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const NewMatch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    opponent_name: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    initial_server: 'player' as 'player' | 'opponent', // Default to player serving first
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      
      console.log('Creating match with data:', formData);
      
      // Use the API client to create a match in the database
      // Note: user_id is now handled on the server side based on the JWT token
      const newMatch = await matchApi.createMatch({
        opponent_name: formData.opponent_name,
        date: formData.date,
        match_score: '0-0',
        notes: formData.notes,
        initial_server: formData.initial_server
      });
      
      console.log('Match created successfully:', newMatch);
      
      // Navigate to the match tracker with the new match ID
      navigate(`/matches/${newMatch.id}`);
    } catch (error) {
      console.error('Error creating match:', error);
      
      // In a real application, show an error message to the user
      alert('Failed to create match. Please try again.');
      
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="new-match-container">
        <h2>New Match</h2>
        
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
              className="btn secondary-btn" 
              onClick={() => navigate('/matches')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn primary-btn"
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