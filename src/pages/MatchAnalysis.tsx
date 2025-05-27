import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import html2pdf from 'html2pdf.js';
import '../styles/components/MatchAnalysis.css';

const formatText = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const MatchAnalysis = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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
        setError('Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, api]);

  const exportToPDF = async () => {
    if (!contentRef.current || !analysisData?.matchSummary) return;
    
    setIsExporting(true);
    
    try {
      const element = contentRef.current;
      const opt = {
        margin: 0.5,
        filename: `match-analysis-${analysisData.matchSummary.opponent_name}-${new Date(analysisData.matchSummary.date).toLocaleDateString().replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };
      
      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
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

  const matchSummary = analysisData?.matchSummary;
  const effectiveShots = analysisData?.mostEffectiveShots || [];
  const costlyShots = analysisData?.mostCostlyShots || [];
  const shotDistribution = analysisData?.shotDistribution || [];
  const setBreakdown = analysisData?.setBreakdown || [];
  const categoryBreakdown = analysisData?.categoryBreakdown || [];
  const tacticalInsights = analysisData?.tacticalInsights || [];
  const handAnalysis = analysisData?.handAnalysis || [];
  
  return (
    <Layout>
      <div className="match-analysis-container" ref={contentRef}>
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
            {effectiveShots.length > 0 ? (
              effectiveShots.slice(0, 3).map((shot: any, index: number) => (
                <div key={index} className="metric-item">
                  <span className="shot-name">{formatText(shot.name)}</span>
                  <span className="metric-value">{shot.wins} wins ({shot.success_rate}%)</span>
                </div>
              ))
            ) : (
              <div>No data</div>
            )}
          </div>
          
          <div className="metric-box costly">
            <h4>Most Costly Shots</h4>
            {costlyShots.length > 0 ? (
              costlyShots.slice(0, 3).map((shot: any, index: number) => (
                <div key={index} className="metric-item">
                  <span className="shot-name">{formatText(shot.name)}</span>
                  <span className="metric-value">{shot.losses} losses ({(100 - shot.success_rate).toFixed(1)}%)</span>
                </div>
              ))
            ) : (
              <div>No data</div>
            )}
          </div>
        </div>

        {/* Shot Analysis Table */}
        <div className="shot-analysis-table">
          <h3>Shot Breakdown</h3>
          {shotDistribution.length > 0 ? (
            <div className="table-container">
              <table className="analysis-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Shot</th>
                    <th>Won with</th>
                    <th>Lost with</th>
                    <th>Won against</th>
                    <th>Lost against</th>
                    <th>Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {shotDistribution.map((shot: any, index: number) => (
                    <tr key={index}>
                      <td className="category-name">{formatText(shot.category)}</td>
                      <td className="shot-name">{formatText(shot.name)}</td>
                      <td className="won-with">{shot.won_with}</td>
                      <td className="lost-with">{shot.lost_with}</td>
                      <td className="won-against">{shot.won_against}</td>
                      <td className="lost-against">{shot.lost_against}</td>
                      <td className="percentage">{shot.player_success_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>No shot data available</div>
          )}
        </div>

        <div className="analysis-sections">
          <div className="analysis-section chart-section">
            <h3>Shot Distribution</h3>
            {shotDistribution.length > 0 ? (
              <div className="chart-container">
                <div className="distribution-columns">
                  <div className="distribution-column">
                    <h4>Your Shots</h4>
                    <div className="chart-legend">
                      {shotDistribution
                        .filter((shot: any) => shot.player_total > 0)
                        .sort((a: any, b: any) => b.player_total - a.player_total)
                        .slice(0, 5)
                        .map((shot: any, index: number) => {
                          const totalPlayerShots = shotDistribution.reduce((sum: number, s: any) => sum + s.player_total, 0);
                          const percentage = totalPlayerShots > 0 ? ((shot.player_total / totalPlayerShots) * 100).toFixed(1) : 0;
                          return (
                            <div key={index} className="legend-item">
                              <div className={`legend-color color-${index}`}></div>
                              <span>{formatText(shot.name)}: {percentage}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="distribution-column">
                    <h4>Opponent's Shots</h4>
                    <div className="chart-legend">
                      {shotDistribution
                        .filter((shot: any) => shot.opponent_total > 0)
                        .sort((a: any, b: any) => b.opponent_total - a.opponent_total)
                        .slice(0, 5)
                        .map((shot: any, index: number) => {
                          const totalOpponentShots = shotDistribution.reduce((sum: number, s: any) => sum + s.opponent_total, 0);
                          const percentage = totalOpponentShots > 0 ? ((shot.opponent_total / totalOpponentShots) * 100).toFixed(1) : 0;
                          return (
                            <div key={index} className="legend-item">
                              <div className={`legend-color color-${index + 5}`}></div>
                              <span>{formatText(shot.name)}: {percentage}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>No data</div>
            )}
          </div>

          <div className="analysis-section chart-section">
            <h3>Category Performance</h3>
            {categoryBreakdown.length > 0 ? (
              <div className="chart-container">
                <div className="bar-chart-placeholder">
                  <div className="category-bars">
                    {categoryBreakdown.map((category: any, index: number) => (
                      <div key={index} className="bar-item">
                        <div className="bar-label">{formatText(category.category)}</div>
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
              <div>No data</div>
            )}
          </div>

          <div className="analysis-section chart-section">
            <h3>Hand Analysis</h3>
            {handAnalysis.length > 0 ? (
              <div className="chart-container">
                <div className="hand-analysis-players">
                  <div className="hand-analysis-player">
                    <h4>Your Hand Analysis</h4>
                    <div className="hand-comparison">
                      {handAnalysis
                        .filter((hand: any) => hand.player_type === 'player')
                        .map((hand: any, index: number) => (
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
                  <div className="hand-analysis-player">
                    <h4>Opponent's Hand Analysis</h4>
                    <div className="hand-comparison">
                      {handAnalysis
                        .filter((hand: any) => hand.player_type === 'opponent')
                        .map((hand: any, index: number) => (
                          <div key={index} className="hand-stat">
                            <div className="hand-label">
                              {hand.hand === 'fh' ? 'Forehand' : 'Backhand'}
                            </div>
                            <div className="hand-circle">
                              <div className="circle-progress" style={{
                                background: `conic-gradient(var(--secondary-color) ${hand.success_rate * 3.6}deg, var(--border-color) 0deg)`
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
                </div>
              </div>
            ) : (
              <div>No data</div>
            )}
          </div>

          <div className="analysis-section">
            <h3>Tactical Insights</h3>
            {tacticalInsights.length > 0 ? (
              <div className="tactical-list">
                {tacticalInsights.slice(0, 5).map((insight: any, index: number) => (
                  <div key={index} className="tactical-item">
                    <div className="tactical-matchup">vs {formatText(insight.opponent_shot)}</div>
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
              <div>No data</div>
            )}
          </div>

          <div className="analysis-section">
            <h3>Set-by-Set Breakdown</h3>
            {setBreakdown.length > 0 ? (
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
                            <span className="value">{formatText(mostSuccessful.shot_name)} ({mostSuccessful.wins_in_set} wins)</span>
                          </div>
                          {mostSuccessful.shot_name !== leastSuccessful.shot_name && (
                            <div className="worst-shot">
                              <span className="label">Least successful:</span>
                              <span className="value">{formatText(leastSuccessful.shot_name)} ({leastSuccessful.wins_in_set} wins)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div>No data</div>
            )}
          </div>
        </div>
        
        <div className="analysis-actions">
          <button
            className="btn primary-btn"
            onClick={exportToPDF}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting PDF...' : 'Export to PDF'}
          </button>
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