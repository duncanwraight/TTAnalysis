import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Layout.css';

const Home = () => {
  const { user, loading } = useAuth();

  return (
    <Layout>
      <div className="home-container">
        <div className="instructions">
          <h3>How to Use This App</h3>
          <ol>
            <li><strong>Record your match</strong> - Film your table tennis match for later analysis</li>
            <li><strong>Create a new match</strong> - Enter opponent details and start tracking</li>
            <li><strong>Watch point by point</strong> - Play back your recording and analyze each point</li>
            <li><strong>Record the winning shot</strong> - Select the shot type that won the point</li>
            <li><strong>Record the other shot</strong> - Choose either:
              <ul>
                <li>The shot <em>before</em> the winner (if opponent didn't respond)</li>
                <li>The shot <em>after</em> the winner (if opponent's return failed)</li>
              </ul>
            </li>
            <li><strong>Analyze your performance</strong> - Review statistics to improve your game</li>
          </ol>
          
          <div className="tip">
            <strong>💡 Tip:</strong> Use this app while watching recordings of your matches for the most accurate analysis.
          </div>
        </div>
        
        {loading ? (
          <div className="loading">Loading...</div>
        ) : user ? (
          <div className="action-buttons">
            <Link to="/matches/new" className="btn primary-btn">
              New Match
            </Link>
            <Link to="/matches" className="btn secondary-btn">
              View Matches
            </Link>
          </div>
        ) : (
          <div className="auth-prompt">
            <p>Please sign in to start tracking your matches.</p>
            <Link to="/auth" className="btn primary-btn">
              Sign In / Register
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;