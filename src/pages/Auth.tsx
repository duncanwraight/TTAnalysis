import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthComponent from '../components/auth/Auth';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showLoginForm, setShowLoginForm] = useState(!loading);


  // Handle auth state and manual logout
  useEffect(() => {
    // Check if we have a manual logout flag
    const manualLogout = sessionStorage.getItem('manual_logout');
    
    if (manualLogout === 'true') {
      // Clear the flag so it doesn't affect future navigation
      sessionStorage.removeItem('manual_logout');
      
      // Extra safety: clear all Supabase-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      return;
    }
    
    // Normal auto-redirect behavior
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Force-exit loading state after 3 seconds to prevent endless spinner
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setShowLoginForm(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    } else {
      setShowLoginForm(true);
    }
  }, [loading]);

  return (
    <Layout>
      <div className="page tight">
        {loading && !showLoginForm ? (
          <div className="state" role="status">
            <p>Checking whether you're signed in...</p>
          </div>
        ) : (
          <AuthComponent />
        )}
      </div>
    </Layout>
  );
};

export default Auth;