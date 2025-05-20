import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlayerPanel from '../components/PlayerPanel';
import ShotSelector from '../components/ShotSelector';
import ScoreBoard from '../components/ScoreBoard';
import PointHistory from '../components/PointHistory';
import { Match, Set, Point } from '../types/database.types';

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
    isMatchComplete: false
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

  // Mock data - will be replaced with Supabase in Stage 3
  useEffect(() => {
    // Get match details from localStorage if available
    const getMatchDetails = () => {
      try {
        // Check if we have match details stored in localStorage
        const storedMatch = localStorage.getItem(`match_${id}`);
        if (storedMatch) {
          return JSON.parse(storedMatch);
        }
      } catch (error) {
        console.error('Error getting match from localStorage:', error);
      }
      
      // Default fallback if no stored match is found
      return {
        id: id || 'new-match',
        user_id: 'user123',
        opponent_name: 'Opponent',
        date: new Date().toISOString().split('T')[0],
        match_score: '0-0',
        notes: '',
        initial_server: 'player',
        created_at: new Date().toISOString()
      };
    };
    
    // Simulate API call
    setTimeout(() => {
      const mockMatch: Match = getMatchDetails();
      setMatch(mockMatch);
      
      // Set the initial server based on the match settings
      // Always log the raw match data to debug
      console.log('Match data loaded:', mockMatch);
      
      if (mockMatch.initial_server) {
        console.log('Setting initial server to:', mockMatch.initial_server);
        // Make sure we only use valid values
        const server = mockMatch.initial_server === 'opponent' ? 'opponent' : 'player';
        setInitialServer(server);
      } else {
        console.log('No initial server found, defaulting to player');
        setInitialServer('player');
      }
      
      setLoading(false);
    }, 500);
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
  const recordPoint = (winner: 'player' | 'opponent', winningShot: string, otherShot: string) => {
    // Create a new point
    const newPoint: Point = {
      id: `point-${Date.now()}`, // Temporary ID
      set_id: `set-${matchState.currentSet}`, // Temporary ID
      point_number: getTotalPoints() + 1,
      winner,
      winning_shot: winningShot,
      other_shot: otherShot,
      notes: ''
    };
    
    // Update scores
    const updatedSets = [...matchState.sets];
    const currentSetIndex = matchState.currentSet - 1;
    
    if (winner === 'player') {
      updatedSets[currentSetIndex].playerScore += 1;
    } else {
      updatedSets[currentSetIndex].opponentScore += 1;
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
      
      if (!isMatchComplete) {
        // Start next set
        updatedSets.push({ playerScore: 0, opponentScore: 0 });
        setMatchState({
          currentSet: matchState.currentSet + 1,
          sets: updatedSets,
          points: [...matchState.points, newPoint],
          isMatchComplete: false
        });
      } else {
        // Match is complete
        setMatchState({
          currentSet: matchState.currentSet,
          sets: updatedSets,
          points: [...matchState.points, newPoint],
          isMatchComplete: true
        });
      }
    } else {
      // Continue current set
      setMatchState({
        ...matchState,
        sets: updatedSets,
        points: [...matchState.points, newPoint]
      });
    }
    
    // Enable undo after recording a point
    setCanUndo(true);
    
    // Reset the point flow
    resetPointFlow();
  };
  
  // Undo the last recorded point
  const undoLastPoint = () => {
    if (matchState.points.length === 0) {
      return; // Nothing to undo
    }
    
    // Copy current state
    const updatedPoints = [...matchState.points];
    const lastPoint = updatedPoints.pop(); // Remove the last point
    
    if (!lastPoint) return;
    
    // Update sets and scores
    const updatedSets = [...matchState.sets];
    
    // Determine which set the last point was in
    const setId = lastPoint.set_id;
    const setNumber = parseInt(setId.split('-')[1], 10);
    
    // If we're in a new set and there are no points in this set,
    // we need to go back to the previous set
    if (setNumber < matchState.currentSet) {
      // We're undoing a point that completed a set, go back to previous set
      updatedSets.pop(); // Remove the current empty set
      
      setMatchState({
        currentSet: matchState.currentSet - 1,
        sets: updatedSets,
        points: updatedPoints,
        isMatchComplete: false // If we can undo, the match is not complete
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
      
      setMatchState({
        ...matchState,
        sets: updatedSets,
        points: updatedPoints
      });
    }
    
    // Disable undo if no more points to undo
    if (updatedPoints.length === 0) {
      setCanUndo(false);
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
            <div className="player-panels">
              <PlayerPanel 
                type="player"
                name="You"
                onClick={() => handlePlayerSelect('player')}
              />
              <PlayerPanel 
                type="opponent"
                name={match?.opponent_name || 'Opponent'}
                onClick={() => handlePlayerSelect('opponent')}
              />
              <div className="point-instruction">
                <p>Tap on who won the point</p>
              </div>
            </div>
            
            {/* Point History Visualization */}
            {matchState.points.length > 0 && (
              <PointHistory 
                points={matchState.points}
                currentSet={matchState.currentSet}
                opponentName={match?.opponent_name}
              />
            )}
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
            onClick={() => {
              // Force next set (manual override)
              const updatedSets = [...matchState.sets];
              updatedSets.push({ playerScore: 0, opponentScore: 0 });
              setMatchState({
                currentSet: matchState.currentSet + 1,
                sets: updatedSets,
                points: matchState.points,
                isMatchComplete: false
              });
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