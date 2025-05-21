import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Layout.css';

const Home = () => {
  const { user, loading } = useAuth();

  return (
    <Layout>
      <div className="home-container">
        <h2>Welcome to Table Tennis Analysis</h2>
        <p>Track and analyze your table tennis matches to improve your game.</p>
        
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