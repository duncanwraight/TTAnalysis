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
  getAllMatches: async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get a match by ID
  getMatchById: async (id: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get a match with all sets and points
  getFullMatchById: async (id: string) => {
    const [matchResult, setsResult, pointsResult] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).single(),
      supabase.from('sets').select('*').eq('match_id', id).order('set_number', { ascending: true }),
      supabase.from('points').select('*').eq('match_id', id).order('point_number', { ascending: true })
    ]);

    if (matchResult.error) throw matchResult.error;
    if (setsResult.error) throw setsResult.error;
    if (pointsResult.error) throw pointsResult.error;

    return {
      match: matchResult.data,
      sets: setsResult.data,
      points: pointsResult.data
    };
  },

  // Create a new match
  createMatch: async (match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('matches')
      .insert([{ ...match, user_id: userData.user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a match
  updateMatch: async (id: string, match: Partial<Match>) => {
    const { data, error } = await supabase
      .from('matches')
      .update(match)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a match
  deleteMatch: async (id: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Match deleted successfully', id };
  }
};

/**
 * Set API functions
 */
export const setApi = {
  // Get all sets for a match
  getSetsByMatchId: async (matchId: string) => {
    const { data, error } = await supabase
      .from('sets')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create a new set
  createSet: async (set: Omit<Set, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('sets')
      .insert([set])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a set
  updateSet: async (id: string, set: Partial<Set>) => {
    const { data, error } = await supabase
      .from('sets')
      .update(set)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Point API functions
 */
export const pointApi = {
  // Get all points for a set
  getPointsBySetId: async (setId: string) => {
    const { data, error } = await supabase
      .from('points')
      .select('*')
      .eq('set_id', setId)
      .order('point_number', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create a new point
  createPoint: async (point: Omit<Point, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('points')
      .insert([point])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a point
  deletePoint: async (id: string) => {
    const { error } = await supabase
      .from('points')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Point deleted successfully' };
  }
};

/**
 * Shot API functions
 */
export const shotApi = {
  // Get all shot categories
  getCategories: async () => {
    const { data, error } = await supabase
      .from('shot_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get all shots
  getShots: async () => {
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  }
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi
};