import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlayerPanel from '../components/PlayerPanel';
import ShotSelector from '../components/ShotSelector/index';
import ScoreBoard from '../components/ScoreBoard';
import PointHistory from '../components/PointHistory';
import { Match, MatchSet, Point, ShotInfo } from '../types/database.types';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';


type MatchState = {
  currentSet: number;
  sets: {
    playerScore: number;
    opponentScore: number;
  }[];
  points: Point[];
  isMatchComplete: boolean;
  // Adding an array of database sets for mapping set_number to set_id
  dbSets: MatchSet[];
  // Track the current set's ID
  currentSetId: string | null;
};

const MatchTracker = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const api = useApi();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>({
    currentSet: 1,
    sets: [{ playerScore: 0, opponentScore: 0 }],
    points: [],
    isMatchComplete: false,
    dbSets: [],
    currentSetId: null
  });
  
  /* Point Recording State */
  const [selectedWinner, setSelectedWinner] = useState<'player' | 'opponent' | null>(null);
  const [winningShot, setWinningShot] = useState<ShotInfo | null>(null);
  const [otherShot, setOtherShot] = useState<ShotInfo | null>(null);
  
  // State for tracking if we can undo the last point
  const [canUndo, setCanUndo] = useState<boolean>(false);
  
  // State for end match confirmation
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState<boolean>(false);
  
  /* Server Tracking */
  // Initial server is tracked separately from current server
  // Default to 'player' but will be overridden by match data if available
  const [initialServer, setInitialServer] = useState<'player' | 'opponent'>('player');

  /* Match Data Loading */
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        setLoading(true);
        setError(null); // Reset any previous errors
        
        if (!id) {
          const errorMsg = 'No match ID provided';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        // Check user authentication
        if (!user) {
          const errorMsg = 'User not authenticated, cannot load match';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        try {
          // Use the API hook to fetch match data - token handling is automatic
          const matchData = await api.match.getFullMatchById(id);
          // Match exists in the database
          const { match, sets, points } = matchData;
          
          // Set match data
          setMatch(match);
          
          // Set initial server
          setInitialServer(match.initial_server || 'player');
          
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
          
          setMatchState({
            currentSet,
            sets: matchSets,
            points,
            isMatchComplete: false, // We'll calculate this based on sets later
            dbSets: sets, // Store the database sets for ID mapping
            currentSetId
          });
          
          // Set canUndo based on whether there are points
          setCanUndo(points.length > 0);
          
        } catch (err) {
          // Match doesn't exist in database or couldn't be loaded
          console.error('Error loading match:', err);
          
          // Create a default match
          const defaultMatch = {
            opponent_name: 'Opponent',
            date: new Date().toISOString().split('T')[0],
            match_score: '0-0',
            notes: '',
            initial_server: 'player' as 'player' | 'opponent'
          };
          
          // Try to get data from localStorage for backward compatibility
          try {
            const storedMatch = localStorage.getItem(`match_${id}`);
            if (storedMatch) {
              const parsedMatch = JSON.parse(storedMatch);
              
              // Override default values with stored ones
              defaultMatch.opponent_name = parsedMatch.opponent_name || defaultMatch.opponent_name;
              defaultMatch.date = parsedMatch.date || defaultMatch.date;
              defaultMatch.notes = parsedMatch.notes || defaultMatch.notes;
              defaultMatch.initial_server = parsedMatch.initial_server || defaultMatch.initial_server;
            }
          } catch (e) {
            console.error('Error reading from localStorage:', e);
          }
          
          // Create the match in database using the API hook
          try {
            const newMatch = await api.match.createMatch(defaultMatch);
            setMatch(newMatch);
            setInitialServer(defaultMatch.initial_server);
          } catch (createError) {
            console.error('Error creating match:', createError);
            setError(`Failed to create match: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
            throw createError;
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading match data:', error);
        setError(`Failed to load match: ${error instanceof Error ? error instanceof Error ? error.message : "Unknown error" : 'Unknown error'}`);
        setLoading(false);
      }
    };
    
    loadMatchData();
  }, [id, user]);
  
  /* Point Flow Management */
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
  const handleWinningShotSelect = (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;
    setWinningShot(shot);
  };
  
  // Handler for when the other shot is selected
  const handleOtherShotSelect = (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;
    
    // Save the shot info in state
    setOtherShot(shot);
    
    // Always record the point immediately after other shot is selected
    if (winningShot && selectedWinner) {
      recordPoint(selectedWinner, winningShot, shot);
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
  const recordPoint = async (winner: 'player' | 'opponent', winningShot: ShotInfo, otherShot: ShotInfo) => {
    if (!match) {
      console.error('Cannot record point: match is null');
      resetPointFlow();
      return;
    }
    
    // API calls are now handled by the useApi hook with automatic token handling
    
    try {
      // Update local state first for immediate UI feedback
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
      let currentSetData;
      
      // If we already have a currentSetId, use that
      if (matchState.currentSetId) {
        // Update existing set
        const setUpdateData = {
          score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
          player_score: updatedSets[currentSetIndex].playerScore,
          opponent_score: updatedSets[currentSetIndex].opponentScore
        };
        
        try {
          currentSetData = await api.set.updateSet(matchState.currentSetId, setUpdateData);
        } catch (error) {
          console.error('Error updating set:', error);
          throw new Error(`Failed to update set: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } else {
        // Get sets for this match
        let sets;
        try {
          sets = await api.set.getSetsByMatchId(match.id);
        } catch (error) {
          console.error('Error fetching sets:', error);
          throw new Error(`Failed to fetch sets: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        const existingSet = sets.find(s => s.set_number === matchState.currentSet);
        
        if (existingSet) {
          // Update existing set
          const setUpdateData = {
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          };
          
          try {
            currentSetData = await api.set.updateSet(existingSet.id, setUpdateData);
          } catch (error) {
            console.error('Error updating existing set:', error);
            throw new Error(`Failed to update set: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else {
          // Create new set in database
          const newSetData = {
            match_id: match.id,
            set_number: matchState.currentSet,
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          };
          
          try {
            currentSetData = await api.set.createSet(newSetData);
          } catch (error) {
            console.error('Error creating set:', error);
            throw new Error(`Failed to create set: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }
      }
      
      // Create point in database
      // Use direct shot IDs and hands from the ShotInfo objects
      const pointData = {
        set_id: currentSetData.id,
        match_id: match.id,
        point_number: pointNumber,
        winner,
        winning_shot_id: winningShot.shotId,
        winning_hand: winningShot.hand,
        other_shot_id: otherShot.shotId,
        other_hand: otherShot.hand,
        notes: ''
      };
      
      // Create the point in the database
      
      let newPoint;
      try {
        // Creating point with API hook (automatic token handling)
        newPoint = await api.point.createPoint(pointData);
      } catch (error) {
        console.error('Error creating point:', error);
        throw new Error(`Failed to create point: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
      
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
        try {
          await api.match.updateMatch(match.id, {
            match_score: `${playerSetsWon}-${opponentSetsWon}`
          });
        } catch (error) {
          console.error('Error updating match score:', error);
          // Continue execution even if match score update fails
        }
        
        if (!isMatchComplete) {
          // Start next set
          updatedSets.push({ playerScore: 0, opponentScore: 0 });
          
          // Create a new set in the database
          let nextSetData;
          try {
            nextSetData = await api.set.createSet({
              match_id: match.id,
              set_number: matchState.currentSet + 1,
              score: '0-0',
              player_score: 0,
              opponent_score: 0
            });
          } catch (error) {
            console.error('Error creating next set:', error);
            throw new Error(`Failed to create next set: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
          
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
        // Update dbSets with the current set data if needed
        let updatedDbSets = [...matchState.dbSets];
        
        // If currentSetData isn't in dbSets yet, add it
        if (!updatedDbSets.some(set => set.id === currentSetData.id)) {
          // Find the index where this set should go (by set_number)
          const insertIndex = updatedDbSets.findIndex(set => set.set_number > currentSetData.set_number);
          
          if (insertIndex === -1) {
            // Add to end if no higher set_number found
            updatedDbSets.push(currentSetData);
          } else {
            // Insert at the correct position
            updatedDbSets.splice(insertIndex, 0, currentSetData);
          }
        } else {
          // Update the existing set in dbSets
          updatedDbSets = updatedDbSets.map(set => 
            set.id === currentSetData.id ? currentSetData : set
          );
        }
        
        setMatchState({
          ...matchState,
          sets: updatedSets,
          points: [...matchState.points, newPoint],
          dbSets: updatedDbSets,
          currentSetId: currentSetData.id
        });
      }
      
      // Enable undo after recording a point
      setCanUndo(true);
      
      // Reset the point flow
      resetPointFlow();
      
    } catch (error) {
      console.error('Error recording point:', error);
      alert('Failed to record point. Please try again.');
      resetPointFlow();
    }
  };
  
  // Undo the last recorded point
  const undoLastPoint = async () => {
    if (!match || matchState.points.length === 0) {
      console.error('Cannot undo: match is null or no points');
      return; // Nothing to undo
    }
    
    try {
      // Get the most recent point
      // Filter points that belong to the current match
      const matchPoints = matchState.points.filter(point => {
        // Find the set this point belongs to
        const pointSet = matchState.dbSets.find(set => set.id === point.set_id);
        return pointSet && pointSet.match_id === match.id;
      });
      
      if (matchPoints.length === 0) {
        console.error('No points to undo for this match');
        return;
      }
      
      // Sort by date created, most recent first
      const sortedPoints = [...matchPoints].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      const lastPoint = sortedPoints[0];
      
      // Delete point from database
      try {
        await api.point.deletePoint(lastPoint.id);
      } catch (error) {
        console.error('Error deleting point:', error);
        throw new Error(`Failed to delete point: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
      
      // Find the set this point belongs to
      const setData = matchState.dbSets.find(set => set.id === lastPoint.set_id);
      
      if (!setData) {
        console.error('Set not found for point:', lastPoint.id);
        return;
      }
      
      // Copy current state
      const updatedSets = [...matchState.sets];
      
      // If we're in a new set and there are no remaining points in this set,
      // we need to go back to the previous set
      const remainingPointsInCurrentSet = matchState.points
        .filter(p => p.id !== lastPoint.id)
        .filter(p => p.set_id === matchState.currentSetId)
        .length;
      
      const isCurrentlyInNewSet = setData.set_number < matchState.currentSet;
      
      if (isCurrentlyInNewSet && remainingPointsInCurrentSet === 0) {
        // We're undoing a point that completed a set, go back to previous set
        updatedSets.pop(); // Remove the current empty set
        
        // Get updated dbSets without the current set
        const updatedDbSets = matchState.dbSets.filter(set => set.set_number < matchState.currentSet);
        
        // Find the new current set ID (the last one in the list)
        const newCurrentSetId = updatedDbSets.length > 0 ? updatedDbSets[updatedDbSets.length - 1].id : null;
        
        // Remove the point from our points array
        const updatedPoints = matchState.points.filter(p => p.id !== lastPoint.id);
        
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
        const setIndex = matchState.sets.findIndex((_, index) => index + 1 === setData.set_number);
        
        if (setIndex >= 0) {
          // Decrement the score based on who won the point
          if (lastPoint.winner === 'player') {
            updatedSets[setIndex].playerScore -= 1;
          } else {
            updatedSets[setIndex].opponentScore -= 1;
          }
          
          // Update set in database
          try {
            await api.set.updateSet(setData.id, {
              score: `${updatedSets[setIndex].playerScore}-${updatedSets[setIndex].opponentScore}`,
              player_score: updatedSets[setIndex].playerScore,
              opponent_score: updatedSets[setIndex].opponentScore
            });
          } catch (error) {
            console.error('Error updating set after deleting point:', error);
            throw new Error(`Failed to update set: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
          
          // Update the matching set in dbSets
          const updatedDbSets = matchState.dbSets.map(set => {
            if (set.id === setData.id) {
              return {
                ...set,
                score: `${updatedSets[setIndex].playerScore}-${updatedSets[setIndex].opponentScore}`,
                player_score: updatedSets[setIndex].playerScore,
                opponent_score: updatedSets[setIndex].opponentScore
              };
            }
            return set;
          });
          
          // Remove the point from our points array
          const updatedPoints = matchState.points.filter(p => p.id !== lastPoint.id);
          
          setMatchState({
            ...matchState,
            sets: updatedSets,
            points: updatedPoints,
            dbSets: updatedDbSets
          });
        }
      }
      
      // Disable undo if no more points to undo
      setCanUndo(matchState.points.length > 1);
    } catch (error) {
      console.error('Error undoing point:', error);
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
            {/* Record Point button removed - point is now recorded automatically when other shot is selected */}
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
                  // Create a point without shot data by passing null values
                  // The server will handle this appropriately
                  const noDataShot: ShotInfo = {
                    shotId: null as any, // Using null for the shotId
                    hand: null as any // Using null for the hand
                  };
                  
                  // Record the point without shot data
                  recordPoint(selectedWinner!, noDataShot, noDataShot);
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
              
              try {
                const updatedSets = [...matchState.sets];
                updatedSets.push({ playerScore: 0, opponentScore: 0 });
                
                // Create a new set in the database
                let newSet;
                try {
                  newSet = await api.set.createSet({
                    match_id: match.id,
                    set_number: matchState.currentSet + 1,
                    score: '0-0',
                    player_score: 0,
                    opponent_score: 0
                  });
                } catch (error) {
                  console.error('[MatchTracker] Error creating set:', error);
                  throw new Error(`Failed to create set: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
                
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