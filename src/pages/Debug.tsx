import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

const Debug: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      setLoading(true);
      try {
        // Check session
        const sessionResult = await supabase.auth.getSession();
        setSessionData(sessionResult.data);
      } catch (err) {
        console.error('Error checking session:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
        
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Session Data</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>
      </div>
    </Layout>
  );
};

export default Debug;