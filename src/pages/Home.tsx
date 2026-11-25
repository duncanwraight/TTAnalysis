import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasStoredSession } from '../lib/storedSession';
import HomeBrochure from './HomeBrochure';

/**
 * Signed-out visitors get the brochure, which is also prerendered into
 * index.html. Signed-in users go straight to their matches.
 */
const Home = () => {
  const { user, loading } = useAuth();

  // While the session loads, keep showing the prerendered brochure unless a
  // stored session means this is probably a signed-in user.
  if (loading) return hasStoredSession() ? null : <HomeBrochure />;
  if (user) return <Navigate to="/matches" replace />;
  return <HomeBrochure />;
};

export default Home;
