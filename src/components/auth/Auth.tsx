import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

const Auth = () => {
  const [view, setView] = useState<'login' | 'signup'>('login');

  const toggleView = (newView: 'login' | 'signup') => {
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
    </div>
  );
};

export default Auth;