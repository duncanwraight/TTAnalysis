import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import '../styles/components/MatchAnalysis.css';

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

  const renderDataOrError = (data: any) => {
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
          <h1>Match Analysis</h1>
          {matchSummary && (
            <>
              <h2>vs. {matchSummary.opponent_name}</h2>
              <p className="match-date">{new Date(matchSummary.date).toLocaleDateString()}</p>
            </>
          )}
        </div>
        
        {/* Match Summary Box */}
        <div className="match-summary-box">
          <h3>Match Summary</h3>
          {matchSummary ? (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Final Score:</span>
                <span className="value">{matchSummary.match_score}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total Points:</span>
                <span className="value">{matchSummary.total_points}</span>
              </div>
              <div className="summary-item">
                <span className="label">Points Won:</span>
                <span className="value">{matchSummary.points_won}</span>
              </div>
              <div className="summary-item">
                <span className="label">Points Lost:</span>
                <span className="value">{matchSummary.points_lost}</span>
              </div>
              <div className="summary-item highlight">
                <span className="label">Win Rate:</span>
                <span className="value">{matchSummary.points_win_percentage}%</span>
              </div>
            </div>
          ) : (
            <p>Error loading match summary</p>
          )}
        </div>

        {/* Headline Metrics */}
        <div className="headline-metrics">
          <div className="metric-box effective">
            <h4>Most Effective Shots</h4>
            {Array.isArray(effectiveShots) ? (
              effectiveShots.slice(0, 3).map((shot: any, index: number) => (
                <div key={index} className="metric-item">
                  <span className="shot-name">{shot.name}</span>
                  <span className="metric-value">{shot.wins} wins ({shot.win_percentage}%)</span>
                </div>
              ))
            ) : (
              <p>{effectiveShots}</p>
            )}
          </div>
          
          <div className="metric-box costly">
            <h4>Most Costly Shots</h4>
            {Array.isArray(costlyShots) ? (
              costlyShots.slice(0, 3).map((shot: any, index: number) => (
                <div key={index} className="metric-item">
                  <span className="shot-name">{shot.name}</span>
                  <span className="metric-value">{shot.losses} losses ({shot.loss_percentage}%)</span>
                </div>
              ))
            ) : (
              <p>{costlyShots}</p>
            )}
          </div>
        </div>

        {/* Shot Analysis Table */}
        <div className="shot-analysis-table">
          <h3>Shot Breakdown</h3>
          {Array.isArray(shotDistribution) && Array.isArray(handAnalysis) ? (
            <div className="table-container">
              <table className="analysis-table">
                <thead>
                  <tr>
                    <th>Shot</th>
                    <th>Total</th>
                    <th>Won</th>
                    <th>Lost</th>
                    <th>Win %</th>
                    <th>FH Won/Total</th>
                    <th>BH Won/Total</th>
                  </tr>
                </thead>
                <tbody>
                  {shotDistribution.map((shot: any, index: number) => {
                    const won = Math.round(shot.total_shots * shot.success_rate / 100);
                    const lost = shot.total_shots - won;
                    
                    // Get hand data if available
                    const fhData = Array.isArray(handAnalysis) ? handAnalysis.find((h: any) => h.hand === 'fh') : null;
                    const bhData = Array.isArray(handAnalysis) ? handAnalysis.find((h: any) => h.hand === 'bh') : null;
                    
                    // For now, show proportional distribution based on overall hand usage
                    const totalHandShots = fhData && bhData ? fhData.total_shots + bhData.total_shots : 0;
                    const fhProportion = fhData && totalHandShots > 0 ? fhData.total_shots / totalHandShots : 0.5;
                    const bhProportion = bhData && totalHandShots > 0 ? bhData.total_shots / totalHandShots : 0.5;
                    
                    const estimatedFhWins = Math.round(won * fhProportion);
                    const estimatedBhWins = Math.round(won * bhProportion);
                    const estimatedFhTotal = Math.round(shot.total_shots * fhProportion);
                    const estimatedBhTotal = Math.round(shot.total_shots * bhProportion);
                    
                    return (
                      <tr key={index}>
                        <td className="shot-name">{shot.name}</td>
                        <td>{shot.total_shots}</td>
                        <td className="won">{won}</td>
                        <td className="lost">{lost}</td>
                        <td className="percentage">{shot.success_rate}%</td>
                        <td>{totalHandShots > 0 ? `${estimatedFhWins}/${estimatedFhTotal}` : 'N/A'}</td>
                        <td>{totalHandShots > 0 ? `${estimatedBhWins}/${estimatedBhTotal}` : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No shot data available</p>
          )}
        </div>

        <div className="analysis-sections">
          <div className="analysis-section chart-section">
            <h3>Shot Distribution</h3>
            {Array.isArray(shotDistribution) ? (
              <div className="chart-container">
                <div className="pie-chart-placeholder">
                  <div className="chart-legend">
                    {shotDistribution.slice(0, 5).map((shot: any, index: number) => (
                      <div key={index} className="legend-item">
                        <div className={`legend-color color-${index}`}></div>
                        <span>{shot.name}: {shot.percentage_of_total}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p>{shotDistribution}</p>
            )}
          </div>

          <div className="analysis-section chart-section">
            <h3>Category Performance</h3>
            {Array.isArray(categoryBreakdown) ? (
              <div className="chart-container">
                <div className="bar-chart-placeholder">
                  <div className="category-bars">
                    {categoryBreakdown.map((category: any, index: number) => (
                      <div key={index} className="bar-item">
                        <div className="bar-label">{category.category}</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{width: `${category.success_rate}%`}}
                          ></div>
                        </div>
                        <div className="bar-value">{category.success_rate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p>{categoryBreakdown}</p>
            )}
          </div>

          <div className="analysis-section chart-section">
            <h3>Hand Analysis</h3>
            {Array.isArray(handAnalysis) ? (
              <div className="chart-container">
                <div className="hand-comparison">
                  {handAnalysis.map((hand: any, index: number) => (
                    <div key={index} className="hand-stat">
                      <div className="hand-label">
                        {hand.hand === 'fh' ? 'Forehand' : 'Backhand'}
                      </div>
                      <div className="hand-circle">
                        <div className="circle-progress" style={{
                          background: `conic-gradient(var(--primary-color) ${hand.success_rate * 3.6}deg, var(--border-color) 0deg)`
                        }}>
                          <div className="circle-inner">
                            <span className="percentage">{hand.success_rate}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="hand-details">
                        {hand.total_shots} shots
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div key={index} className="tactical-item">
                    <div className="tactical-matchup">vs {insight.opponent_shot}</div>
                    <div className="tactical-record">
                      <span className="wins">{insight.wins}W</span>
                      <span className="separator">-</span>
                      <span className="losses">{insight.losses}L</span>
                      <span className="win-rate">({insight.win_percentage}%)</span>
                    </div>
                  </div>
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
                {(() => {
                  const setData = setBreakdown.reduce((acc: any, item: any) => {
                    if (!acc[item.set_number]) acc[item.set_number] = [];
                    acc[item.set_number].push(item);
                    return acc;
                  }, {});
                  
                  return Object.keys(setData).map((setNum: string) => {
                    const shots = setData[setNum];
                    const mostSuccessful = shots.reduce((max: any, shot: any) => 
                      shot.wins_in_set > max.wins_in_set ? shot : max
                    );
                    const leastSuccessful = shots.reduce((min: any, shot: any) => 
                      shot.wins_in_set < min.wins_in_set ? shot : min
                    );
                    
                    return (
                      <div key={setNum} className="set-item">
                        <div className="set-header">Set {setNum}</div>
                        <div className="set-stats">
                          <div className="best-shot">
                            <span className="label">Most successful:</span>
                            <span className="value">{mostSuccessful.shot_name} ({mostSuccessful.wins_in_set} wins)</span>
                          </div>
                          {mostSuccessful.shot_name !== leastSuccessful.shot_name && (
                            <div className="worst-shot">
                              <span className="label">Least successful:</span>
                              <span className="value">{leastSuccessful.shot_name} ({leastSuccessful.wins_in_set} wins)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
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