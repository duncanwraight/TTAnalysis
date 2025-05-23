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
  const shotDistribution = renderDataOrError(analysisData?.shotDistribution, 'Shot Distribution');
  const setBreakdown = renderDataOrError(analysisData?.setBreakdown, 'Set Breakdown');
  const categoryBreakdown = renderDataOrError(analysisData?.categoryBreakdown, 'Category Breakdown');
  const tacticalInsights = renderDataOrError(analysisData?.tacticalInsights, 'Tactical Insights');
  const handAnalysis = renderDataOrError(analysisData?.handAnalysis, 'Hand Analysis');
  
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
                <p key={index}>{shot.name}: {shot.wins} wins ({shot.win_percentage}%)</p>
              ))
            ) : (
              <p>{effectiveShots}</p>
            )}
          </div>
          
          <div className="summary-card">
            <h3>Most Costly Shots</h3>
            {Array.isArray(costlyShots) ? (
              costlyShots.slice(0, 3).map((shot: any, index: number) => (
                <p key={index}>{shot.name}: {shot.losses} losses ({shot.loss_percentage}%)</p>
              ))
            ) : (
              <p>{costlyShots}</p>
            )}
          </div>
        </div>

        <div className="analysis-sections">
          <div className="analysis-section">
            <h3>Shot Distribution</h3>
            {Array.isArray(shotDistribution) ? (
              <div className="shot-list">
                {shotDistribution.slice(0, 5).map((shot: any, index: number) => (
                  <p key={index}>
                    {shot.name}: {shot.total_shots} shots ({shot.percentage_of_total}%, {shot.success_rate}% success)
                  </p>
                ))}
              </div>
            ) : (
              <p>{shotDistribution}</p>
            )}
          </div>

          <div className="analysis-section">
            <h3>Category Performance</h3>
            {Array.isArray(categoryBreakdown) ? (
              <div className="category-list">
                {categoryBreakdown.map((category: any, index: number) => (
                  <p key={index}>
                    {category.category}: {category.total_shots} shots ({category.percentage_of_total}%, {category.success_rate}% success)
                  </p>
                ))}
              </div>
            ) : (
              <p>{categoryBreakdown}</p>
            )}
          </div>

          <div className="analysis-section">
            <h3>Hand Analysis</h3>
            {Array.isArray(handAnalysis) ? (
              <div className="hand-stats">
                {handAnalysis.map((hand: any, index: number) => (
                  <p key={index}>
                    {hand.hand === 'fh' ? 'Forehand' : 'Backhand'}: {hand.total_shots} shots ({hand.success_rate}% success)
                  </p>
                ))}
              </div>
            ) : (
              <p>{handAnalysis}</p>
            )}
          </div>

          <div className="analysis-section">
            <h3>Tactical Insights</h3>
            {Array.isArray(tacticalInsights) ? (
              <div className="tactical-list">
                {tacticalInsights.slice(0, 5).map((insight: any, index: number) => (
                  <p key={index}>
                    vs {insight.opponent_shot}: {insight.wins}W-{insight.losses}L ({insight.win_percentage}% win rate)
                  </p>
                ))}
              </div>
            ) : (
              <p>{tacticalInsights}</p>
            )}
          </div>

          <div className="analysis-section">
            <h3>Set-by-Set Breakdown</h3>
            {Array.isArray(setBreakdown) ? (
              <div className="set-breakdown">
                {setBreakdown.slice(0, 8).map((item: any, index: number) => (
                  <p key={index}>
                    Set {item.set_number}: {item.shot_name} ({item.wins_in_set} wins)
                  </p>
                ))}
              </div>
            ) : (
              <p>{setBreakdown}</p>
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