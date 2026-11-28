import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Turnstile, { TurnstileHandle } from './Turnstile';
import { MIN_PASSWORD_LENGTH } from '../../lib/password';

interface SignupProps {
  onToggleView: () => void; // Toggle between login and signup views
}

const Signup = ({ onToggleView }: SignupProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  // The security check's token; each one works for a single request
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const { signUp } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return;
    setError(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, captchaToken);
      setSignupComplete(true);
    } catch (err) {
      setError((err as Error).message);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  if (signupComplete) {
    return (
      <div className="card auth-card">
        <h2>Check your email</h2>
        <p>
          We've sent a confirmation link to {email}. Open it to finish creating your account.
        </p>
        <Button onClick={onToggleView}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div className="card auth-card">
      <h2>Create an account</h2>
      <form className="form" onSubmit={handleSignup}>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-hint"
            required
          />
          <span id="password-hint" className="field-hint">At least {MIN_PASSWORD_LENGTH} characters</span>
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <Turnstile ref={turnstileRef} onToken={setCaptchaToken} />
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="auth-actions">
          <Button type="submit" className="block" disabled={loading || !captchaToken}>
            {loading ? 'Creating your account...' : 'Create account'}
          </Button>
          <button
            type="button"
            className="link-button"
            onClick={onToggleView}
          >
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </div>
  );
};

export default Signup;