/**
 * XHR utility functions
 * Using old-school XMLHttpRequest instead of fetch for troubleshooting
 */

import { supabase } from '../lib/supabase';

/**
 * Creates a match using XMLHttpRequest
 */
export const createMatch = (
  matchData: {
    opponent_name: string;
    date: string;
    match_score: string;
    notes: string;
    initial_server: 'player' | 'opponent';
  },
  onSuccess: (data: any) => void,
  onError: (error: any) => void
): void => {
  console.log('XHR: Starting match creation with XMLHttpRequest');
  
  // First get the auth token
  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token;
    
    if (!token) {
      onError(new Error('Authentication required. Please log in again.'));
      return;
    }
    
    // Create XHR request
    const xhr = new XMLHttpRequest();
    
    // Setup callbacks
    xhr.onreadystatechange = function() {
      console.log(`XHR: Ready state changed to ${xhr.readyState}`);
      
      if (xhr.readyState === 4) {
        console.log(`XHR: Request completed with status ${xhr.status}`);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('XHR: Successful response:', data);
            onSuccess(data);
          } catch (e) {
            console.error('XHR: Error parsing response:', e);
            onError(new Error('Invalid JSON response from server'));
          }
        } else {
          console.error('XHR: Error response:', xhr.status, xhr.statusText);
          onError(new Error(`XHR Error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    };
    
    // Handle network errors
    xhr.onerror = function(e) {
      console.error('XHR: Network error occurred:', e);
      onError(new Error('A network error occurred. Please check your connection.'));
    };
    
    // Open and send the request using relative URL for proxy
    console.log('XHR: Opening connection to /api/matches');
    xhr.open('POST', '/api/matches', true);
    
    // Set headers
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    // Send the request
    const requestBody = JSON.stringify(matchData);
    console.log('XHR: Sending request with body:', requestBody);
    xhr.send(requestBody);
    
    console.log('XHR: Request sent, waiting for response...');
  }).catch(error => {
    console.error('XHR: Error getting auth session:', error);
    onError(error);
  });
};