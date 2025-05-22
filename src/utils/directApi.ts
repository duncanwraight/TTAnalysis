/**
 * Direct API utility functions that bypass the main API client
 * These are used as a fallback when the main API client has issues
 */

import { supabase } from '../lib/supabase';

/**
 * Creates a match using a direct fetch approach
 * This function is based on the working ApiDebug.testCreateMatch implementation
 * 
 * @param matchData - The match data to create
 * @param options - Optional configuration
 * @param options.mode - 'debug' for extensive logging, 'simple' for bare-minimum fetch
 */
export const createMatch = async (
  matchData: {
    opponent_name: string;
    date: string;
    match_score: string;
    notes: string;
    initial_server: 'player' | 'opponent';
  }, 
  options: { mode?: 'debug' | 'simple' } = { mode: 'debug' }
) => {
  // Simple mode - bare minimum fetch with minimal error handling
  if (options.mode === 'simple') {
    console.log('SIMPLE MODE: Using bare-minimum fetch approach');
    // Get current session token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Very simple fetch with minimal options using relative URL for proxy
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(matchData)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Debug mode - extensive logging and error handling
  console.group('DIRECT API - createMatch');
  const debugTimestampStart = new Date().toISOString();
  console.log('DEBUG START TIME:', debugTimestampStart);
  
  // Direct API health check
  try {
    console.log('1. Checking API health...');
    const healthResult = await fetch('http://localhost:3001/api');
    const healthStatus = healthResult.ok ? 'OK' : 'ERROR';
    console.log(`API health check: ${healthStatus}`);
    
    // Additional response debugging
    console.log('API Health Response Status:', healthResult.status);
    const healthResponse = await healthResult.text();
    console.log('API Health Response Body:', healthResponse.substring(0, 100) + (healthResponse.length > 100 ? '...' : ''));
    
    if (!healthResult.ok) {
      console.error('API health check failed with status:', healthResult.status);
      throw new Error(`API server is not responding properly: ${healthResult.status} ${healthResult.statusText}`);
    }
  } catch (e) {
    console.error('2. API health check failed - server might be down:', e);
    throw new Error('API server might be down. Check console and server logs.');
  }
  
  // Get current session
  console.log('3. Getting auth session...');
  const sessionResult = await supabase.auth.getSession();
  console.log('Auth session result:', sessionResult);
  
  const session = sessionResult.data.session;
  
  if (!session) {
    console.error('4. No active session found');
    throw new Error('No active session found. Please log in.');
  }
  
  console.log('5. Session found, token available:', !!session.access_token);
  if (session.access_token) {
    console.log('Token starts with:', session.access_token.substring(0, 10));
    console.log('Token ends with:', session.access_token.substring(session.access_token.length - 10));
    console.log('Token length:', session.access_token.length);
  }
  
  console.log('6. Match data for creation:', matchData);
  
  // Testing with a timeout to ensure we don't get stuck
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.warn('7. TIMEOUT triggered, aborting request');
    controller.abort();
  }, 5000);
  
  try {
    // Test the match creation endpoint with relative URL for proxy
    console.log('8. Preparing to send POST request to /api/matches');
    console.log('Request body:', JSON.stringify(matchData));
    console.log('Headers being sent:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token.substring(0, 10)}...${session.access_token.substring(session.access_token.length - 10)}`
    });
    
    // Create a debugging log before the fetch
    console.log('9. Now executing fetch() at', new Date().toISOString());
    
    // Execute fetch and log that we've started
    const fetchStart = Date.now();
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(matchData),
      signal: controller.signal
    });
    
    const fetchTime = Date.now() - fetchStart;
    console.log(`10. Fetch completed in ${fetchTime}ms`);
    clearTimeout(timeout);
    
    console.log('11. Response received with status:', response.status);
    
    if (!response.ok) {
      console.log('12. Response not OK, reading error text...');
      const errorText = await response.text();
      console.error('API error:', response.status, response.statusText, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Get response as text first
    console.log('13. Reading response text...');
    const text = await response.text();
    console.log('14. Response text received:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    // Parse as JSON if possible
    try {
      console.log('15. Attempting to parse response as JSON...');
      const data = JSON.parse(text);
      console.log('16. Successfully parsed response:', data);
      console.groupEnd();
      return data;
    } catch (jsonError) {
      console.error('17. Error parsing response as JSON:', jsonError);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    clearTimeout(timeout);
    
    console.error('18. Error caught in try-catch:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error properties:', Object.keys(error));
    
    if (error.name === 'AbortError') {
      console.error('19. AbortError detected - request timed out');
      throw new Error('Request timed out after 5 seconds. Please try again.');
    }
    
    console.groupEnd();
    throw error;
  } finally {
    // Extra safety to ensure we always clear the timeout
    clearTimeout(timeout);
    console.log('DEBUG END TIME:', new Date().toISOString());
    console.groupEnd();
  }
};