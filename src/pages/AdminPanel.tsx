import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch users data
  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    const fetchUsers = async () => {
      try {
        // Using the admin API to fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, created_at, is_admin')
          .order('created_at', { ascending: false });
        
        if (usersError) throw usersError;
        
        setUsers(usersData || []);
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [isAdmin, navigate]);
  
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? {...user, is_admin: !currentStatus} : user
      ));
    } catch (err) {
      setError('Failed to update admin status');
    }
  };
  
  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Users</h1>
            <p>Everyone with an account. Admins can edit the shot list and other users' admin access.</p>
          </div>
          <div className="page-head-actions">
            <Link to="/admin/shots" className="btn">Manage shots</Link>
          </div>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}

        {loading ? (
          <div className="state" role="status"><p>Loading users...</p></div>
        ) : (
          <div className="card table-card">
            <table className="data-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Role</th>
                  <th scope="col" className="actions"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <th scope="row">{user.email}</th>
                    <td className="muted">{new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{user.is_admin ? <span className="chip small">Admin</span> : <span className="muted">User</span>}</td>
                    <td className="actions">
                      <button type="button" className="btn small" onClick={() => toggleAdminStatus(user.id, user.is_admin)}>
                        {user.is_admin ? 'Remove admin' : 'Make admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;
