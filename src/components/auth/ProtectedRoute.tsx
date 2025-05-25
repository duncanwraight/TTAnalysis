import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Reduce timeout to 1.5 seconds for faster responsiveness
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Immediate redirect if not authenticated and not loading
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Immediate redirect if loading has timed out and no user
  if (loadingTimeout && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Immediate redirect if not admin but admin required
  if (!loading && user && requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Show content if user exists and loading is complete (or if we have a user despite loading)
  if (user && (!loading || !loadingTimeout)) {
    return <>{children}</>;
  }

  // Show loading only while actually loading and within timeout
  if (loading && !loadingTimeout) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Fallback redirect to auth
  return <Navigate to="/auth" replace />;
};

export default ProtectedRoute;