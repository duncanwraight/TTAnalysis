import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onToggleView: () => void; // Toggle between login and signup views
}

const Login = ({ onToggleView }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const { signIn, resetPassword } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (resetMode) {
    return (
      <div className="card auth-card">
        <h2>Reset your password</h2>
        <p className="muted">We'll email you a link to choose a new one.</p>
        {resetSent ? (
          <div className="notice success" role="status">
            <p>If there's an account for {email}, a reset link is on its way. Check your inbox.</p>
            <Button onClick={() => setResetMode(false)}>Back to sign in</Button>
          </div>
        ) : (
          <form className="form" onSubmit={handleResetPassword}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                autoComplete="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <div className="notice error" role="alert">{error}</div>}
            <div className="auth-actions">
              <Button type="submit" className="block" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <button
                type="button"
                className="link-button"
                onClick={() => setResetMode(false)}
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="card auth-card">
      <h2>Sign in</h2>
      <form className="form" onSubmit={handleLogin}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="auth-actions">
          <Button type="submit" className="block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="link-button"
            onClick={() => setResetMode(true)}
          >
            Forgot your password?
          </button>
          <button
            type="button"
            className="link-button"
            onClick={onToggleView}
          >
            New here? Create an account
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;