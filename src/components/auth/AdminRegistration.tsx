import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';

const AdminRegistration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  const handleAdminRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate admin key against environment variable
    const correctAdminKey = import.meta.env.VITE_ADMIN_REGISTRATION_KEY;
    if (adminKey !== correctAdminKey) {
      setError('Invalid admin registration key');
      return;
    }

    setLoading(true);

    try {
      // Register user first
      await signUp(email, password);
      
      // Set admin flag via custom API endpoint using direct fetch
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch('/api/set-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          adminKey
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to set admin status');
      }
      
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <h2>Admin Registration Successful</h2>
        <p>
          Your admin account has been created. A confirmation email has been sent to {email}.
          Please check your email to verify your account.
        </p>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>Admin Registration</h2>
      <form onSubmit={handleAdminRegistration}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="adminKey">Admin Registration Key</label>
          <input
            type="password"
            id="adminKey"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="form-actions">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating Admin Account...' : 'Register as Admin'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminRegistration;