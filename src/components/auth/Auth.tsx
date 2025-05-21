import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import AdminRegistration from './AdminRegistration';

const Auth = () => {
  const [view, setView] = useState<'login' | 'signup' | 'admin'>('login');

  const toggleView = (newView: 'login' | 'signup' | 'admin') => {
    setView(newView);
  };

  return (
    <div className="auth-container">
      {view === 'login' && (
        <Login onToggleView={() => toggleView('signup')} />
      )}
      
      {view === 'signup' && (
        <Signup onToggleView={() => toggleView('login')} />
      )}
      
      {view === 'admin' && (
        <AdminRegistration />
      )}
      
      {view !== 'admin' && (
        <div className="auth-footer">
          <button 
            className="link-button"
            onClick={() => toggleView('admin')}
          >
            Admin Registration
          </button>
        </div>
      )}
      
      {view === 'admin' && (
        <div className="auth-footer">
          <button 
            className="link-button"
            onClick={() => toggleView('login')}
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Auth;