import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Match, Point } from '../types/database.types';

type SetScore = {
  playerScore: number;
  opponentScore: number;
};

type MatchState = {
  currentSet: number;
  sets: SetScore[];
  points: Point[];
  isMatchComplete: boolean;
};

type MatchContextType = {
  match: Match | null;
  loading: boolean;
  matchState: MatchState;
  selectedWinner: 'player' | 'opponent' | null;
  winningShot: string | null;
  otherShot: string | null;
  canUndo: boolean;
  initialServer: 'player' | 'opponent';
  
  // Actions
  handlePlayerSelect: (winner: 'player' | 'opponent') => void;
  handleWinningShotSelect: (shot: string) => void;
  handleOtherShotSelect: (shot: string) => void;
  handleUndoWinningShot: () => void;
  handleUndoOtherShot: () => void;
  undoLastPoint: () => void;
  recordPoint: (winner: 'player' | 'opponent', winningShot: string, otherShot: string) => void;
  resetPointFlow: () => void;
  getCurrentServer: () => 'player' | 'opponent';
  getTotalPoints: () => number;
  advanceToNextSet: () => void;
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
};

type MatchProviderProps = {
  children: ReactNode;
  matchId: string;
};

export const MatchProvider: React.FC<MatchProviderProps> = ({ children, matchId }) => {
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
  
  // Initial server state
  const [initialServer, setInitialServer] = useState<'player' | 'opponent'>('player');

  // Load match data
  useEffect(() => {
    // Get match details from localStorage if available
    const getMatchDetails = () => {
      try {
        // Check if we have match details stored in localStorage
        const storedMatch = localStorage.getItem(`match_${matchId}`);
        if (storedMatch) {
          return JSON.parse(storedMatch);
        }
      } catch (error) {
        console.error('Error getting match from localStorage:', error);
      }
      
      // Default fallback if no stored match is found
      return {
        id: matchId || 'new-match',
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
      
      if (mockMatch.initial_server) {
        // Make sure we only use valid values
        const server = mockMatch.initial_server === 'opponent' ? 'opponent' : 'player';
        setInitialServer(server);
      } else {
        setInitialServer('player');
      }
      
      setLoading(false);
    }, 500);
  }, [matchId]);

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
    return serverChangeCount % 2 === 0 ? 
      initialServer : 
      (initialServer === 'player' ? 'opponent' : 'player');
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

  // Force advancement to next set
  const advanceToNextSet = () => {
    const updatedSets = [...matchState.sets];
    updatedSets.push({ playerScore: 0, opponentScore: 0 });
    setMatchState({
      currentSet: matchState.currentSet + 1,
      sets: updatedSets,
      points: matchState.points,
      isMatchComplete: false
    });
  };

  return (
    <MatchContext.Provider
      value={{
        match,
        loading,
        matchState,
        selectedWinner,
        winningShot,
        otherShot,
        canUndo,
        initialServer,
        handlePlayerSelect,
        handleWinningShotSelect,
        handleOtherShotSelect,
        handleUndoWinningShot,
        handleUndoOtherShot,
        undoLastPoint,
        recordPoint,
        resetPointFlow,
        getCurrentServer,
        getTotalPoints,
        advanceToNextSet
      }}
    >
      {children}
    </MatchContext.Provider>
  );
};

export default MatchContext;