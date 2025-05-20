import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TT Analysis</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/matches">Matches</Link>
          <Link to="/profile">Profile</Link>
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