// API client for interacting with the database

import { Match, Set, Point } from '../types/database.types';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for making API requests
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const requestId = Math.random().toString(36).substring(2, 10); // Generate unique ID for this request
  try {
    console.log(`[${requestId}] API Request: ${options.method || 'GET'} ${endpoint}`);
    
    // Get the session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error(`[${requestId}] No authentication token available for API request to ${endpoint}`);
      throw new Error('Authentication required. Please log in again.');
    }

    // Set authorization header if token exists
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    console.log(`[${requestId}] Sending request to ${API_URL}${endpoint}`);
    
    if (options.body) {
      console.log(`[${requestId}] Request body:`, options.body);
    }

    // Timeout after 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers,
      signal: controller.signal,
      ...options,
    });
    
    clearTimeout(timeoutId);

    console.log(`[${requestId}] API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      
      try {
        // Try to parse as JSON
        errorData = JSON.parse(errorText);
        console.error(`[${requestId}] API Error:`, errorData);
      } catch (e) {
        // Not JSON, use text
        console.error(`[${requestId}] API Error (raw):`, errorText);
        errorData = { error: errorText };
      }
      
      throw new Error(
        errorData.message || errorData.error || `API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    console.log(`[${requestId}] API Response data:`, data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[${requestId}] API request timeout`);
      throw new Error('Request timed out. Please try again.');
    }
    
    console.error(`[${requestId}] API request error:`, error);
    throw error;
  }
}

// Match API functions
export const matchApi = {
  // Get all matches
  getAllMatches: () => fetchApi<Match[]>('/matches'),

  // Get a match by ID
  getMatchById: (id: string) => fetchApi<Match>(`/matches/${id}`),

  // Get a match with all sets and points
  getFullMatchById: (id: string) => fetchApi<{ match: Match; sets: Set[]; points: Point[] }>(`/matches/${id}/full`),

  // Create a new match
  createMatch: async (match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    console.log('Creating match with data:', match);
    
    // Ensure we have an auth session
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      console.error('No authenticated session found when attempting to create a match');
      throw new Error('You must be logged in to create a match');
    }
    
    return fetchApi<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(match),
    });
  },

  // Update a match
  updateMatch: (id: string, match: Partial<Match>) =>
    fetchApi<Match>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(match),
    }),
    
  // Delete a match
  deleteMatch: (id: string) =>
    fetchApi<{ message: string; id: string }>(`/matches/${id}`, {
      method: 'DELETE',
    }),
};

// Set API functions
export const setApi = {
  // Get all sets for a match
  getSetsByMatchId: (matchId: string) => fetchApi<Set[]>(`/sets?match_id=${matchId}`),

  // Create a new set
  createSet: (set: Omit<Set, 'id' | 'created_at' | 'updated_at'>) =>
    fetchApi<Set>('/sets', {
      method: 'POST',
      body: JSON.stringify(set),
    }),

  // Update a set
  updateSet: (id: string, set: Partial<Set>) =>
    fetchApi<Set>(`/sets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(set),
    }),
};

// Point API functions
export const pointApi = {
  // Get all points for a set
  getPointsBySetId: (setId: string) => fetchApi<Point[]>(`/points?set_id=${setId}`),

  // Create a new point
  createPoint: (point: Omit<Point, 'id' | 'created_at'>) =>
    fetchApi<Point>('/points', {
      method: 'POST',
      body: JSON.stringify(point),
    }),

  // Delete a point
  deletePoint: (id: string) =>
    fetchApi<{ message: string }>(`/points/${id}`, {
      method: 'DELETE',
    }),
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
};