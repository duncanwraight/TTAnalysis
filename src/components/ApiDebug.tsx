import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { testApiConnection } from '../lib/api';
import * as directApi from '../utils/directApi';
import * as xhr from '../utils/xhr';
import * as form from '../utils/form';

/**
 * Component for debugging API issues
 * This is only intended for development environment
 */
const ApiDebug: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const testApi = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await testApiConnection();
      setResult(result);
    } catch (err) {
      console.error('API test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const testAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting auth test');
      
      // Direct API health check
      try {
        const healthResult = await fetch('http://localhost:3001/api');
        const healthStatus = healthResult.ok ? 'OK' : 'ERROR';
        console.log(`API health check: ${healthStatus}`);
      } catch (e) {
        console.error('API health check failed - server might be down:', e);
        setError('API server might be down. Check console and server logs.');
        setIsLoading(false);
        return;
      }
      
      // Get current session
      const sessionResult = await supabase.auth.getSession();
      console.log('Auth session result:', sessionResult);
      
      const session = sessionResult.data.session;
      
      if (!session) {
        console.error('No active session found');
        setError('No active session found. Please log in.');
        setIsLoading(false);
        return;
      }
      
      console.log('Session found, token available:', !!session.access_token);
      console.log('Token starts with:', session.access_token.substring(0, 10));
      console.log('User ID:', session.user.id);
      
      // Testing with a timeout to ensure we don't get stuck
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Test using our special auth test endpoint
        console.log('Making test request to API auth test endpoint');
        const response = await fetch('http://localhost:3001/api/test/auth', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        const status = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        };
        
        console.log('API response status:', status);
        
        let data;
        let text = '';
        try {
          text = await response.text();
          console.log('API response raw text:', text);
          
          try {
            data = JSON.parse(text);
            console.log('API response parsed JSON:', data);
          } catch (jsonError) {
            console.log('Response is not JSON:', jsonError);
            data = text;
          }
        } catch (e) {
          console.error('Error reading response:', e);
          data = 'Failed to read response';
        }
        
        setResult({ 
          auth: { 
            session: { 
              user_id: session.user.id,
              email: session.user.email,
              expires_at: new Date(session.expires_at * 1000).toISOString(),
              token_prefix: session.access_token.substring(0, 5) + '...'
            }
          }, 
          test: { status, data, rawResponse: text.substring(0, 100) + (text.length > 100 ? '...' : '') }
        });
      } catch (fetchError) {
        clearTimeout(timeout);
        console.error('Fetch error during auth test:', fetchError);
        
        // Check if this was an abort error
        if (fetchError.name === 'AbortError') {
          setError('Request timed out after 5 seconds - server might be unresponsive');
        } else {
          setError(`Fetch error: ${fetchError.message}`);
        }
        
        setResult({
          auth: { 
            session: { 
              user_id: session.user.id,
              email: session.user.email,
              expires_at: new Date(session.expires_at * 1000).toISOString(),
              token_prefix: session.access_token.substring(0, 5) + '...'
            }
          },
          error: fetchError.message
        });
      }
    } catch (err) {
      console.error('Auth test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const testCreateMatch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting match creation test');
      
      // Create test match data
      const matchData = {
        opponent_name: 'Debug Test',
        date: new Date().toISOString().split('T')[0],
        match_score: '0-0',
        notes: 'Created by API debug tool',
        initial_server: 'player'
      };
      
      // Use the Form utility with callbacks
      console.log('Using Form submission for test match creation');
      
      form.createMatch(
        matchData,
        // Success callback
        (data) => {
          console.log('Test match created successfully with ID:', data.id);
          
          setResult({ 
            request: {
              method: 'POST (via Form)',
              data: matchData,
            },
            response: {
              status: { ok: true, status: 200 }, 
              data,
            },
            requestTime: new Date().toISOString() 
          });
          
          setIsLoading(false);
        },
        // Error callback
        (error) => {
          console.error('Form error during test match creation:', error);
          
          setError(`Form Error: ${error.message}`);
          
          setResult({
            request: {
              method: 'POST (via Form)',
              data: matchData,
            },
            error: error.message,
            requestTime: new Date().toISOString() 
          });
          
          setIsLoading(false);
        }
      );
      
      // Return early to prevent the finally block from running
      // setIsLoading(false) is called in the callbacks
      return;
    } catch (err) {
      console.error('Match creation test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const showJwtToken = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session found. Please log in.');
        return;
      }
      
      setResult({
        tokenPreview: `${session.access_token.substring(0, 20)}...`,
        tokenInfo: {
          length: session.access_token.length,
          expires: new Date(session.expires_at * 1000).toISOString()
        },
        userId: session.user.id,
        email: session.user.email
      });
      
      setShowToken(!showToken);
    } catch (err) {
      console.error('Error showing token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '16px',
      margin: '16px 0',
      backgroundColor: '#f5f5f5'
    }}>
      <h3>API Debug Tools</h3>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button 
          onClick={testApi}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'wait' : 'pointer'
          }}
        >
          Test API Connection
        </button>
        
        <button 
          onClick={testAuth}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'wait' : 'pointer'
          }}
        >
          Test Authentication
        </button>
        
        <button 
          onClick={testCreateMatch}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'wait' : 'pointer'
          }}
        >
          Test Create Match
        </button>
        
        <button 
          onClick={showJwtToken}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'wait' : 'pointer'
          }}
        >
          {showToken ? 'Hide Token Info' : 'Show Token Info'}
        </button>
      </div>
      
      {isLoading && <div>Loading...</div>}
      
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '8px', 
          border: '1px solid red', 
          borderRadius: '4px',
          backgroundColor: '#ffebee',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}
      
      {result && (
        <div>
          <h4>Result:</h4>
          <pre style={{ 
            backgroundColor: '#eee', 
            padding: '8px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiDebug;