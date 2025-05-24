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
      // Clear ALL Supabase-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Set flag to prevent auto-redirect from Auth page
      sessionStorage.setItem('manual_logout', 'true');
      
      // Call signOut from AuthContext
      try {
        await signOut();
      } catch (signOutError) {
        // Continue with redirect even if signOut fails
      }
      
      // Force a complete reload to /auth with cache clearing
      window.location.href = '/auth?t=' + new Date().getTime();
    } catch (error) {
      // Force clear ALL localStorage as a fallback
      localStorage.clear();
      
      // Set flag to prevent auto-redirect
      sessionStorage.setItem('manual_logout', 'true');
      
      // Redirect anyway
      window.location.href = '/auth?t=' + new Date().getTime();
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