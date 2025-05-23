import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const AdminRegistration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
    return data;
  };

  const handleAdminRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Register user first
      const { user } = await signUp(email, password);
      
      if (!user) {
        throw new Error('Failed to create user account');
      }

      // Set admin flag in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
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
    <form className="auth-form" onSubmit={handleAdminRegistration}>
      <h2>Admin Registration</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="adminKey">Admin Key</label>
        <input
          id="adminKey"
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register as Admin'}
      </button>
    </form>
  );
};

export default AdminRegistration;