import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Match, Point } from '../types/database.types';
import { matchApi, setApi, pointApi } from '../lib/api';

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

  // Debug log to track API URL
  useEffect(() => {
    console.log('[MatchContext] API URL:', import.meta.env.VITE_API_URL);
  }, []);

  // Load match data
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        console.log('[MatchContext] Loading match data for ID:', matchId);
        // Try to fetch match data from the API
        const matchData = await matchApi.getFullMatchById(matchId).catch((err) => {
          console.error('[MatchContext] Error fetching match data:', err);
          return null;
        });
        
        if (matchData) {
          console.log('[MatchContext] Match data loaded successfully:', matchData);
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
          
          setMatchState({
            currentSet,
            sets: matchSets,
            points,
            isMatchComplete: false // We'll calculate this based on sets later
          });
        } else {
          console.log('[MatchContext] Match not found in database, checking localStorage');
          // Match doesn't exist in DB, fallback to localStorage
          // In real implementation, you would redirect to 404 or create a new match
          try {
            // Check if we have match details stored in localStorage
            const storedMatch = localStorage.getItem(`match_${matchId}`);
            if (storedMatch) {
              console.log('[MatchContext] Found match in localStorage:', storedMatch);
              const parsedMatch = JSON.parse(storedMatch);
              
              // Create match in database
              console.log('[MatchContext] Creating match in database from localStorage data');
              const newMatch = await matchApi.createMatch({
                user_id: parsedMatch.user_id || '00000000-0000-0000-0000-000000000001',
                opponent_name: parsedMatch.opponent_name || 'Opponent',
                date: parsedMatch.date || new Date().toISOString().split('T')[0],
                match_score: parsedMatch.match_score || '0-0',
                notes: parsedMatch.notes || '',
                initial_server: parsedMatch.initial_server || 'player'
              });
              
              console.log('[MatchContext] Match created successfully:', newMatch);
              setMatch(newMatch);
              
              if (newMatch.initial_server) {
                const server = newMatch.initial_server === 'opponent' ? 'opponent' : 'player';
                setInitialServer(server);
              } else {
                setInitialServer('player');
              }
            } else {
              console.log('[MatchContext] No match found in localStorage, creating default match');
              // Create a default match
              const defaultMatch: Omit<Match, 'id' | 'created_at' | 'updated_at'> = {
                user_id: '00000000-0000-0000-0000-000000000001', // Use our test user ID
                opponent_name: 'Opponent',
                date: new Date().toISOString().split('T')[0],
                match_score: '0-0',
                notes: '',
                initial_server: 'player'
              };
              
              const newMatch = await matchApi.createMatch(defaultMatch);
              console.log('[MatchContext] Default match created successfully:', newMatch);
              setMatch(newMatch);
              setInitialServer('player');
            }
          } catch (error) {
            console.error('[MatchContext] Error creating match:', error);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[MatchContext] Error loading match data:', error);
        setLoading(false);
      }
    };
    
    loadMatchData();
  }, [matchId]);

  // Reset point flow when a point is completed
  const resetPointFlow = () => {
    setSelectedWinner(null);
    setWinningShot(null);
    setOtherShot(null);
  };

  // Handler for when a player panel is clicked (indicating who won the point)
  const handlePlayerSelect = (winner: 'player' | 'opponent') => {
    console.log('[MatchContext] Player selected:', winner);
    setSelectedWinner(winner);
  };

  // Handler for when a winning shot is selected
  const handleWinningShotSelect = (shot: string) => {
    console.log('[MatchContext] Winning shot selected:', shot);
    setWinningShot(shot);
  };

  // Handler for when the other shot is selected
  const handleOtherShotSelect = (shot: string) => {
    console.log('[MatchContext] Other shot selected:', shot);
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
      console.error('[MatchContext] Cannot record point: match is null');
      return;
    }
    
    console.log('[MatchContext] Recording point:', { winner, winningShot, otherShot });
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
      console.log('[MatchContext] Getting sets for match ID:', match.id);
      let currentSetData;
      try {
        const sets = await setApi.getSetsByMatchId(match.id);
        console.log('[MatchContext] Sets retrieved:', sets);
        const existingSet = sets.find(s => s.set_number === matchState.currentSet);
        
        if (!existingSet) {
          // Create new set in database
          console.log('[MatchContext] Creating new set for match');
          currentSetData = await setApi.createSet({
            match_id: match.id,
            set_number: matchState.currentSet,
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          });
          console.log('[MatchContext] Set created:', currentSetData);
        } else {
          // Update existing set
          console.log('[MatchContext] Updating existing set:', existingSet.id);
          currentSetData = await setApi.updateSet(existingSet.id, {
            score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
            player_score: updatedSets[currentSetIndex].playerScore,
            opponent_score: updatedSets[currentSetIndex].opponentScore
          });
          console.log('[MatchContext] Set updated:', currentSetData);
        }
      } catch (error) {
        console.error('[MatchContext] Error getting/creating set:', error);
        throw error;
      }
      
      // Create point in database
      console.log('[MatchContext] Creating point in database');
      const newPoint = await pointApi.createPoint({
        set_id: currentSetData.id,
        point_number: pointNumber,
        winner,
        winning_shot: winningShot,
        other_shot: otherShot,
        notes: ''
      });
      console.log('[MatchContext] Point created:', newPoint);
      
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
        console.log('[MatchContext] Updating match score:', `${playerSetsWon}-${opponentSetsWon}`);
        await matchApi.updateMatch(match.id, {
          match_score: `${playerSetsWon}-${opponentSetsWon}`
        });
        
        if (!isMatchComplete) {
          // Start next set
          console.log('[MatchContext] Starting next set');
          updatedSets.push({ playerScore: 0, opponentScore: 0 });
          setMatchState({
            currentSet: matchState.currentSet + 1,
            sets: updatedSets,
            points: [...matchState.points, newPoint],
            isMatchComplete: false
          });
        } else {
          // Match is complete
          console.log('[MatchContext] Match complete');
          setMatchState({
            currentSet: matchState.currentSet,
            sets: updatedSets,
            points: [...matchState.points, newPoint],
            isMatchComplete: true
          });
        }
      } else {
        // Continue current set
        console.log('[MatchContext] Continuing current set');
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
    } catch (error) {
      console.error('[MatchContext] Error recording point:', error);
    }
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
  const undoLastPoint = async () => {
    if (!match || matchState.points.length === 0) {
      console.error('[MatchContext] Cannot undo: match is null or no points');
      return; // Nothing to undo
    }
    
    console.log('[MatchContext] Undoing last point');
    try {
      // Copy current state
      const updatedPoints = [...matchState.points];
      const lastPoint = updatedPoints.pop(); // Remove the last point
      
      if (!lastPoint) return;
      
      // Delete point from database
      console.log('[MatchContext] Deleting point from database:', lastPoint.id);
      await pointApi.deletePoint(lastPoint.id);
      
      // Update sets and scores
      const updatedSets = [...matchState.sets];
      
      // Get set for the last point
      console.log('[MatchContext] Getting sets for match ID:', match.id);
      const sets = await setApi.getSetsByMatchId(match.id);
      const setData = sets.find(s => s.id === lastPoint.set_id);
      
      if (!setData) {
        console.error('[MatchContext] Set not found for point:', lastPoint);
        return;
      }
      
      const setNumber = setData.set_number;
      
      // If we're in a new set and there are no points in this set,
      // we need to go back to the previous set
      if (setNumber < matchState.currentSet) {
        // We're undoing a point that completed a set, go back to previous set
        updatedSets.pop(); // Remove the current empty set
        
        console.log('[MatchContext] Going back to previous set');
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
        
        // Update set in database
        console.log('[MatchContext] Updating set in database:', setData.id);
        await setApi.updateSet(setData.id, {
          score: `${updatedSets[currentSetIndex].playerScore}-${updatedSets[currentSetIndex].opponentScore}`,
          player_score: updatedSets[currentSetIndex].playerScore,
          opponent_score: updatedSets[currentSetIndex].opponentScore
        });
        
        console.log('[MatchContext] Updating local state');
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
    } catch (error) {
      console.error('[MatchContext] Error undoing point:', error);
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
  const advanceToNextSet = async () => {
    if (!match) {
      console.error('[MatchContext] Cannot advance to next set: match is null');
      return;
    }
    
    console.log('[MatchContext] Advancing to next set');
    try {
      const updatedSets = [...matchState.sets];
      updatedSets.push({ playerScore: 0, opponentScore: 0 });
      
      // Create a new set in the database
      console.log('[MatchContext] Creating new set in database');
      await setApi.createSet({
        match_id: match.id,
        set_number: matchState.currentSet + 1,
        score: '0-0',
        player_score: 0,
        opponent_score: 0
      });
      
      console.log('[MatchContext] Updating local state');
      setMatchState({
        currentSet: matchState.currentSet + 1,
        sets: updatedSets,
        points: matchState.points,
        isMatchComplete: false
      });
    } catch (error) {
      console.error('[MatchContext] Error advancing to next set:', error);
    }
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