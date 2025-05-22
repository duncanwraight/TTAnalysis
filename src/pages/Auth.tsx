import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthComponent from '../components/auth/Auth';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Auth.css';
import '../styles/components/Layout.css';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showLoginForm, setShowLoginForm] = useState(!loading);


  // Redirect to home if already logged in
  useEffect(() => {
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
      <div className="page-container auth-page">
        <div className="auth-header">
          <h1>Table Tennis Analysis</h1>
          <p>Sign in to track and analyze your matches</p>
        </div>
        
        {loading && !showLoginForm ? (
          <div className="loading-container">
            <p>Loading authentication...</p>
          </div>
        ) : (
          <AuthComponent />
        )}
      </div>
    </Layout>
  );
};

export default Auth;