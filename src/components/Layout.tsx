import { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type LayoutProps = {
  children: ReactNode;
  // Lets the tracker use more of a wide screen
  wide?: boolean;
};

const Layout = ({ children, wide = false }: LayoutProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');

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
    <div className="app">
      <header className={`app-header${isAdminArea ? ' admin' : ''}`}>
        <div className="app-header-inner">
          <Link to={isAdminArea ? '/admin' : '/'} className="app-brand" aria-label="TT Analysis home">
            <span className="app-brand-mark" aria-hidden="true" />
            <span className="app-brand-text">TT Analysis</span>
            {isAdminArea && <span className="admin-tag">Admin</span>}
          </Link>
          <nav className="app-nav" aria-label="Main">
            {isAdminArea ? (
              <>
                <NavLink to="/admin" end>Users</NavLink>
                <NavLink to="/admin/shots">Shots</NavLink>
                <NavLink to="/admin/styles">Styles</NavLink>
                <Link to="/matches">Back to app</Link>
              </>
            ) : user ? (
              <>
                <NavLink to="/matches" end>Matches</NavLink>
                <NavLink to="/players">Players</NavLink>
                <NavLink to="/matches/new" className="nav-optional">New match</NavLink>
                {isAdmin && <NavLink to="/admin">Admin</NavLink>}
              </>
            ) : (
              <NavLink to="/auth">Sign in</NavLink>
            )}
            {user && <button type="button" onClick={handleSignOut}>Sign out</button>}
          </nav>
        </div>
      </header>
      <main className={`app-main${wide ? ' wide' : ''}`}>
        {children}
      </main>
      <footer className="app-footer">
        TT Analysis
        {import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA && (
          <> · build {import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}</>
        )}
      </footer>
    </div>
  );
};

export default Layout;
