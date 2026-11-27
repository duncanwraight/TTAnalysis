import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import AppFrame from './AppFrame';

type LayoutProps = {
  children: ReactNode;
  // Lets the tracker use more of a wide screen
  wide?: boolean;
};

const Layout = ({ children, wide = false }: LayoutProps) => {
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
    <AppFrame wide={wide} signedIn={!!user} isAdmin={isAdmin} onSignOut={handleSignOut}>
      {children}
    </AppFrame>
  );
};

export default Layout;
