/**
 * API client hook for interacting with the database
 * Automatically handles authentication token from the user session
 */

import { Match, Set, Point } from '../types/database.types';
import { useAuth } from '../context/AuthContext';

// Base API URL - relative URL for proxy
const API_URL = '/api';

/**
 * React hook providing API access with automatic token handling
 */
export function useApi() {
  const { session } = useAuth();
  
  /**
   * Direct fetch implementation with automatic token handling
   */
  async function directFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Get auth token from the session context
    const token = session?.access_token;
    
    if (!token) {
      throw new Error('Authentication required. Not logged in or session expired.');
    }
    
    // Create headers with authentication
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    // Make the request
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
  async function testApiConnection() {
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
  const match = {
    // Get all matches
    getAllMatches: () => directFetch<Match[]>('/matches'),

    // Get a match by ID
    getMatchById: (id: string) => directFetch<Match>(`/matches/${id}`),

    // Get a match with all sets and points
    getFullMatchById: (id: string) => 
      directFetch<{ match: Match; sets: Set[]; points: Point[] }>(`/matches/${id}/full`),

    // Create a new match
    createMatch: (
      match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ): Promise<Match> => {
      return directFetch<Match>('/matches', {
        method: 'POST',
        body: JSON.stringify(match),
      });
    },

    // Update a match
    updateMatch: (id: string, match: Partial<Match>) =>
      directFetch<Match>(`/matches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(match),
      }),
      
    // Delete a match
    deleteMatch: (id: string) =>
      directFetch<{ message: string; id: string }>(`/matches/${id}`, {
        method: 'DELETE',
      }),
  };

  /**
   * Set API functions
   */
  const set = {
    // Get all sets for a match
    getSetsByMatchId: (matchId: string) => 
      directFetch<Set[]>(`/sets?match_id=${matchId}`),

    // Create a new set
    createSet: (set: Omit<Set, 'id' | 'created_at' | 'updated_at'>) =>
      directFetch<Set>('/sets', {
        method: 'POST',
        body: JSON.stringify(set),
      }),

    // Update a set
    updateSet: (id: string, set: Partial<Set>) =>
      directFetch<Set>(`/sets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(set),
      }),
  };

  /**
   * Point API functions
   */
  const point = {
    // Get all points for a set
    getPointsBySetId: (setId: string) => 
      directFetch<Point[]>(`/points?set_id=${setId}`),

    // Create a new point
    createPoint: (point: Omit<Point, 'id' | 'created_at'>) => {
      return directFetch<Point>('/points', {
        method: 'POST',
        body: JSON.stringify(point),
      });
    },

    // Delete a point
    deletePoint: (id: string) =>
      directFetch<{ message: string }>(`/points/${id}`, {
        method: 'DELETE',
      }),
  };

  /**
   * Shot API functions
   */
  const shot = {
    // Get all shot categories
    getCategories: () => directFetch<any[]>('/shots/categories'),
    
    // Get all shots
    getShots: () => directFetch<any[]>('/shots'),
  };

  return {
    match,
    set,
    point,
    shot,
    testApiConnection
  };
}