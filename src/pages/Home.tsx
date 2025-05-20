import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const Home = () => {
  return (
    <Layout>
      <div className="home-container">
        <h2>Welcome to Table Tennis Analysis</h2>
        <p>Track and analyze your table tennis matches to improve your game.</p>
        
        <div className="action-buttons">
          <Link to="/matches/new" className="btn primary-btn">
            New Match
          </Link>
          <Link to="/matches" className="btn secondary-btn">
            View Matches
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Home;