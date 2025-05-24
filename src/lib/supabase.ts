import { createClient } from '@supabase/supabase-js'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  }
)

// Force session invalidation on new deployments
const currentVersion = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'dev';
const storedVersion = localStorage.getItem('app_version');

if (storedVersion && storedVersion !== currentVersion) {
  // Clear all auth-related localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  // Clear session storage as well
  sessionStorage.clear();
}
localStorage.setItem('app_version', currentVersion);