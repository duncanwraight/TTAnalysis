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

  /* Authentication Loading Management */
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
    /* Session Management */
    const getSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (data?.session) {
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
              }
            }
          } catch (profileErr) {
            console.error('Error in profile fetch:', profileErr);
            // Continue even if profile fetch fails
          }
        } else {
        }
      } catch (err) {
        console.error('Unexpected error in getSession:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    /* Auth State Change Listener */
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  /* Authentication Methods */
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    
    return data;
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }
    
    return data;
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    
  };

  // Reset password
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Reset password error:', error);
      throw error;
    }
    
  };

  /* Context Provider */
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