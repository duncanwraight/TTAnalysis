import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';

const MatchAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id) {
        setError('Missing match ID');
        setLoading(false);
        return;
      }

      try {
        const data = await api.match.getAnalysis(id);
        setAnalysisData(data);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, api]);
  
  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading analysis...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button
            className="btn secondary-btn"
            onClick={() => navigate('/matches')}
          >
            Back to Matches
          </button>
        </div>
      </Layout>
    );
  }

  const renderDataOrError = (data: any, title: string) => {
    if (!data) return <p>No data available</p>;
    if (data.error) return <p>{data.error}</p>;
    if (!data.data || data.data.length === 0) return <p>No data</p>;
    return data.data;
  };

  const matchSummary = analysisData?.matchSummary?.data?.[0];
  const effectiveShots = renderDataOrError(analysisData?.mostEffectiveShots, 'Most Effective Shots');
  const costlyShots = renderDataOrError(analysisData?.mostCostlyShots, 'Most Costly Shots');
  
  return (
    <Layout>
      <div className="match-analysis-container">
        <div className="analysis-header">
          <h2>Match Analysis</h2>
          {matchSummary && (
            <>
              <h3>vs. {matchSummary.opponent_name}</h3>
              <p className="match-date">{new Date(matchSummary.date).toLocaleDateString()}</p>
            </>
          )}
        </div>
        
        <div className="analysis-summary">
          <div className="summary-card">
            <h3>Match Summary</h3>
            {matchSummary ? (
              <>
                <p>Final Score: {matchSummary.match_score}</p>
                <p>Total Points: {matchSummary.total_points}</p>
                <p>Points Won: {matchSummary.points_won}</p>
                <p>Points Lost: {matchSummary.points_lost}</p>
                <p>Win Rate: {matchSummary.points_win_percentage}%</p>
              </>
            ) : (
              <p>Error loading match summary</p>
            )}
          </div>
          
          <div className="summary-card">
            <h3>Most Effective Shots</h3>
            {Array.isArray(effectiveShots) ? (
              effectiveShots.slice(0, 3).map((shot: any, index: number) => (
                <p key={index}>{shot.name}: {shot.wins} wins</p>
              ))
            ) : (
              <p>{effectiveShots}</p>
            )}
          </div>
          
          <div className="summary-card">
            <h3>Most Costly Shots</h3>
            {Array.isArray(costlyShots) ? (
              costlyShots.slice(0, 3).map((shot: any, index: number) => (
                <p key={index}>{shot.name}: {shot.losses} losses</p>
              ))
            ) : (
              <p>{costlyShots}</p>
            )}
          </div>
        </div>
        
        <div className="analysis-actions">
          <button
            className="btn secondary-btn"
            onClick={() => navigate('/matches')}
          >
            Back to Matches
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MatchAnalysis;