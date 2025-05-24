import { createClient } from '@supabase/supabase-js'

  commitSha: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
  commitMessage: import.meta.env.VITE_VERCEL_GIT_COMMIT_MESSAGE,
  commitAuthor: import.meta.env.VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME,
  branch: import.meta.env.VITE_VERCEL_GIT_COMMIT_REF,
  repo: import.meta.env.VITE_VERCEL_GIT_REPO_SLUG,
  deploymentUrl: import.meta.env.VITE_VERCEL_URL,
  buildTime: new Date().toISOString()
});
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  url: import.meta.env.VITE_SUPABASE_URL,
  keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length
});

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  const errorMsg = 'Missing Supabase environment variables';
  console.error('❌ [Supabase]', errorMsg, {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : undefined
  });
  throw new Error(errorMsg);
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

// Test the connection
(async () => {
  try {
    const result = await supabase.from('matches').select('count').limit(1);
  } catch (err: unknown) {
    console.error('❌ [Supabase] Connection test failed:', err);
  }
})();