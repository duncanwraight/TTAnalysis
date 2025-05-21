// API client for interacting with the database

import { Match, Set, Point } from '../types/database.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for making API requests
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
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
  createMatch: (match: Omit<Match, 'id' | 'created_at' | 'updated_at'>) =>
    fetchApi<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(match),
    }),

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