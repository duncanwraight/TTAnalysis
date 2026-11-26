import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  ai_summaries_enabled: boolean;
};

type UsageRow = { user_id: string | null; cost_usd: number | string };

const dollars = (n: number) => `$${n.toFixed(2)}`;

// The budget is checked against the current calendar month in UTC, as the Edge Function does
const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
};

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetSaved, setBudgetSaved] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const load = async () => {
      try {
        const [usersResult, settingsResult, usageResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, created_at, is_admin, ai_summaries_enabled')
            .order('created_at', { ascending: false }),
          supabase.from('ai_settings').select('monthly_budget_usd').single(),
          supabase.from('ai_usage').select('user_id, cost_usd').gte('created_at', monthStart()),
        ]);
        if (usersResult.error) throw usersResult.error;
        if (settingsResult.error) throw settingsResult.error;
        if (usageResult.error) throw usageResult.error;

        setUsers(usersResult.data ?? []);
        setUsage(usageResult.data ?? []);
        const monthly = Number(settingsResult.data.monthly_budget_usd);
        setBudget(monthly);
        setBudgetInput(monthly.toFixed(2));
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin, navigate]);

  const updateProfile = async (userId: string, change: Partial<Pick<UserRow, 'is_admin' | 'ai_summaries_enabled'>>, failure: string) => {
    setError(null);
    const { error: updateError } = await supabase.from('profiles').update(change).eq('id', userId);
    if (updateError) {
      setError(failure);
      return;
    }
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...change } : u)));
  };

  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = Number(budgetInput);
    if (!Number.isFinite(value) || value < 0) {
      setError('The budget must be a number of dollars, 0 or more.');
      return;
    }
    const { error: updateError } = await supabase
      .from('ai_settings')
      .update({ monthly_budget_usd: value })
      .eq('id', true);
    if (updateError) {
      setError('Failed to save the budget');
      return;
    }
    setBudget(value);
    setBudgetInput(value.toFixed(2));
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2000);
  };

  const spent = usage.reduce((sum, row) => sum + Number(row.cost_usd), 0);
  const spentBy = (userId: string) =>
    usage.filter(row => row.user_id === userId).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  const callsBy = (userId: string) => usage.filter(row => row.user_id === userId).length;
  const usedPct = budget ? Math.min(100, Math.round((100 * spent) / budget)) : 100;
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long', timeZone: 'UTC' });

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Users</h1>
            <p>Everyone with an account. Admins can edit the shot list, other users' admin access and who can use AI summaries.</p>
          </div>
          <div className="page-head-actions">
            <Link to="/admin/shots" className="btn">Manage shots</Link>
            <Link to="/admin/styles" className="btn">Manage styles</Link>
          </div>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}

        {loading ? (
          <div className="state" role="status"><p>Loading users...</p></div>
        ) : (
          <>
            <section className="card admin-ai" aria-labelledby="admin-ai">
              <div className="admin-ai-head">
                <div>
                  <h2 id="admin-ai">AI summaries in {monthName}</h2>
                  <p className="muted">
                    {dollars(spent)} of {budget !== null ? dollars(budget) : '-'} used across {usage.length} {usage.length === 1 ? 'summary' : 'summaries'}.
                    {budget !== null && spent >= budget && ' The budget is used up, so no more summaries can be written this month.'}
                  </p>
                </div>
                <form className="admin-ai-budget" onSubmit={saveBudget}>
                  <label htmlFor="admin-budget">Monthly budget ($)</label>
                  <input id="admin-budget" type="number" min="0" step="0.01" inputMode="decimal"
                    value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
                  <button type="submit" className="btn small">{budgetSaved ? 'Saved' : 'Save'}</button>
                </form>
              </div>
              <div className="admin-ai-bar" role="img" aria-label={`${usedPct}% of the monthly budget used`}>
                <div className={usedPct >= 100 ? 'full' : ''} style={{ width: `${usedPct}%` }} />
              </div>
              <p className="admin-ai-note muted">
                Worked out from the tokens each call used, so it can differ slightly from Anthropic's bill. Keep this budget at or below the spend limit on the TT Analysis workspace in the Claude Console, which is the hard stop.
              </p>
            </section>

            <div className="card table-card">
              <table className="data-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Joined</th>
                    <th scope="col">Role</th>
                    <th scope="col">AI summaries</th>
                    <th scope="col" className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <th scope="row">{user.email}</th>
                      <td className="muted">{new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>{user.is_admin ? <span className="chip small">Admin</span> : <span className="muted">User</span>}</td>
                      <td>
                        {user.ai_summaries_enabled ? <span className="chip small">On</span> : <span className="muted">Off</span>}
                        {callsBy(user.id) > 0 && (
                          <span className="muted"> · {callsBy(user.id)} {callsBy(user.id) === 1 ? 'summary' : 'summaries'}, {dollars(spentBy(user.id))}</span>
                        )}
                      </td>
                      <td className="actions">
                        <span className="admin-actions">
                          <button type="button" className="btn small"
                            onClick={() => updateProfile(user.id, { ai_summaries_enabled: !user.ai_summaries_enabled }, 'Failed to change AI summaries')}>
                            {user.ai_summaries_enabled ? 'Turn off AI' : 'Turn on AI'}
                          </button>
                          <button type="button" className="btn small"
                            onClick={() => updateProfile(user.id, { is_admin: !user.is_admin }, 'Failed to update admin status')}>
                            {user.is_admin ? 'Remove admin' : 'Make admin'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;
