import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

const Debug: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [apiHealth, setApiHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      setLoading(true);
      try {
        // Check session
        const sessionResult = await supabase.auth.getSession();
        setSessionData(sessionResult.data);

        // Check API health - use explicit try/catch
        let apiData = null;
        try {
          // Use a simple fetch with timeout - use relative URL
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          const healthResponse = await fetch('/api', {
            signal: controller.signal
          });
          clearTimeout(timeout);
          
          
          // Get response text first
          const responseText = await healthResponse.text();
          
          // Try to parse as JSON
          try {
            apiData = JSON.parse(responseText);
          } catch (parseError) {
            apiData = { 
              error: 'Failed to parse JSON', 
              raw: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '') 
            };
          }
        } catch (apiError) {
          console.error('API health check failed:', apiError);
          apiData = { 
            error: apiError.message,
            name: apiError.name
          };
        }
        
        setApiHealth(apiData);
      } catch (err) {
        console.error('Error checking session:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return 'Error formatting data';
    }
  };

  // Format the output for display
  const formatOutput = (data: any) => {
    if (!data) return 'No data';
    if (data.session?.access_token) {
      // Don't show the entire token, just beginning and end
      const token = data.session.access_token;
      const masked = token.substring(0, 15) + '...[HIDDEN]...' + token.substring(token.length - 15);
      return formatJson({
        ...data,
        session: {
          ...data.session,
          access_token: masked,
          user: data.session.user 
            ? {
                id: data.session.user.id,
                email: data.session.user.email,
                created_at: data.session.user.created_at
              }
            : null
        }
      });
    }
    return formatJson(data);
  };

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h1>Debug Page</h1>
        
        {loading && <p>Loading...</p>}
        
        {error && (
          <div style={{ 
            backgroundColor: '#ffebee',
            padding: '10px',
            border: '1px solid #f44336',
            borderRadius: '4px',
            marginBottom: '20px' 
          }}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        <div style={{ marginBottom: '20px' }}>
          <h2>Session Information</h2>
          <pre style={{ 
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {formatOutput(sessionData)}
          </pre>
        </div>
        
        <div>
          <h2>API Health Check</h2>
          <pre style={{ 
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {formatOutput(apiHealth)}
          </pre>
        </div>
      </div>
    </Layout>
  );
};

export default Debug;