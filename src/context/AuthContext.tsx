import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Force exit from loading state after 5 seconds max
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('AuthContext: Force exiting loading state after timeout');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Get session from storage
    const getSession = async () => {
      setLoading(true);
      try {
        console.log('AuthContext: Checking for existing session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (data?.session) {
          console.log('Session found:', data.session.user.email);
          setSession(data.session);
          setUser(data.session.user);
          
          try {
            // Check if user is admin
            if (data.session.user.email) {
              const { data: userData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', data.session.user.id)
                .single();
              
              if (profileError) {
                console.error('Error fetching profile:', profileError);
                // Continue even if profile fetch fails
              } else {
                setIsAdmin(userData?.is_admin || false);
                console.log('Admin status:', userData?.is_admin);
              }
            }
          } catch (profileErr) {
            console.error('Error in profile fetch:', profileErr);
            // Continue even if profile fetch fails
          }
        } else {
          console.log('No session found');
        }
      } catch (err) {
        console.error('Unexpected error in getSession:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            // Check admin status on auth change
            const { data: userData, error: profileError } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile on auth change:', profileError);
            } else {
              setIsAdmin(userData?.is_admin || false);
              console.log('Admin status updated:', userData?.is_admin);
            }
          } catch (err) {
            console.error('Error checking admin status:', err);
          }
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    
    console.log('Sign in successful:', data?.user?.email);
    return data;
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    console.log('Attempting to sign up:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }
    
    console.log('Sign up successful:', data?.user?.email);
    return data;
  };

  // Sign out
  const signOut = async () => {
    console.log('Signing out');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    
    console.log('Sign out successful');
  };

  // Reset password
  const resetPassword = async (email: string) => {
    console.log('Sending password reset to:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Reset password error:', error);
      throw error;
    }
    
    console.log('Password reset email sent to:', email);
  };

  // Provide auth context values to children
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}