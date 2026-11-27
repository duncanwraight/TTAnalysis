import { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

type AppFrameProps = {
  children: ReactNode;
  // Lets the tracker use more of a wide screen
  wide?: boolean;
  signedIn: boolean;
  isAdmin?: boolean;
  onSignOut?: () => void;
};

/**
 * The header, main area and footer. It doesn't read the auth context, so the
 * prerender (src/prerender.tsx) can draw the signed-out version of it. Pages
 * use Layout, which fills in the auth props.
 */
const AppFrame = ({ children, wide = false, signedIn, isAdmin = false, onSignOut }: AppFrameProps) => {
  const { pathname } = useLocation();
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');

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
            ) : signedIn ? (
              <>
                <NavLink to="/matches" end>Matches</NavLink>
                <NavLink to="/players">Players</NavLink>
                <NavLink to="/matches/new" className="nav-optional">New match</NavLink>
                {isAdmin && <NavLink to="/admin">Admin</NavLink>}
                <NavLink to="/help">Help</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/help">Help</NavLink>
                <NavLink to="/auth">Sign in</NavLink>
              </>
            )}
            {signedIn && <button type="button" onClick={onSignOut}>Sign out</button>}
          </nav>
        </div>
      </header>
      <main className={`app-main${wide ? ' wide' : ''}`}>
        {children}
      </main>
      <footer className="app-footer">
        <span>TT Analysis</span>
        <Link to="/help">Help</Link>
        <Link to="/help/keyboard-shortcuts">Keyboard shortcuts</Link>
        {import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA && (
          <span>Build {import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}</span>
        )}
      </footer>
    </div>
  );
};

export default AppFrame;
