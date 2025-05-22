/**
 * API client for interacting with the database
 * Uses direct fetch approach for reliable network requests
 * Accepts session token to ensure consistent authentication
 */

import { Match, Set, Point } from '../types/database.types';
import { supabase } from './supabase';

// Base API URL - relative URL for proxy
const API_URL = '/api';

/**
 * Direct fetch implementation for all API requests
 * Accepts an optional token parameter to use instead of fetching from Supabase
 */
async function directFetch<T>(endpoint: string, options: RequestInit = {}, token?: string): Promise<T> {
  // Use provided token - we don't try to get it from Supabase as that seems to fail
  let authToken = token;
  
  
  if (!authToken) {
    console.error('directFetch: No authentication token provided for API call');
    throw new Error('Authentication required. No token provided for API call.');
  }

  // Create headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    ...options.headers,
  };

  // Make the request - simplified with no AbortController or timeout
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...options,
  });

  // Handle error responses
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  // Parse JSON response
  const responseData = await response.json();
  return responseData;
}

/**
 * Test API connectivity
 */
export async function testApiConnection() {
  try {
    const response = await fetch(`${API_URL}`);
    if (!response.ok) {
      return { success: false, error: `API server returned ${response.status} ${response.statusText}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Match API functions
 */
export const matchApi = {
  // Get all matches
  getAllMatches: (token?: string) => directFetch<Match[]>('/matches', {}, token),

  // Get a match by ID
  getMatchById: (id: string, token?: string) => directFetch<Match>(`/matches/${id}`, {}, token),

  // Get a match with all sets and points
  getFullMatchById: (id: string, token?: string) => 
    directFetch<{ match: Match; sets: Set[]; points: Point[] }>(`/matches/${id}/full`, {}, token),

  // Create a new match
  createMatch: (
    match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>, 
    token?: string
  ): Promise<Match> => {
    return directFetch<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(match),
    }, token);
  },

  // Update a match
  updateMatch: (id: string, match: Partial<Match>, token?: string) =>
    directFetch<Match>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(match),
    }, token),
    
  // Delete a match
  deleteMatch: (id: string, token?: string) =>
    directFetch<{ message: string; id: string }>(`/matches/${id}`, {
      method: 'DELETE',
    }, token),
};

/**
 * Set API functions
 */
export const setApi = {
  // Get all sets for a match
  getSetsByMatchId: (matchId: string, token?: string) => 
    directFetch<Set[]>(`/sets?match_id=${matchId}`, {}, token),

  // Create a new set
  createSet: (set: Omit<Set, 'id' | 'created_at' | 'updated_at'>, token?: string) =>
    directFetch<Set>('/sets', {
      method: 'POST',
      body: JSON.stringify(set),
    }, token),

  // Update a set
  updateSet: (id: string, set: Partial<Set>, token?: string) =>
    directFetch<Set>(`/sets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(set),
    }, token),
};

/**
 * Point API functions
 */
export const pointApi = {
  // Get all points for a set
  getPointsBySetId: (setId: string, token?: string) => 
    directFetch<Point[]>(`/points?set_id=${setId}`, {}, token),

  // Create a new point
  createPoint: (point: Omit<Point, 'id' | 'created_at'>, token?: string) => {
    return directFetch<Point>('/points', {
      method: 'POST',
      body: JSON.stringify(point),
    }, token);
  },

  // Delete a point
  deletePoint: (id: string, token?: string) =>
    directFetch<{ message: string }>(`/points/${id}`, {
      method: 'DELETE',
    }, token),
};

/**
 * Shot API functions
 */
export const shotApi = {
  // Get all shot categories
  getCategories: (token?: string) => directFetch<any[]>('/shots/categories', {}, token),
  
  // Get all shots
  getShots: (token?: string) => directFetch<any[]>('/shots', {}, token),
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi,
};