import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const [showContent, setShowContent] = useState(!loading && !!user);
  
  // Debug log
  
  // Force exit from loading state after 3 seconds
  useEffect(() => {
    // Skip timer if already loaded
    if (!loading) {
      if (user) {
        setShowContent(true);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      // If we're still loading after timeout, we'll make a decision based on current state
      if (user) {
        setShowContent(true);
      } else {
        // If still no user after timeout, redirect to auth
        setShowContent(false);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [loading, user]);

  // When not in loading state, handle redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // When not in loading state, handle redirect if not admin but admin required
  if (!loading && requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Show content if either:
  // 1. We're not loading and user is authenticated
  // 2. We've forced exit from loading state after timeout and user is authenticated
  if (showContent) {
    return <>{children}</>;
  }

  // Otherwise show loading
  return (
    <div className="loading-container">
      <p>Loading...</p>
    </div>
  );
};

export default ProtectedRoute;