import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlayerPanel from '../components/PlayerPanel';
import ShotSelector from '../components/ShotSelector/index';
import ScoreBoard from '../components/ScoreBoard';
import PointHistory from '../components/PointHistory';
import { Match, MatchSet, Point, ShotInfo } from '../types/database.types';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import { loadShotData, NO_SHOT, SERVICE_FAULT_SHOT } from '../lib/shotsApi';
import {
  DEFAULT_BEST_OF,
  SetScore,
  Side,
  finishedSets,
  getServer,
  isMatchOver,
  isSetOver,
  matchScoreString,
  setLeader,
  setScoreString,
} from '../lib/scoring';

type MatchState = {
  currentSet: number;
  sets: SetScore[];
  points: Point[];
  isMatchComplete: boolean;
  // Database rows for the sets that exist so far, ordered by set_number
  dbSets: MatchSet[];
  // ID of the current set's row, or null if it hasn't been created yet
  currentSetId: string | null;
};

const EMPTY_SET: SetScore = { playerScore: 0, opponentScore: 0 };

// Supabase errors are plain objects with a message, not Error instances
const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown error';
};

/**
 * Build tracker state from what's in the database. Set rows hold the scores;
 * the current set is the last row unless that set is over, in which case the
 * next set starts (its row is created when its first point is recorded).
 */
const buildMatchState = (
  dbSetsIn: MatchSet[],
  points: Point[],
  bestOf: number,
  markedComplete: boolean
): MatchState => {
  const dbSets = [...dbSetsIn].sort((a, b) => a.set_number - b.set_number);

  if (dbSets.length === 0) {
    return {
      currentSet: 1,
      sets: [{ ...EMPTY_SET }],
      points,
      isMatchComplete: false,
      dbSets: [],
      currentSetId: null,
    };
  }

  const sets: SetScore[] = dbSets.map(s => ({ playerScore: s.player_score, opponentScore: s.opponent_score }));
  const last = dbSets[dbSets.length - 1];
  const isMatchComplete = markedComplete || isMatchOver(finishedSets(sets), bestOf);

  if (!isMatchComplete && isSetOver(sets[sets.length - 1])) {
    return {
      currentSet: last.set_number + 1,
      sets: [...sets, { ...EMPTY_SET }],
      points,
      isMatchComplete,
      dbSets,
      currentSetId: null,
    };
  }

  return {
    currentSet: last.set_number,
    sets,
    points,
    isMatchComplete,
    dbSets,
    currentSetId: last.id,
  };
};

const MatchTracker = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  const userId = user?.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>({
    currentSet: 1,
    sets: [{ ...EMPTY_SET }],
    points: [],
    isMatchComplete: false,
    dbSets: [],
    currentSetId: null
  });

  /* Point Recording State */
  const [selectedWinner, setSelectedWinner] = useState<Side | null>(null);
  const [winningShot, setWinningShot] = useState<ShotInfo | null>(null);
  const [otherShot, setOtherShot] = useState<ShotInfo | null>(null);
  const [isLuckyPoint, setIsLuckyPoint] = useState<boolean>(false);
  const [isWinningShotMinimized, setIsWinningShotMinimized] = useState<boolean>(false);

  // Guards against a second tap starting another save while one is in flight
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mobile detection hook
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState<boolean>(false);

  const bestOf = match?.best_of ?? DEFAULT_BEST_OF;
  const initialServer: Side = match?.initial_server === 'opponent' ? 'opponent' : 'player';
  const canUndo = matchState.points.length > 0;

  /* Match Data Loading */
  useEffect(() => {
    let cancelled = false;

    const loadMatchData = async () => {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('No match ID provided');
        setLoading(false);
        return;
      }

      if (!userId) {
        setError('You need to be signed in to record a match');
        setLoading(false);
        return;
      }

      try {
        const { match, sets, points } = await api.match.getFullMatchById(id);
        if (cancelled) return;

        if (match.user_id !== userId) {
          setError('This match belongs to another account. You can view its analysis but not record points.');
          return;
        }

        setMatch(match);
        setMatchState(buildMatchState(sets, points, match.best_of ?? DEFAULT_BEST_OF, match.is_complete));
      } catch (err) {
        if (!cancelled) setError(`Failed to load match: ${errorMessage(err)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMatchData();
    return () => {
      cancelled = true;
    };
  }, [id, userId, api]);

  /* Saving helpers */

  // Run a database operation with the double-tap guard held
  const withSaving = async (operation: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await operation();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Write the match score and completion flag, keeping local state in step
  const syncMatchResult = async (sets: SetScore[], allSetsFinished: boolean, isComplete: boolean) => {
    if (!match) return;
    const finished = allSetsFinished ? sets : finishedSets(sets);
    const updates = { match_score: matchScoreString(finished), is_complete: isComplete };
    if (updates.match_score === match.match_score && updates.is_complete === match.is_complete) return;
    await api.match.updateMatch(match.id, updates);
    setMatch(prev => (prev ? { ...prev, ...updates } : prev));
  };

  /* Point Flow Management */
  const resetPointFlow = () => {
    setSelectedWinner(null);
    setWinningShot(null);
    setOtherShot(null);
    setIsLuckyPoint(false);
    setIsWinningShotMinimized(false);
  };

  // Handler for when a player panel is clicked (indicating who won the point)
  const handlePlayerSelect = (winner: Side) => {
    setSelectedWinner(winner);
  };

  // Handler for when a winning shot is selected
  const handleWinningShotSelect = async (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;

    setWinningShot(shot);

    // Auto-minimize winning shot section on mobile after selection
    if (isMobile) {
      setIsWinningShotMinimized(true);
    }

    // A service fault ends the point with no shot from the other player
    try {
      const { shots } = await loadShotData();
      const isServiceFault = shots.some(s => s.id === shot.shotId && s.name === SERVICE_FAULT_SHOT);
      if (!isServiceFault || !selectedWinner) return;

      const noShotId = shots.find(s => s.name === NO_SHOT)?.id;
      if (!noShotId) {
        alert('The "no shot" entry is missing from the shot list, so this service fault can\'t be recorded automatically. Pick the other shot manually.');
        return;
      }

      await recordPoint(selectedWinner, shot, { shotId: noShotId, hand: 'fh' });
    } catch (error) {
      console.error('Failed to check for service fault:', error);
    }
  };

  // Handler for when the other shot is selected
  const handleOtherShotSelect = (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;

    setOtherShot(shot);

    if (winningShot && selectedWinner) {
      recordPoint(selectedWinner, winningShot, shot);
    }
  };

  // Handler for undoing a winning shot selection
  const handleUndoWinningShot = () => {
    setWinningShot(null);
    setIsWinningShotMinimized(false);
  };

  // Handler for undoing an other shot selection
  const handleUndoOtherShot = () => {
    setOtherShot(null);
  };

  /* Point Recording */
  const recordPoint = (winner: Side, winningShot: ShotInfo, otherShot: ShotInfo) =>
    withSaving(async () => {
      if (!match) {
        resetPointFlow();
        return;
      }

      const setIndex = matchState.currentSet - 1;
      const current = matchState.sets[setIndex];
      const newScore: SetScore = {
        playerScore: current.playerScore + (winner === 'player' ? 1 : 0),
        opponentScore: current.opponentScore + (winner === 'opponent' ? 1 : 0),
      };

      try {
        // Find or create the current set's row
        const findOrCreateSet = async (): Promise<MatchSet> => {
          const existing = (await api.set.getSetsByMatchId(match.id)).find(s => s.set_number === matchState.currentSet);
          return existing ?? api.set.createSet({
            match_id: match.id,
            set_number: matchState.currentSet,
            score: setScoreString(EMPTY_SET),
            player_score: 0,
            opponent_score: 0,
          });
        };
        const setRow = matchState.dbSets.find(s => s.id === matchState.currentSetId) ?? await findOrCreateSet();

        const newPoint = await api.point.createPoint({
          set_id: setRow.id,
          match_id: match.id,
          point_number: current.playerScore + current.opponentScore + 1,
          winner,
          winning_shot_id: winningShot.shotId,
          winning_hand: winningShot.hand,
          other_shot_id: otherShot.shotId,
          other_hand: otherShot.hand,
          notes: '',
          is_lucky_shot: isLuckyPoint,
        });

        let updatedSetRow: MatchSet;
        try {
          updatedSetRow = await api.set.updateSet(setRow.id, {
            score: setScoreString(newScore),
            player_score: newScore.playerScore,
            opponent_score: newScore.opponentScore,
          });
        } catch (error) {
          // Keep the point and the set score in step
          await api.point.deletePoint(newPoint.id).catch(() => undefined);
          throw error;
        }

        const otherRows = matchState.dbSets.filter(s => s.id !== updatedSetRow.id);
        const dbSets = [...otherRows, updatedSetRow].sort((a, b) => a.set_number - b.set_number);
        const points = [...matchState.points, newPoint];
        const sets = matchState.sets.map((s, i) => (i === setIndex ? newScore : s));

        if (isSetOver(newScore)) {
          const isComplete = isMatchOver(sets, bestOf);
          await syncMatchResult(sets, true, isComplete).catch(err =>
            console.error('Failed to update match score:', err)
          );

          setMatchState(isComplete
            ? { currentSet: matchState.currentSet, sets, points, isMatchComplete: true, dbSets, currentSetId: updatedSetRow.id }
            : {
                currentSet: matchState.currentSet + 1,
                sets: [...sets, { ...EMPTY_SET }],
                points,
                isMatchComplete: false,
                dbSets,
                currentSetId: null,
              });
        } else {
          setMatchState({ ...matchState, sets, points, dbSets, currentSetId: updatedSetRow.id });
        }
      } catch (error) {
        alert(`Failed to record point: ${errorMessage(error)}`);
      } finally {
        resetPointFlow();
      }
    });

  /* Point Undo */
  const undoLastPoint = () =>
    withSaving(async () => {
      if (!match || matchState.points.length === 0) return;

      // Points are kept in the order they were recorded
      const lastPoint = matchState.points[matchState.points.length - 1];
      const setRow = matchState.dbSets.find(s => s.id === lastPoint.set_id);
      if (!setRow) {
        alert('Could not find the set for the last point. Please refresh and try again.');
        return;
      }

      try {
        await api.point.deletePoint(lastPoint.id);

        const newScore: SetScore = {
          playerScore: Math.max(0, setRow.player_score - (lastPoint.winner === 'player' ? 1 : 0)),
          opponentScore: Math.max(0, setRow.opponent_score - (lastPoint.winner === 'opponent' ? 1 : 0)),
        };
        const updatedSetRow = await api.set.updateSet(setRow.id, {
          score: setScoreString(newScore),
          player_score: newScore.playerScore,
          opponent_score: newScore.opponentScore,
        });

        // Any later sets have no points left in them (the undone point was the
        // most recent), so remove them and return to the undone point's set
        const laterSets = matchState.dbSets.filter(s => s.set_number > setRow.set_number);
        for (const later of laterSets) {
          await api.set.deleteSet(later.id);
        }

        const dbSets = matchState.dbSets
          .filter(s => s.set_number < setRow.set_number)
          .concat(updatedSetRow);
        const points = matchState.points.slice(0, -1);
        const newState = buildMatchState(dbSets, points, bestOf, false);

        await syncMatchResult(newState.sets, false, false);
        setMatchState(newState);
      } catch (error) {
        alert(`Failed to undo the last point: ${errorMessage(error)}. Refresh the page to see the saved state.`);
      }
    });

  /* Set Management */

  // End the current set early, awarding it to whoever is ahead
  const handleEndSet = () =>
    withSaving(async () => {
      if (!match) return;

      const setIndex = matchState.currentSet - 1;
      const current = matchState.sets[setIndex];

      if (setLeader(current) === null) {
        alert('Cannot end set - scores are tied!');
        return;
      }

      try {
        const isComplete = isMatchOver(matchState.sets, bestOf);
        await syncMatchResult(matchState.sets, true, isComplete);

        if (isComplete) {
          setMatchState({ ...matchState, isMatchComplete: true });
          return;
        }

        // Create the next set's row now so a reload knows this set was ended
        const nextSetNumber = matchState.currentSet + 1;
        const nextSet = matchState.dbSets.find(s => s.set_number === nextSetNumber) ?? await api.set.createSet({
          match_id: match.id,
          set_number: nextSetNumber,
          score: setScoreString(EMPTY_SET),
          player_score: 0,
          opponent_score: 0,
        });

        setMatchState({
          currentSet: nextSetNumber,
          sets: [...matchState.sets, { ...EMPTY_SET }],
          points: matchState.points,
          isMatchComplete: false,
          dbSets: [...matchState.dbSets.filter(s => s.id !== nextSet.id), nextSet],
          currentSetId: nextSet.id,
        });
      } catch (error) {
        alert(`Failed to end set: ${errorMessage(error)}`);
      }
    });

  // Calculate who is currently serving
  const getCurrentServer = (): Side =>
    getServer(initialServer, matchState.currentSet, matchState.sets[matchState.currentSet - 1]);

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading match...</p>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="error-container" style={{ 
          margin: '1rem', 
          padding: '1rem', 
          backgroundColor: '#fee2e2', 
          borderRadius: '0.5rem',
          color: '#b91c1c',
          border: '1px solid #ef4444'
        }}>
          <h3>Error Loading Match</h3>
          <p>{error}</p>
          <p>You can try:</p>
          <ul>
            <li>Refreshing the page</li>
            <li>Checking your internet connection</li>
            <li>Logging out and back in</li>
          </ul>
          <div style={{ marginTop: '1rem' }}>
            <button 
              className="btn primary-btn"
              onClick={() => navigate('/matches')}
              style={{ marginRight: '0.5rem' }}
            >
              Return to Matches
            </button>
            <button 
              className="btn outline-btn"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // If the match is complete, show the match summary
  if (matchState.isMatchComplete) {
    return (
      <Layout>
        <div className="match-complete-container">
          <h2>Match Complete</h2>
          
          <div className="match-result">
            <h3>Final Score</h3>
            <p className="final-score">
              You {matchState.sets.filter(set => set.playerScore > set.opponentScore).length} - {' '}
              {matchState.sets.filter(set => set.opponentScore > set.playerScore).length} {match?.opponent_name}
            </p>
          </div>
          
          <div className="set-scores">
            <h3>Set Scores</h3>
            {matchState.sets.map((set, index) => (
              <div key={index} className="set-score-item">
                <span>Set {index + 1}:</span>
                <span>{set.playerScore} - {set.opponentScore}</span>
              </div>
            ))}
          </div>
          
          {/* Point History for the final set */}
          {matchState.points.length > 0 && (
            <div className="match-point-history">
              <h3>Point Flow (Last Set)</h3>
              <PointHistory 
                points={matchState.points}
                currentSet={matchState.currentSet}
                opponentName={match?.opponent_name}
                sets={matchState.dbSets}
                currentSetId={matchState.currentSetId || undefined}
              />
            </div>
          )}
          
          <div className="match-actions">
            {canUndo && (
              <button
                className="btn outline-btn undo-btn"
                onClick={undoLastPoint}
                disabled={isSaving}
                title="Undo the last point and reopen the match"
              >
                ↩️ Undo Last Point
              </button>
            )}
            <button 
              className="btn primary-btn"
              onClick={() => navigate(`/matches/${id}/analysis`)}
            >
              View Analysis
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
  }
  
  return (
    <Layout>
      <div className="match-tracker-container">
        <ScoreBoard 
          currentSet={matchState.currentSet}
          playerScore={matchState.sets[matchState.currentSet - 1].playerScore} 
          opponentScore={matchState.sets[matchState.currentSet - 1].opponentScore}
          opponentName={match?.opponent_name || 'Opponent'}
          currentServer={getCurrentServer()}
          sets={matchState.sets}
        />
        
        {selectedWinner === null ? (
          <>
            {/* Step 1: Select who won the point */}
            <div style={{
              marginTop: '0.07rem',
              marginBottom: '0.2rem',
              textAlign: 'center',
              color: 'var(--light-text-color)'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Tap on who won the point</p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Player Panel with fixed height */}
                <div style={{
                  height: '200px'
                }}>
                  <PlayerPanel 
                    type="player"
                    name="You"
                    onClick={() => handlePlayerSelect('player')}
                  />
                </div>
              
                {/* Set Scores Panel */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100px'
                }}>
                  <div style={{ 
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: '#4b5563',
                    textAlign: 'center'
                  }}>
                    Set Scores
                  </div>
                  {matchState.sets.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: '0.75rem',
                      marginTop: '0.5rem'
                    }}>
                      {matchState.sets.map((set, index) => {
                        // Only show completed sets or current set
                        if (index < matchState.currentSet) {
                          const isWin = set.playerScore > set.opponentScore;
                          const isLoss = set.playerScore < set.opponentScore;
                          // const isTie = set.playerScore === set.opponentScore;
                          
                          const bgColor = isWin ? '#d1fae5' : isLoss ? '#fee2e2' : '#f3f4f6';
                          const borderColor = isWin ? '#10b981' : isLoss ? '#ef4444' : '#d1d5db';
                          
                          return (
                            <div 
                              key={index} 
                              style={{
                                backgroundColor: bgColor,
                                borderRadius: '0.5rem',
                                border: `2px solid ${borderColor}`,
                                padding: '0.5rem',
                                textAlign: 'center',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              <div style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: 600,
                                marginBottom: '0.25rem',
                                color: '#4b5563'
                              }}>
                                Set {index + 1}
                              </div>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <span style={{ 
                                  color: '#2563eb', 
                                  fontWeight: 700, 
                                  fontSize: '1.125rem' 
                                }}>
                                  {set.playerScore}
                                </span>
                                <span style={{ 
                                  color: '#6b7280', 
                                  fontWeight: 400 
                                }}>
                                  -
                                </span>
                                <span style={{ 
                                  color: '#111827', 
                                  fontWeight: 700, 
                                  fontSize: '1.125rem' 
                                }}>
                                  {set.opponentScore}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Opponent Panel with fixed height */}
                <div style={{
                  height: '200px'
                }}>
                  <PlayerPanel 
                    type="opponent"
                    name={match?.opponent_name || 'Opponent'}
                    onClick={() => handlePlayerSelect('opponent')}
                  />
                </div>
                
                {/* Point History Visualization */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100px'
                }}>
                  {matchState.points.length > 0 ? (
                    <PointHistory 
                      points={matchState.points}
                      currentSet={matchState.currentSet}
                      opponentName={match?.opponent_name}
                      sets={matchState.dbSets}
                      currentSetId={matchState.currentSetId || undefined}
                    />
                  ) : (
                    <div className="point-history-title">Point History</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          // Step 2: Select winning shot with lucky option
          <div style={{ marginTop: '-1rem' }}>
            {/* Lucky Point Toggle */}
            <div style={{
              marginBottom: '0.5rem',
              textAlign: 'center',
              padding: '0.5rem',
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              borderRadius: '0.375rem',
              border: 'none'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                gap: '0.5rem'
              }}>
                <input
                  type="checkbox"
                  checked={isLuckyPoint}
                  onChange={(e) => setIsLuckyPoint(e.target.checked)}
                  style={{
                    width: '1.2rem',
                    height: '1.2rem',
                    accentColor: '#2563eb'
                  }}
                />
                <span>Lucky Point? (hit net/edge)</span>
              </label>
            </div>

            <div className="shot-selection-container">
              <div className="shot-selection winning-shot">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{selectedWinner === 'player' ? 'Your' : 'Opponent\'s'} Winning Shot:</h3>
                  {winningShot && isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsWinningShotMinimized(!isWinningShotMinimized)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.25rem'
                      }}
                    >
                      {isWinningShotMinimized ? 'Expand ▼' : 'Minimize ▲'}
                    </button>
                  )}
                </div>
                {(!isMobile || (!isWinningShotMinimized || !winningShot)) && (
                  <ShotSelector
                    onSelect={handleWinningShotSelect}
                    shotType="winning"
                    selected={winningShot}
                    onUndo={handleUndoWinningShot}
                    currentServer={getCurrentServer()}
                    isWinningPlayer={selectedWinner === 'player'}
                  />
                )}
                {isMobile && isWinningShotMinimized && winningShot && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: 'var(--background-color)',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: 'var(--text-color)'
                  }}>
                    Selected: {winningShot.hand.toUpperCase()} shot
                  </div>
                )}
              </div>

              {(!isMobile || (isWinningShotMinimized && winningShot)) && (
                <div className="shot-selection other-shot">
                  <h3>{selectedWinner === 'opponent' ? 'Your' : 'Opponent\'s'} Other Shot:</h3>
                  <ShotSelector
                    onSelect={handleOtherShotSelect}
                    shotType="other"
                    selected={otherShot}
                    disabled={winningShot === null}
                    onUndo={handleUndoOtherShot}
                    currentServer={getCurrentServer()}
                    isWinningPlayer={selectedWinner === 'player'}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* End Match Confirmation */}
        {showEndMatchConfirm && (
          <div className="confirmation-dialog">
            <div className="confirmation-content">
              <h3>End Match?</h3>
              <p>Are you sure you want to end this match? All progress will be saved.</p>
              <div className="confirmation-actions">
                <button 
                  className="btn primary-btn"
                  onClick={() => navigate('/matches')}
                >
                  Yes, End Match
                </button>
                <button 
                  className="btn outline-btn"
                  onClick={() => setShowEndMatchConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="match-controls">
          <button 
            className="btn secondary-btn"
            onClick={() => setShowEndMatchConfirm(true)}
          >
            End Match
          </button>
          
          {/* Only show the Back button when we're in the shot selection flow */}
          {selectedWinner !== null && (
            <>
              <button 
                className="btn outline-btn"
                onClick={() => {
                  // Step back in the point recording flow
                  if (otherShot !== null) {
                    setOtherShot(null);
                  } else if (winningShot !== null) {
                    setWinningShot(null);
                  } else if (selectedWinner !== null) {
                    setSelectedWinner(null);
                  }
                }}
              >
                Back
              </button>
              
              {/* No Data button - skip point without recording */}
              <button
                className="btn outline-btn no-data-btn"
                onClick={() => {
                  // Skip this point without recording anything
                  resetPointFlow();
                }}
                title="Skip this point without recording data"
              >
                No Data
              </button>
            </>
          )}
          
          {/* Undo button for removing the last point */}
          {canUndo && selectedWinner === null && (
            <button 
              className="btn outline-btn undo-btn"
              onClick={undoLastPoint}
              disabled={isSaving}
              title="Undo last point"
            >
              ↩️ Undo
            </button>
          )}
          
          <button 
            className="btn outline-btn"
            onClick={handleEndSet}
            disabled={isSaving}
            title="End this set early and award it to whoever is ahead"
          >
            End Set
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MatchTracker;