import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect happens automatically via auth state change
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TT Analysis</h1>
        <nav>
          <Link to="/">Home</Link>
          {user ? (
            <>
              <Link to="/matches">Matches</Link>
              {isAdmin && <Link to="/admin">Admin</Link>}
              <button onClick={handleSignOut} className="nav-button">Logout</button>
            </>
          ) : (
            <Link to="/auth">Login</Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} TT Analysis</p>
      </footer>
    </div>
  );
};

export default Layout;