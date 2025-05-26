/**
 * API client hook for interacting with the database
 * Uses Supabase client directly
 */

import api from './api';

/**
 * React hook providing API access
 */
export function useApi() {
  return api;
}