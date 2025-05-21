/**
 * Form utility - submits data via a hidden form and uses the response
 * This is the most basic way of making a request possible in a browser
 */

import { supabase } from '../lib/supabase';

// Create a hidden iframe to handle the form submission
function createHiddenIframe(id: string): HTMLIFrameElement {
  let iframe = document.getElementById(id) as HTMLIFrameElement;
  
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.name = id;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  
  return iframe;
}

/**
 * Submit a form with JSON data via POST and handle the response
 */
export function submitFormPost(
  url: string,
  data: any,
  token: string,
  onSuccess: (data: any) => void,
  onError: (error: any) => void
): void {
  console.log('FORM: Preparing form submission for', url);
  
  // Create a unique ID for this submission
  const uniqueId = 'form_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  
  // Create a hidden iframe to handle the response
  const iframe = createHiddenIframe(uniqueId + '_iframe');
  
  // Create a hidden form
  const form = document.createElement('form');
  form.id = uniqueId + '_form';
  form.method = 'POST';
  form.action = url;
  form.target = iframe.name; // Target the hidden iframe
  form.style.display = 'none';
  
  // Add auth header via a hidden input
  const authInput = document.createElement('input');
  authInput.type = 'hidden';
  authInput.name = 'Authorization';
  authInput.value = `Bearer ${token}`;
  form.appendChild(authInput);
  
  // Add the JSON data as a hidden input
  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'data';
  dataInput.value = JSON.stringify(data);
  form.appendChild(dataInput);
  
  // Add a content type indicator
  const contentTypeInput = document.createElement('input');
  contentTypeInput.type = 'hidden';
  contentTypeInput.name = 'Content-Type';
  contentTypeInput.value = 'application/json';
  form.appendChild(contentTypeInput);
  
  // Handle the response
  iframe.onload = () => {
    try {
      console.log('FORM: Iframe loaded, processing response');
      
      // Try to access the response content
      let responseText = '';
      try {
        // Access the iframe's document
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          responseText = doc.body.innerText || doc.body.textContent || '';
        }
      } catch (e) {
        console.error('FORM: Error accessing iframe content:', e);
      }
      
      console.log('FORM: Response text:', responseText);
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('FORM: Parsed response data:', data);
        onSuccess(data);
      } catch (e) {
        console.error('FORM: Error parsing response as JSON:', e);
        onError(new Error('Invalid response format'));
      }
      
      // Clean up
      document.body.removeChild(form);
      // Leave the iframe for future reuse
    } catch (e) {
      console.error('FORM: Error in iframe onload:', e);
      onError(e);
    }
  };
  
  // Handle iframe errors
  iframe.onerror = (e) => {
    console.error('FORM: Iframe error:', e);
    onError(new Error('Form submission failed'));
    // Clean up
    document.body.removeChild(form);
  };
  
  // Add the form to the document
  document.body.appendChild(form);
  
  // Submit the form
  console.log('FORM: Submitting form to', url);
  form.submit();
  console.log('FORM: Form submitted');
}

/**
 * Creates a match using a form submission
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
  console.log('FORM: Starting match creation with form submission');
  
  // First get the auth token
  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token;
    
    if (!token) {
      onError(new Error('Authentication required. Please log in again.'));
      return;
    }
    
    console.log('FORM: Got auth token, submitting form');
    
    // Submit the form
    submitFormPost(
      'http://localhost:3001/api/matches',
      matchData,
      token,
      onSuccess,
      onError
    );
  }).catch(error => {
    console.error('FORM: Error getting auth session:', error);
    onError(error);
  });
};