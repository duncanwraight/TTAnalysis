import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // captchaToken comes from the Turnstile widget on the form; Supabase checks it
  signIn: (email: string, password: string, captchaToken: string) => Promise<void>;
  signUp: (email: string, password: string, captchaToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken: string) => Promise<void>;
  isAdmin: boolean;
  // True until the admin status for the current user has been looked up
  adminLoading: boolean;
  // Set per user by an admin; lets the user generate AI match summaries
  aiSummariesEnabled: boolean;
  // The user's own name, used as the default player on new matches
  displayName: string | null;
  saveDisplayName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiSummariesEnabled, setAiSummariesEnabled] = useState(false);
  // The user whose admin status isAdmin reflects
  const [adminCheckedFor, setAdminCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user) {
        setIsAdmin(false);
        setAiSummariesEnabled(false);
        return;
      }

      try {
        // Check if user has a profile and is admin
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin, ai_summaries_enabled')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data?.is_admin || false);
        setAiSummariesEnabled(data?.ai_summaries_enabled || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminCheckedFor(session.user.id);
      }
    };

    checkAdminStatus();
  }, [session?.user]);

  const signIn = async (email: string, password: string, captchaToken: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, captchaToken: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { captchaToken } });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string, captchaToken: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });
    if (error) throw error;
  };

  // Kept in the user's own auth metadata, which each user can edit for
  // themselves without touching the locked-down profiles table
  const saveDisplayName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    if (error) throw error;
  };
  const metadataName = session?.user?.user_metadata?.display_name;

  const value = {
    user: session?.user ?? null,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin,
    aiSummariesEnabled,
    adminLoading: !!session?.user && adminCheckedFor !== session.user.id,
    displayName: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null,
    saveDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}