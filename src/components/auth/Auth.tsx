import { useState } from 'react';
import { useSearchParams } from 'react-router';
import Login from './Login';
import Signup from './Signup';

const Auth = () => {
  // The homepage's sign-up buttons link to /auth?mode=signup
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );

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