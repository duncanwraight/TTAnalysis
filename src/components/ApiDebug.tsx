import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { testApiConnection, matchApi } from '../lib/api';

/**
 * Component for debugging API issues
 * This component provides tools for testing API connectivity, authentication, and operations
 * It is intended for development environment use only
 */
const ApiDebug: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  /**
   * Test basic API connectivity
   */
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
  
  /**
   * Test authentication with the API
   */
  const testAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Direct API health check using relative URL for proxy
      try {
        const healthResult = await fetch('/api');
        const healthStatus = healthResult.ok ? 'OK' : 'ERROR';
        console.log(`API health check: ${healthStatus}`);
      } catch (e) {
        console.error('API health check failed:', e);
        setError('API server might be down. Check console and server logs.');
        setIsLoading(false);
        return;
      }
      
      // Get current session
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;
      
      if (!session) {
        setError('No active session found. Please log in.');
        setIsLoading(false);
        return;
      }
      
      // Testing with a timeout to ensure we don't get stuck
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Test using the auth test endpoint
        const response = await fetch('/api/test/auth', {
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
        
        let data;
        let text = '';
        try {
          text = await response.text();
          
          try {
            data = JSON.parse(text);
          } catch (jsonError) {
            data = text;
          }
        } catch (e) {
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
  
  /**
   * Test match creation using the API client
   */
  const testCreateMatch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('No active session found. Please log in.');
        setIsLoading(false);
        return;
      }
      
      // Create test match data
      const matchData = {
        opponent_name: 'Debug Test',
        date: new Date().toISOString().split('T')[0],
        match_score: '0-0',
        notes: 'Created by API debug tool',
        initial_server: 'player' as 'player' | 'opponent'
      };
      
      // Use the API client for match creation with token
      try {
        const data = await matchApi.createMatch(matchData, session.access_token);
        
        setResult({ 
          request: {
            method: 'POST (via API client)',
            data: matchData,
          },
          response: {
            status: { ok: true }, 
            data,
          },
          requestTime: new Date().toISOString() 
        });
      } catch (error) {
        console.error('API error during test match creation:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`API Error: ${errorMessage}`);
        
        setResult({
          request: {
            method: 'POST (via API client)',
            data: matchData,
          },
          error: errorMessage,
          requestTime: new Date().toISOString() 
        });
      }
    } catch (err) {
      console.error('Match creation test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Show JWT token information
   */
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
          title="Test Create Match"
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