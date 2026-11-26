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
      // Needed for password reset and email confirmation links
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
)

/**
 * Client for viewing a shared match. RLS only grants read access to a match
 * whose share_token matches the x-share-token header. It never signs in, so
 * it doesn't touch the main client's session.
 */
export const createSharedClient = (shareToken: string) =>
  createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: 'sb-shared-view'
      },
      global: {
        headers: { 'x-share-token': shareToken }
      }
    }
  );

// Every deploy used to sign everyone out, keyed on this. It's gone, so tidy
// up the key it left behind.
try {
  localStorage.removeItem('app_version');
} catch {
  // Storage blocked; nothing to tidy
}