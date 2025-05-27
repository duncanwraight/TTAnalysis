import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
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
  const location = useLocation();
  const api = useApi();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  // Sorting state for shot breakdown tables
  const [playerTableSort, setPlayerTableSort] = useState<{
    field: 'category_shot_hand' | 'won' | 'lost' | 'percentage';
    direction: 'asc' | 'desc';
  }>({ field: 'won', direction: 'desc' });
  
  const [opponentTableSort, setOpponentTableSort] = useState<{
    field: 'category_shot_hand' | 'won' | 'lost' | 'percentage';
    direction: 'asc' | 'desc';
  }>({ field: 'won', direction: 'desc' });
  
  const isSharedView = location.pathname.includes('/shared/');
  const isAuthenticated = !!user;
  
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

  const handleShare = async () => {
    if (!id) return;
    
    const shareUrl = `${window.location.origin}/shared/matches/${id}/analysis`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the URL in a prompt
      prompt('Copy this link to share:', shareUrl);
    }
  };
  
  if (loading) {
    const content = (
      <div className="loading-container">
        <p>Loading analysis...</p>
      </div>
    );
    return isSharedView ? <div className="shared-analysis-container">{content}</div> : <Layout>{content}</Layout>;
  }

  if (error) {
    const content = (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        {isSharedView ? (
          <button
            className="btn secondary-btn"
            onClick={() => navigate('/')}
          >
            Go to Home
          </button>
        ) : (
          <button
            className="btn secondary-btn"
            onClick={() => navigate('/matches')}
          >
            Back to Matches
          </button>
        )}
      </div>
    );
    return isSharedView ? <div className="shared-analysis-container">{content}</div> : <Layout>{content}</Layout>;
  }

  const matchSummary = analysisData?.matchSummary;
  const effectiveShots = analysisData?.mostEffectiveShots || [];
  const costlyShots = analysisData?.mostCostlyShots || [];
  const shotDistribution = analysisData?.shotDistribution || [];
  const setBreakdown = analysisData?.setBreakdown || [];
  const categoryBreakdown = analysisData?.categoryBreakdown || [];
  const tacticalInsights = analysisData?.tacticalInsights || [];
  const handAnalysis = analysisData?.handAnalysis || [];
  const shotHandAnalysis = analysisData?.shotHandAnalysis || [];
  
  // Create shot+hand breakdown data for player
  const createPlayerShotHandBreakdown = () => {
    const breakdown: any[] = [];
    
    shotDistribution.forEach((shot: any) => {
      const shotHandData = shotHandAnalysis.filter((s: any) => 
        s.shot_name === shot.name && s.player_type === 'player'
      );
      
      // If we have hand data for this shot, create separate rows for each hand
      if (shotHandData.length > 0) {
        shotHandData.forEach((handData: any) => {
          const handLabel = handData.hand === 'fh' ? 'FH' : 'BH';
          breakdown.push({
            ...shot,
            hand: handLabel,
            hand_wins: handData.wins,
            hand_losses: handData.losses,
            hand_total: handData.total_shots,
            hand_success_rate: handData.success_rate
          });
        });
      } else {
        // If no hand data, show the shot without hand breakdown
        breakdown.push({
          ...shot,
          hand: '-',
          hand_wins: 0,
          hand_losses: 0,
          hand_total: 0,
          hand_success_rate: 0
        });
      }
    });
    
    return breakdown;
  };

  // Create shot+hand breakdown data for opponent
  const createOpponentShotHandBreakdown = () => {
    const breakdown: any[] = [];
    
    shotDistribution.forEach((shot: any) => {
      const shotHandData = shotHandAnalysis.filter((s: any) => 
        s.shot_name === shot.name && s.player_type === 'opponent'
      );
      
      // If we have hand data for this shot, create separate rows for each hand
      if (shotHandData.length > 0) {
        shotHandData.forEach((handData: any) => {
          const handLabel = handData.hand === 'fh' ? 'FH' : 'BH';
          breakdown.push({
            ...shot,
            hand: handLabel,
            hand_wins: handData.wins,
            hand_losses: handData.losses,
            hand_total: handData.total_shots,
            hand_success_rate: handData.success_rate,
            // For opponent table, we track their wins/losses from their perspective
            opponent_wins: handData.wins,
            opponent_losses: handData.losses
          });
        });
      } else {
        // If no hand data, show the shot without hand breakdown
        breakdown.push({
          ...shot,
          hand: '-',
          hand_wins: 0,
          hand_losses: 0,
          hand_total: 0,
          hand_success_rate: 0,
          opponent_wins: 0,
          opponent_losses: 0
        });
      }
    });
    
    return breakdown;
  };
  
  const shotHandBreakdown = createPlayerShotHandBreakdown();
  const opponentShotHandBreakdown = createOpponentShotHandBreakdown();
  
  // Sorting functions
  const sortData = (data: any[], sortConfig: { field: string; direction: 'asc' | 'desc' }) => {
    return [...data].sort((a, b) => {
      if (sortConfig.field === 'category_shot_hand') {
        // Sort by category, then shot, then hand
        const aKey = `${a.category}-${a.name}-${a.hand}`;
        const bKey = `${b.category}-${b.name}-${b.hand}`;
        const comparison = aKey.localeCompare(bKey);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else if (sortConfig.field === 'won') {
        const aValue = a.hand_wins || 0;
        const bValue = b.hand_wins || 0;
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else if (sortConfig.field === 'lost') {
        const aValue = a.hand_losses || 0;
        const bValue = b.hand_losses || 0;
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else if (sortConfig.field === 'percentage') {
        const aValue = a.hand_success_rate || 0;
        const bValue = b.hand_success_rate || 0;
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  };
  
  const handlePlayerSort = (field: 'category_shot_hand' | 'won' | 'lost' | 'percentage') => {
    setPlayerTableSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const handleOpponentSort = (field: 'category_shot_hand' | 'won' | 'lost' | 'percentage') => {
    setOpponentTableSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  // Apply sorting to the data
  const sortedPlayerData = sortData(
    shotHandBreakdown.filter((shot: any) => shot.won_with > 0 || shot.lost_with > 0).filter((shot: any) => shot.hand_total > 0),
    playerTableSort
  );
  
  const sortedOpponentData = sortData(
    opponentShotHandBreakdown.filter((shot: any) => shot.hand_total > 0),
    opponentTableSort
  );
  
  const analysisContent = (
    <div className="match-analysis-container" ref={contentRef}>
        <div className="analysis-header">
          <h1>Match Analysis</h1>
          {matchSummary && (
            <>
              <h2>vs. {matchSummary.opponent_name}</h2>
              <p className="match-date">{new Date(matchSummary.date).toLocaleDateString()}</p>
            </>
          )}
          {isSharedView && (
            <div className="shared-badge">
              <span>🔗 Shared Analysis</span>
            </div>
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

        {/* Shot Analysis Tables */}
        <div className="shot-analysis-tables">
          <h3>Shot Breakdown</h3>
          {shotDistribution.length > 0 ? (
            <div className="breakdown-tables">
              <div className="breakdown-table">
                <h4>Your Shots</h4>
                <div className="table-container">
                  <table className="analysis-table">
                    <thead>
                      <tr>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handlePlayerSort('category_shot_hand')}
                          >
                            Category/Shot/Hand
                            {playerTableSort.field === 'category_shot_hand' && (
                              <span className="sort-arrow">
                                {playerTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handlePlayerSort('won')}
                          >
                            Won with
                            {playerTableSort.field === 'won' && (
                              <span className="sort-arrow">
                                {playerTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handlePlayerSort('lost')}
                          >
                            Lost with
                            {playerTableSort.field === 'lost' && (
                              <span className="sort-arrow">
                                {playerTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handlePlayerSort('percentage')}
                          >
                            Win %
                            {playerTableSort.field === 'percentage' && (
                              <span className="sort-arrow">
                                {playerTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayerData.map((shot: any, index: number) => (
                        <tr key={index}>
                          <td className="category-shot-hand">
                            <div className="category-name">{formatText(shot.category)}</div>
                            <div className="shot-name">{formatText(shot.name)}</div>
                            <div className="hand-breakdown">{shot.hand}</div>
                          </td>
                          <td className="won-with">{shot.hand_wins}</td>
                          <td className="lost-with">{shot.hand_losses}</td>
                          <td className="percentage">{shot.hand_success_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="breakdown-table">
                <h4>Opponent's Shots</h4>
                <div className="table-container">
                  <table className="analysis-table">
                    <thead>
                      <tr>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handleOpponentSort('category_shot_hand')}
                          >
                            Category/Shot/Hand
                            {opponentTableSort.field === 'category_shot_hand' && (
                              <span className="sort-arrow">
                                {opponentTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handleOpponentSort('won')}
                          >
                            Won against
                            {opponentTableSort.field === 'won' && (
                              <span className="sort-arrow">
                                {opponentTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handleOpponentSort('lost')}
                          >
                            Lost against
                            {opponentTableSort.field === 'lost' && (
                              <span className="sort-arrow">
                                {opponentTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        <th>
                          <button 
                            className="sort-button"
                            onClick={() => handleOpponentSort('percentage')}
                          >
                            Win %
                            {opponentTableSort.field === 'percentage' && (
                              <span className="sort-arrow">
                                {opponentTableSort.direction === 'asc' ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOpponentData.map((shot: any, index: number) => (
                        <tr key={index}>
                          <td className="category-shot-hand">
                            <div className="category-name">{formatText(shot.category)}</div>
                            <div className="shot-name">{formatText(shot.name)}</div>
                            <div className="hand-breakdown">{shot.hand}</div>
                          </td>
                          <td className="won-against">{shot.hand_wins}</td>
                          <td className="lost-against">{shot.hand_losses}</td>
                          <td className="percentage">{shot.hand_success_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div>No shot data available</div>
          )}
        </div>

        {/* First Row: Shot Distribution, Category Performance, Tactical Insights */}
        <div className="analysis-row analysis-row-three">
          <div className="analysis-section chart-section">
            <h3>Shot Distribution</h3>
            {shotDistribution.length > 0 ? (
              <div className="chart-container">
                <div className="distribution-columns">
                  <div className="distribution-column">
                    <h4>Player</h4>
                    <div className="chart-legend">
                      {shotDistribution
                        .filter((shot: any) => shot.player_total > 0 && shot.category.toLowerCase() !== 'serve')
                        .sort((a: any, b: any) => b.player_total - a.player_total)
                        .slice(0, 5)
                        .map((shot: any, index: number) => {
                          const totalPlayerShots = shotDistribution
                            .filter((s: any) => s.category.toLowerCase() !== 'serve')
                            .reduce((sum: number, s: any) => sum + s.player_total, 0);
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
                    <h4>Opponent</h4>
                    <div className="chart-legend">
                      {shotDistribution
                        .filter((shot: any) => shot.opponent_total > 0 && shot.category.toLowerCase() !== 'serve')
                        .sort((a: any, b: any) => b.opponent_total - a.opponent_total)
                        .slice(0, 5)
                        .map((shot: any, index: number) => {
                          const totalOpponentShots = shotDistribution
                            .filter((s: any) => s.category.toLowerCase() !== 'serve')
                            .reduce((sum: number, s: any) => sum + s.opponent_total, 0);
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
        </div>

        {/* Second Row: Hand Analysis and Set-by-Set Breakdown */}
        <div className="analysis-row analysis-row-two">
          <div className="analysis-section">
            <h3>Hand Analysis</h3>
            {handAnalysis.length > 0 ? (
              <div className="hand-analysis-container">
                <div className="hand-analysis-player">
                  <h4>Player</h4>
                  <div className="hand-stats">
                    {handAnalysis
                      .filter((hand: any) => hand.player_type === 'player')
                      .map((hand: any, index: number) => (
                        <div key={index} className="hand-stat-row">
                          <div className="hand-info">
                            <span className="hand-name">{hand.hand === 'fh' ? 'FH' : 'BH'}</span>
                            <span className="success-rate">{hand.success_rate}%</span>
                          </div>
                          <div className="hand-details">
                            <span className="record">{hand.wins}W - {hand.losses}L</span>
                            <span className="total">({hand.total_shots} total)</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="hand-analysis-opponent">
                  <h4>Opponent</h4>
                  <div className="hand-stats">
                    {handAnalysis
                      .filter((hand: any) => hand.player_type === 'opponent')
                      .map((hand: any, index: number) => (
                        <div key={index} className="hand-stat-row">
                          <div className="hand-info">
                            <span className="hand-name">{hand.hand === 'fh' ? 'FH' : 'BH'}</span>
                            <span className="success-rate">{hand.success_rate}%</span>
                          </div>
                          <div className="hand-details">
                            <span className="record">{hand.wins}W - {hand.losses}L</span>
                            <span className="total">({hand.total_shots} total)</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
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
                  // Filter setBreakdown to show only player perspective - shots where player had involvement
                  const playerSetData = setBreakdown.reduce((acc: any, item: any) => {
                    if (!acc[item.set_number]) acc[item.set_number] = [];
                    
                    // Create player perspective data: wins they achieved and losses they had with shots
                    const playerShotData = {
                      ...item,
                      player_wins: item.wins_in_set, // Times player won with this shot in the set
                      player_losses: item.total_shots_in_set - item.wins_in_set // Times opponent won with this shot (player lost against it)
                    };
                    
                    // Only include shots where the player had some involvement
                    if (playerShotData.player_wins > 0 || playerShotData.player_losses > 0) {
                      acc[item.set_number].push(playerShotData);
                    }
                    
                    return acc;
                  }, {});
                  
                  return Object.keys(playerSetData).map((setNum: string) => {
                    const shots = playerSetData[setNum];
                    
                    // Find most successful shot (highest wins for player)
                    const mostSuccessful = shots.reduce((max: any, shot: any) => 
                      shot.player_wins > max.player_wins ? shot : max
                    );
                    
                    // Find least successful shot (lowest wins for player, but only among shots they used)
                    const shotsPlayerUsed = shots.filter((shot: any) => shot.player_wins > 0);
                    const leastSuccessful = shotsPlayerUsed.length > 0 
                      ? shotsPlayerUsed.reduce((min: any, shot: any) => 
                          shot.player_wins < min.player_wins ? shot : min
                        )
                      : null;
                    
                    return (
                      <div key={setNum} className="set-item">
                        <div className="set-header">Set {setNum}</div>
                        <div className="set-stats">
                          <div className="best-shot">
                            <span className="label">Most successful:</span>
                            <span className="value">{formatText(mostSuccessful.shot_name)} ({mostSuccessful.player_wins} wins)</span>
                          </div>
                          {leastSuccessful && mostSuccessful.shot_name !== leastSuccessful.shot_name && (
                            <div className="worst-shot">
                              <span className="label">Least successful:</span>
                              <span className="value">{formatText(leastSuccessful.shot_name)} ({leastSuccessful.player_wins} wins)</span>
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
          {isAuthenticated && !isSharedView && (
            <button
              className="btn secondary-btn"
              onClick={handleShare}
              disabled={shareSuccess}
            >
              {shareSuccess ? '✓ Link Copied!' : '🔗 Share Analysis'}
            </button>
          )}
          {isSharedView ? (
            <button
              className="btn secondary-btn"
              onClick={() => navigate('/')}
            >
              Go to Home
            </button>
          ) : (
            <button
              className="btn secondary-btn"
              onClick={() => navigate('/matches')}
            >
              Back to Matches
            </button>
          )}
        </div>
      </div>
    );

  return isSharedView ? (
    <div className="shared-analysis-container">{analysisContent}</div>
  ) : (
    <Layout>{analysisContent}</Layout>
  );
};

export default MatchAnalysis;