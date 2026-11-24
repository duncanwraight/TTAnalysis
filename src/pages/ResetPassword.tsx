import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import '../styles/components/Auth.css';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Landing page for the password reset email. Supabase signs the user in from
 * the link (detectSessionInUrl), then they choose a new password here.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(prev => prev || !!data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <Layout>
      <div className="page-container auth-page">
        <div className="auth-container">
          <div className="auth-form">
            <h2>Choose a New Password</h2>

            {done ? (
              <div className="success-message">
                <p>Your password has been updated.</p>
                <Button onClick={() => navigate('/matches')}>Go to Matches</Button>
              </div>
            ) : hasSession === false ? (
              <div>
                <div className="error-message">
                  This reset link is invalid or has expired. Request a new one from the login page.
                </div>
                <Button onClick={() => navigate('/auth')}>Back to Login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="new-password">New password</label>
                  <input
                    type="password"
                    id="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="form-actions">
                  <Button type="submit" disabled={saving || hasSession === null}>
                    {saving ? 'Saving...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
