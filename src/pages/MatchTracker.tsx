import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlayerPanel from '../components/PlayerPanel';
import ShotSelector from '../components/ShotSelector';
import ScoreBoard from '../components/ScoreBoard';
import PointHistory from '../components/PointHistory';
import { Match, Set, Point } from '../types/database.types';
import { matchApi, setApi, pointApi } from '../lib/api';

type SetScore = {
  player: number;
  opponent: number;
};

type MatchState = {
  currentSet: number;
  sets: {
    playerScore: number;
    opponentScore: number;
  }[];
  points: Point[];
  isMatchComplete: boolean;
  // Adding an array of database sets for mapping set_number to set_id
  dbSets: Set[];
  // Track the current set's ID
  currentSetId: string | null;
};

const MatchTracker = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchState, setMatchState] = useState<MatchState>({
    currentSet: 1,
    sets: [{ playerScore: 0, opponentScore: 0 }],
    points: [],
    isMatchComplete: false,
    dbSets: [],
    currentSetId: null
  });
  
  // State for the point recording flow
  const [selectedWinner, setSelectedWinner] = useState<'player' | 'opponent' | null>(null);
  const [winningShot, setWinningShot] = useState<string | null>(null);
  const [otherShot, setOtherShot] = useState<string | null>(null);
  
  // State for tracking if we can undo the last point
  const [canUndo, setCanUndo] = useState<boolean>(false);
  
  // State for end match confirmation
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState<boolean>(false);
  
  // We need to track the initial server separately from the current server
  // Default to 'player' but this will be overridden by the match data if available
  const [initialServer, setInitialServer] = useState<'player' | 'opponent'>('player');

  // Debug log to track API URL
  useEffect(() => {
    console.log('[MatchTracker] API URL:', import.meta.env.VITE_API_URL);
  }, []);

  // Load match data
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        console.log('[MatchTracker] Loading match data for ID:', id);
        // Try to fetch match data from the API
        const matchData = await matchApi.getFullMatchById(id || '').catch((err) => {
          console.error('[MatchTracker] Error fetching match data:', err);
          return null;
        });
        
        if (matchData) {
          console.log('[MatchTracker] Match data loaded successfully:', matchData);
          // Match exists in the database
          const { match, sets, points } = matchData;
          
          // Set match data
          setMatch(match);
          
          // Set initial server
          if (match.initial_server) {
            const server = match.initial_server === 'opponent' ? 'opponent' : 'player';
            setInitialServer(server);
          } else {
            setInitialServer('player');
          }
          
          // Convert sets to the format used in state
          const matchSets = sets.map(set => ({
            playerScore: set.player_score,
            opponentScore: set.opponent_score
          }));
          
          // Ensure we have at least one set
          if (matchSets.length === 0) {
            matchSets.push({ playerScore: 0, opponentScore: 0 });
          }
          
          // Set the current set to the last one
          const currentSet = sets.length > 0 ? sets[sets.length - 1].set_number : 1;
          
          // Find the current set ID
          const currentSetId = sets.length > 0 ? sets[sets.length - 1].id : null;
          
          console.log('[MatchTracker] Setting initial state with:', {
            sets, 
            points, 
            currentSet, 
            currentSetId
          });
          
          setMatchState({
            currentSet,
            sets: matchSets,
            points,
            isMatchComplete: false, // We'll calculate this based on sets later
            dbSets: sets, // Store the database sets for ID mapping
            currentSetId
          });
        } else {
          console.log('[MatchTracker] Match not found in database, checking localStorage');
          // Match doesn't exist in DB, fallback to localStorage
          // In real implementation, you would redirect to 404 or create a new match
          try {
            // Check if we have match details stored in localStorage
            const storedMatch = localStorage.getItem(`match_${id}`);
            if (storedMatch) {
              console.log('[MatchTracker] Found match in localStorage:', storedMatch);
              const parsedMatch = JSON.parse(storedMatch);
              
              // Create match in database
              console.log('[MatchTracker] Creating match in database from localStorage data');
              const newMatch = await matchApi.createMatch({
                user_id: parsedMatch.user_id || '00000000-0000-0000-0000-000000000001',
                opponent_name: parsedMatch.opponent_name || 'Opponent',
                date: parsedMatch.date || new Date().toISOString().split('T')[0],
                match_score: parsedMatch.match_score || '0-0',
                notes: parsedMatch.notes || '',
                initial_server: parsedMatch.initial_server || 'player'
              });
              
              console.log('[MatchTracker] Match created successfully:', newMatch);
              setMatch(newMatch);
              
              if (newMatch.initial_server) {
                const server = newMatch.initial_server === 'opponent' ? 'opponent' : 'player';
                setInitialServer(server);
              } else {
                setInitialServer('player');
              }
            } else {
              console.log('[MatchTracker] No match found in localStorage, creating default match');
              // Create a default match
              const defaultMatch = {
                user_id: '00000000-0000-0000-0000-000000000001', // Use our test user ID
                opponent_name: 'Opponent',
                date: new Date().toISOString().split('T')[0],
                match_score: '0-0',
                notes: '',
                initial_server: 'player'
              };
              
              const newMatch = await matchApi.createMatch(defaultMatch);
              console.log('[MatchTracker] Default match created successfully:', newMatch);
              setMatch(newMatch);
              setInitialServer('player');
            }
          } catch (error) {
            console.error('[MatchTracker] Error creating match:', error);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[MatchTracker] Error loading match data:', error);
        setLoading(false);
      }
    };
    
    loadMatchData();
  }, [id]);
  
  // Reset point flow when a point is completed
  const resetPointFlow = () => {
    setSelectedWinner(null);
    setWinningShot(null);
    setOtherShot(null);
  };
  
  // Handler for when a player panel is clicked (indicating who won the point)
  const handlePlayerSelect = (winner: 'player' | 'opponent') => {
    setSelectedWinner(winner);
  };
  
  // Handler for when a winning shot is selected
  const handleWinningShotSelect = (shot: string) => {
    setWinningShot(shot);
  };
  
  // Handler for when the other shot is selected
  const handleOtherShotSelect = (shot: string) => {
    setOtherShot(shot);
    
    // Only record the point if both shots are selected
    if (winningShot) {
      recordPoint(selectedWinner!, winningShot, shot);
    }
  };
  
  // Handler for undoing a winning shot selection
  const handleUndoWinningShot = () => {
    setWinningShot(null);
  };
  
  // Handler for undoing an other shot selection
  const handleUndoOtherShot = () => {
    setOtherShot(null);
  };
  
  // Record a point with all the data collected
  const recordPoint = async (winner: 'player' | 'opponent', winningShot: string, otherShot: string) => {
    if (!match) {
      console.error('[MatchTracker] Cannot record point: match is null');
      return;
    }
    
    console.log('[MatchTracker] Recording point:', { winner, winningShot, otherShot });
    try {
      // Update local state first for immediate UI feedback
      // Create a new point
      const pointNumber = getTotalPoints() + 1;
      
      // Update scores in local state
      const updatedSets = [...matchState.sets];
      const currentSetIndex = matchState.currentSet - 1;
      
      if (winner === 'player') {
        updatedSets[currentSetIndex].playerScore += 1;
      } else {
        updatedSets[currentSetIndex].opponentScore += 1;
      }
      
      // Get or create set in database
      console.log('[MatchTracker] Getting sets for match ID:', match.id);
      let currentSetData;
      try {
        const sets = await setApi.getSetsByMatchId(match.id);
        console.log('[MatchTracker] Sets retrieved:', sets);
        const existingSet = sets.find(s => s.set_number === matchState.currentSet);
        
        if (!existingSet) {
          // Create new set in database
          console.log('[MatchTracker] Creating new set for match');
          currentSetData = await setApi.createSet({
            match_id: match.id,
            set_number: matchState.currentSet,
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          });
          console.log('[MatchTracker] Set created:', currentSetData);
        } else {
          // Update existing set
          console.log('[MatchTracker] Updating existing set:', existingSet.id);
          currentSetData = await setApi.updateSet(existingSet.id, {
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          });
          console.log('[MatchTracker] Set updated:', currentSetData);
        }
      } catch (error) {
        console.error('[MatchTracker] Error getting/creating set:', error);
        throw error;
      }
      
      // Create point in database
      console.log('[MatchTracker] Creating point in database');
      const newPoint = await pointApi.createPoint({
        set_id: currentSetData.id,
        point_number: pointNumber,
        winner,
        winning_shot: winningShot,
        other_shot: otherShot,
        notes: ''
      });
      console.log('[MatchTracker] Point created:', newPoint);
      
      // Check if current set is complete
      const currentSet = updatedSets[currentSetIndex];
      const isSetComplete = isSetOver(currentSet.playerScore, currentSet.opponentScore);
      
      if (isSetComplete) {
        // Determine if match is over (best of X, where X is an odd number)
        const bestOf = 5; // This should come from match settings later
        const playerSetsWon = updatedSets.filter(set => set.playerScore > set.opponentScore).length;
        const opponentSetsWon = updatedSets.filter(set => set.opponentScore > set.playerScore).length;
        const isMatchComplete = playerSetsWon > bestOf / 2 || opponentSetsWon > bestOf / 2;
        
        // Update match score in database
        console.log('[MatchTracker] Updating match score:', `${playerSetsWon}-${opponentSetsWon}`);
        await matchApi.updateMatch(match.id, {
          match_score: `${playerSetsWon}-${opponentSetsWon}`
        });
        
        if (!isMatchComplete) {
          // Start next set
          console.log('[MatchTracker] Starting next set');
          updatedSets.push({ playerScore: 0, opponentScore: 0 });
          
          // Create a new set in the database for the next set
          console.log('[MatchTracker] Creating next set in database');
          const nextSetData = await setApi.createSet({
            match_id: match.id,
            set_number: matchState.currentSet + 1,
            score: '0-0',
            player_score: 0,
            opponent_score: 0
          });
          
          console.log('[MatchTracker] Next set created:', nextSetData);
          
          setMatchState({
            currentSet: matchState.currentSet + 1,
            sets: updatedSets,
            points: [...matchState.points, newPoint],
            isMatchComplete: false,
            dbSets: [...matchState.dbSets, nextSetData],
            currentSetId: nextSetData.id
          });
        } else {
          // Match is complete
          console.log('[MatchTracker] Match complete');
          setMatchState({
            currentSet: matchState.currentSet,
            sets: updatedSets,
            points: [...matchState.points, newPoint],
            isMatchComplete: true,
            dbSets: matchState.dbSets,
            currentSetId: matchState.currentSetId
          });
        }
      } else {
        // Continue current set
        console.log('[MatchTracker] Continuing current set');
        
        // Update dbSets with the current set data if needed
        let updatedDbSets = [...matchState.dbSets];
        let updatedCurrentSetId = matchState.currentSetId;
        
        // If we don't have a currentSetId yet, but we now have a set in the database, use it
        if (!matchState.currentSetId) {
          updatedCurrentSetId = currentSetData.id;
          
          // Also update the dbSets if it's empty or doesn't include this set
          const setExists = updatedDbSets.some(s => s.id === currentSetData.id);
          if (!setExists) {
            updatedDbSets = [...updatedDbSets, currentSetData];
          }
        }
        
        console.log('[MatchTracker] Updating state with currentSetId:', updatedCurrentSetId);
        
        setMatchState({
          ...matchState,
          sets: updatedSets,
          points: [...matchState.points, newPoint],
          dbSets: updatedDbSets,
          currentSetId: updatedCurrentSetId
        });
      }
      
      // Enable undo after recording a point
      setCanUndo(true);
      
      // Reset the point flow
      resetPointFlow();
    } catch (error) {
      console.error('[MatchTracker] Error recording point:', error);
    }
  };
  
  // Undo the last recorded point
  const undoLastPoint = async () => {
    if (!match || matchState.points.length === 0) {
      console.error('[MatchTracker] Cannot undo: match is null or no points');
      return; // Nothing to undo
    }
    
    console.log('[MatchTracker] Undoing last point');
    try {
      // Copy current state
      const updatedPoints = [...matchState.points];
      const lastPoint = updatedPoints.pop(); // Remove the last point
      
      if (!lastPoint) return;
      
      // Delete point from database
      console.log('[MatchTracker] Deleting point from database:', lastPoint.id);
      await pointApi.deletePoint(lastPoint.id);
      
      // Update sets and scores
      const updatedSets = [...matchState.sets];
      
      // Get set for the last point
      console.log('[MatchTracker] Getting sets for match ID:', match.id);
      const sets = await setApi.getSetsByMatchId(match.id);
      const setData = sets.find(s => s.id === lastPoint.set_id);
      
      if (!setData) {
        console.error('[MatchTracker] Set not found for point:', lastPoint);
        return;
      }
      
      const setNumber = setData.set_number;
      
      // If we're in a new set and there are no points in this set,
      // we need to go back to the previous set
      if (setNumber < matchState.currentSet) {
        // We're undoing a point that completed a set, go back to previous set
        updatedSets.pop(); // Remove the current empty set
        
        // Get the previous set's ID (we're going back one set)
        const updatedDbSets = [...matchState.dbSets];
        // Remove the last set
        if (updatedDbSets.length > 0) {
          updatedDbSets.pop();
        }
        
        // Find the new current set ID (the last one in the list)
        const newCurrentSetId = updatedDbSets.length > 0 ? updatedDbSets[updatedDbSets.length - 1].id : null;
        
        console.log('[MatchTracker] Going back to previous set, set ID:', newCurrentSetId);
        setMatchState({
          currentSet: matchState.currentSet - 1,
          sets: updatedSets,
          points: updatedPoints,
          isMatchComplete: false, // If we can undo, the match is not complete
          dbSets: updatedDbSets,
          currentSetId: newCurrentSetId
        });
      } else {
        // Normal undo within the current set
        const currentSetIndex = matchState.currentSet - 1;
        
        // Decrement the score based on who won the point
        if (lastPoint.winner === 'player') {
          updatedSets[currentSetIndex].playerScore -= 1;
        } else {
          updatedSets[currentSetIndex].opponentScore -= 1;
        }
        
        // Update set in database
        console.log('[MatchTracker] Updating set in database:', setData.id);
        await setApi.updateSet(setData.id, {
          score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
          player_score: updatedSets[currentSetIndex].playerScore,
          opponent_score: updatedSets[currentSetIndex].opponentScore
        });
        
        console.log('[MatchTracker] Updating local state');
        setMatchState({
          ...matchState,
          sets: updatedSets,
          points: updatedPoints,
          dbSets: matchState.dbSets,
          currentSetId: matchState.currentSetId
        });
      }
      
      // Disable undo if no more points to undo
      if (updatedPoints.length === 0) {
        setCanUndo(false);
      }
    } catch (error) {
      console.error('[MatchTracker] Error undoing point:', error);
    }
  };
  
  // Helper to check if a set is over
  const isSetOver = (playerScore: number, opponentScore: number) => {
    const pointsToWin = 11;
    const minPointDifference = 2;
    
    if (playerScore >= pointsToWin && playerScore - opponentScore >= minPointDifference) {
      return true;
    }
    
    if (opponentScore >= pointsToWin && opponentScore - playerScore >= minPointDifference) {
      return true;
    }
    
    return false;
  };
  
  // Get total points in current set
  const getTotalPoints = () => {
    const currentSetIndex = matchState.currentSet - 1;
    const currentSet = matchState.sets[currentSetIndex];
    return currentSet.playerScore + currentSet.opponentScore;
  };
  
  // Calculate who is currently serving
  const getCurrentServer = (): 'player' | 'opponent' => {
    const totalPoints = getTotalPoints();
    // In table tennis, service changes every 2 points
    const serverChangeCount = Math.floor(totalPoints / 2);
    
    // First server is determined by the match settings (initial server)
    // Return the opposite of initial server if server has changed
    const currentServer = serverChangeCount % 2 === 0 ? 
      initialServer : 
      (initialServer === 'player' ? 'opponent' : 'player');
      
    console.log('Total points:', totalPoints, 'Server change count:', serverChangeCount, 'Initial server:', initialServer, 'Current server:', currentServer);
    return currentServer;
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading match...</p>
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
                currentSetId={matchState.currentSetId}
              />
            </div>
          )}
          
          <div className="match-actions">
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
              marginTop: '0.1rem',
              marginBottom: '0.25rem',
              textAlign: 'center',
              color: 'var(--light-text-color)'
            }}>
              <p style={{ margin: 0 }}>Tap on who won the point</p>
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
                          const isTie = set.playerScore === set.opponentScore;
                          
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
                      currentSetId={matchState.currentSetId}
                    />
                  ) : (
                    <div className="point-history-title">Point History</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          // Step 2: Select both winning and other shots at the same time
          <div className="shot-selection-container">
            
            <div className="shot-selection winning-shot">
              <h3>{selectedWinner === 'player' ? 'Your' : 'Opponent\'s'} Winning Shot:</h3>
              <ShotSelector 
                onSelect={handleWinningShotSelect}
                shotType="winning"
                selected={winningShot}
                onUndo={handleUndoWinningShot}
                currentServer={getCurrentServer()}
                isWinningPlayer={selectedWinner === 'player'}
              />
            </div>
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
            {winningShot && otherShot && winningShot !== 'no_data' && (
              <div className="submit-shots">
                <button 
                  className="btn primary-btn record-point-btn"
                  onClick={() => recordPoint(selectedWinner!, winningShot, otherShot)}
                >
                  Record Point
                </button>
              </div>
            )}
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
              
              {/* No Data button */}
              <button
                className="btn outline-btn no-data-btn"
                onClick={() => {
                  setWinningShot('no_data');
                  setOtherShot('no_data');
                  recordPoint(selectedWinner!, 'no_data', 'no_data');
                }}
                title="Record point without shot data"
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
              title="Undo last point"
            >
              ↩️ Undo
            </button>
          )}
          
          <button 
            className="btn outline-btn"
            onClick={async () => {
              // Force next set (manual override)
              if (!match) {
                console.error('[MatchTracker] Cannot advance to next set: match is null');
                return;
              }
              
              console.log('[MatchTracker] Advancing to next set');
              try {
                const updatedSets = [...matchState.sets];
                updatedSets.push({ playerScore: 0, opponentScore: 0 });
                
                // Create a new set in the database
                console.log('[MatchTracker] Creating new set in database');
                const newSet = await setApi.createSet({
                  match_id: match.id,
                  set_number: matchState.currentSet + 1,
                  score: '0-0',
                  player_score: 0,
                  opponent_score: 0
                });
                
                console.log('[MatchTracker] Updating local state');
                setMatchState({
                  currentSet: matchState.currentSet + 1,
                  sets: updatedSets,
                  points: matchState.points,
                  isMatchComplete: false,
                  dbSets: [...matchState.dbSets, newSet],
                  currentSetId: newSet.id
                });
              } catch (error) {
                console.error('[MatchTracker] Error advancing to next set:', error);
              }
            }}
          >
            Next Set
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default MatchTracker;