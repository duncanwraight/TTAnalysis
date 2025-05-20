import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const NewMatch = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    opponent_name: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    notes: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In stage 3, this will save to Supabase
    // For now, we'll just navigate to a mock match page
    console.log('Match created:', formData);
    
    // Generate a mock match ID
    const mockId = `match-${Date.now()}`;
    
    // Navigate to the match tracker with the mock ID
    navigate(`/matches/${mockId}`);
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
            >
              <option value={1}>1 Set</option>
              <option value={3}>3 Sets</option>
              <option value={5}>5 Sets</option>
              <option value={7}>7 Sets</option>
            </select>
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
            />
          </div>
          
          <div className="form-buttons">
            <button type="button" className="btn secondary-btn" onClick={() => navigate('/matches')}>
              Cancel
            </button>
            <button type="submit" className="btn primary-btn">
              Start Match
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewMatch;