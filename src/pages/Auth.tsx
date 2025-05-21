import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthComponent from '../components/auth/Auth';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Auth.css';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container auth-page">
      <div className="auth-header">
        <h1>Table Tennis Analysis</h1>
        <p>Sign in to track and analyze your matches</p>
      </div>
      <AuthComponent />
    </div>
  );
};

export default Auth;