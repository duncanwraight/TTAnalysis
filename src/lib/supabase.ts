import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log environment variables for debugging

// Check for proper URL format
if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('http')) {
  console.error('Invalid or missing Supabase URL:', supabaseUrl);
  console.error('Make sure VITE_SUPABASE_URL is set in your .env file and starts with http:// or https://');
}

// Check for proper API key format
if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length < 10) {
  console.error('Invalid or missing Supabase Anon Key');
  console.error('Make sure VITE_SUPABASE_ANON_KEY is set in your .env file');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321', // Default for local Supabase
  supabaseAnonKey || 'missing-key'      // Fallback to prevent app crash
);