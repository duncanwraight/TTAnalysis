/**
 * API client hook for interacting with the database
 * Uses Supabase client directly with auth error handling
 */

import { useAuth } from '../context/AuthContext';
import api from './api';

/**
 * React hook providing API access with auth error handling
 */
export function useApi() {
  const { handleAuthError } = useAuth();

  const wrapApiMethod = (method: (...args: unknown[]) => Promise<unknown>) => {
    return async (...args: unknown[]) => {
      try {
        return await method(...args);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    };
  };

  const wrapApiObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const wrapped: Record<string, unknown> = {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'function') {
        wrapped[key] = wrapApiMethod(obj[key] as (...args: unknown[]) => Promise<unknown>);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        wrapped[key] = wrapApiObject(obj[key] as Record<string, unknown>);
      } else {
        wrapped[key] = obj[key];
      }
    }
    
    return wrapped;
  };

  return wrapApiObject(api as Record<string, unknown>) as typeof api;
}