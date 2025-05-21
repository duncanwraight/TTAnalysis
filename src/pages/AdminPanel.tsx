import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
        console.error('Error fetching users:', err);
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
      console.error('Error updating admin status:', err);
      setError('Failed to update admin status');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading user data...</div>;
  }
  
  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="users-management">
        <h2>Users Management</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Created At</th>
              <th>Admin Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>{user.is_admin ? 'Admin' : 'User'}</td>
                <td>
                  <Button 
                    onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;