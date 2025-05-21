// API client for interacting with the database

import { Match, Set, Point } from '../types/database.types';
import { supabase } from './supabase';

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 10000;

// NOTE: We're using a direct approach for match creation instead of the general fetchApi
// function due to issues with the match creation endpoint specifically

/**
 * Simple API client for making authenticated requests to the backend
 * @param endpoint - The API endpoint to call (e.g. '/matches')
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with the JSON response data
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[${timestamp}][${requestId}] API Client: Fetching ${endpoint} with method ${options.method || 'GET'}`);
  const startTime = Date.now();
  
  try {
    // Get the session token
    console.log(`[${timestamp}][${requestId}] API Client: Requesting auth session...`);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    
    if (!token) {
      console.error(`[${timestamp}][${requestId}] API Client: No authentication token available`);
      throw new Error('Authentication required. Please log in again.');
    }
    
    console.log(`[${timestamp}][${requestId}] API Client: Token retrieved (${token.substring(0, 10)}...)`);
    
    // Add auth header
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };
    
    console.log(`[${timestamp}][${requestId}] API Client: Headers prepared`, Object.keys(headers));
    
    // Set up timeout - using a shorter timeout for debugging
    const REQUEST_TIMEOUT_DEBUG = 5000; // 5 seconds for debugging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[${timestamp}][${requestId}] API Client: Request to ${endpoint} is taking too long, aborting after ${REQUEST_TIMEOUT_DEBUG}ms`);
      controller.abort();
    }, REQUEST_TIMEOUT_DEBUG);
    
    // Log the request body if it exists
    if (options.body) {
      console.log(`[${timestamp}][${requestId}] API Client: Request body:`, options.body);
    }
    
    // Create the fetch URL
    const fetchUrl = `${API_URL}${endpoint}`;
    console.log(`[${timestamp}][${requestId}] API Client: Sending request to ${fetchUrl}`);
    
    // Make the fetch request with detailed logging
    console.time(`[${requestId}] fetch-request`);
    const fetchPromise = fetch(fetchUrl, {
      headers,
      signal: controller.signal,
      ...options,
    });
    
    // Add additional timeout logging
    const fetchStartTime = Date.now();
    const loggingInterval = setInterval(() => {
      const elapsedTime = Date.now() - fetchStartTime;
      console.log(`[${timestamp}][${requestId}] API Client: Still waiting for response after ${elapsedTime}ms...`);
    }, 1000); // Log every second
    
    const response = await fetchPromise;
    console.timeEnd(`[${requestId}] fetch-request`);
    
    // Clear the timers
    clearTimeout(timeoutId);
    clearInterval(loggingInterval);
    
    console.log(`[${timestamp}][${requestId}] API Client: Response received in ${Date.now() - startTime}ms with status ${response.status}`);
    
    // Process the response
    if (!response.ok) {
      // Handle error response
      console.log(`[${timestamp}][${requestId}] API Client: Reading error response text...`);
      const errorText = await response.text();
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      console.error(`[${timestamp}][${requestId}] API Client: Request failed with status ${response.status}`, errorText);
      
      try {
        // Try to parse error as JSON
        const errorData = JSON.parse(errorText);
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (e) {
        // If not JSON, use text as is
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Process successful response
    console.log(`[${timestamp}][${requestId}] API Client: Reading response body...`);
    console.time(`[${requestId}] response-json`);
    
    // Force the response to be processed as text first for debugging
    const responseText = await response.text();
    console.log(`[${timestamp}][${requestId}] API Client: Response text received (${responseText.length} chars)`);
    
    let responseData;
    try {
      // Try to parse the text as JSON
      responseData = JSON.parse(responseText);
      console.log(`[${timestamp}][${requestId}] API Client: Successfully parsed JSON response from ${endpoint}`);
    } catch (jsonError) {
      console.error(`[${timestamp}][${requestId}] API Client: Error parsing JSON:`, jsonError);
      console.error(`[${timestamp}][${requestId}] API Client: Response text:`, responseText);
      throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
    }
    
    console.timeEnd(`[${requestId}] response-json`);
    return responseData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[${timestamp}][${requestId}] API Client: Request to ${endpoint} timed out after ${REQUEST_TIMEOUT}ms`);
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT}ms. Please try again.`);
    }
    console.error(`[${timestamp}][${requestId}] API Client: Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// API to test connectivity
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

// Match API functions
export const matchApi = {
  // Get all matches
  getAllMatches: () => fetchApi<Match[]>('/matches'),

  // Get a match by ID
  getMatchById: (id: string) => fetchApi<Match>(`/matches/${id}`),

  // Get a match with all sets and points
  getFullMatchById: (id: string) => fetchApi<{ match: Match; sets: Set[]; points: Point[] }>(`/matches/${id}/full`),

  // Create a new match - using exact implementation from ApiDebug that's known to work
  createMatch: async (match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Match> => {
    console.log('Creating match using ApiDebug approach that works');
    
    // Get the session token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    console.log('Session found, token available:', !!token);
    
    // Use a controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Using hardcoded URL like ApiDebug does
      console.log('Making POST request to http://localhost:3001/api/matches');
      const response = await fetch('http://localhost:3001/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(match),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      const status = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      };
      
      console.log('API response status:', status);
      
      // Handle error response
      if (!response.ok) {
        console.error('Match creation failed with status:', status);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Read and log response text
      let text = '';
      try {
        text = await response.text();
        console.log('API response raw text:', text);
        
        try {
          // Parse JSON response
          const data = JSON.parse(text);
          console.log('API response parsed JSON:', data);
          return data;
        } catch (jsonError) {
          console.log('Response is not JSON:', jsonError);
          throw new Error('Failed to parse response as JSON');
        }
      } catch (e) {
        console.error('Error reading response:', e);
        throw new Error('Failed to read response');
      }
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        console.error('Match creation request timed out after 5 seconds');
        throw new Error('Request timed out after 5 seconds. Please try again.');
      }
      
      console.error('Error during match creation:', error);
      throw error;
    }
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

// Shot API functions
export const shotApi = {
  // Get all shot categories
  getCategories: () => fetchApi<any[]>('/shots/categories'),
  
  // Get all shots
  getShots: () => fetchApi<any[]>('/shots'),
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi,
};