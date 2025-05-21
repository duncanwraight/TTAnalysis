import React from 'react';
import { Point, Set } from '../types/database.types';

type PointHistoryProps = {
  points: Point[];
  currentSet: number;
  playerName?: string;
  opponentName?: string;
  sets?: Set[]; // Optional array of sets for database implementation
  currentSetId?: string; // Optional current set ID for database implementation
};

const PointHistory: React.FC<PointHistoryProps> = ({
  points,
  currentSet,
  playerName = 'You',
  opponentName = 'Opponent',
  sets,
  currentSetId
}) => {
  // Add debugging to help understand what's coming in
  console.log('[PointHistory] Props:', { points, currentSet, sets, currentSetId });
  if (points.length > 0) {
    console.log('[PointHistory] First point:', points[0]);
  }
  if (sets && sets.length > 0) {
    console.log('[PointHistory] Sets:', sets);
  }
  
  // Add logging to understand the input data better
  console.log('[PointHistory] All points:', points);
  console.log('[PointHistory] Current set:', currentSet);
  console.log('[PointHistory] Current set ID:', currentSetId);
  console.log('[PointHistory] Sets:', sets);

  // Filter points for the current set
  // Handle both database UUID format and localStorage format
  const currentSetPoints = points.filter(
    point => {
      // If currentSetId is provided and valid (from database), use it as the primary method
      if (currentSetId) {
        const matches = point.set_id === currentSetId; 
        console.log(`[PointHistory] Point ${point.id}, checking against currentSetId=${currentSetId}: ${matches}`);
        if (matches) return true;
      }
      
      // If we have sets array (from database), find the set with matching set_number
      if (sets && sets.length > 0) {
        const matchingSet = sets.find(set => set.set_number === currentSet);
        if (matchingSet) {
          const matches = point.set_id === matchingSet.id;
          console.log(`[PointHistory] Point ${point.id}, checking against matchingSet=${matchingSet.id}: ${matches}`);
          if (matches) return true;
        }
      }
      
      // Get all points that were recorded in this session (likely the most recent points)
      // This is a fallback for when the match is in progress and we haven't saved the set ID properly
      const sessionPoints = points.filter(p => {
        // Check if the point was created in the last hour (likely this session)
        const pointTime = new Date(p.created_at).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return pointTime > oneHourAgo;
      });
      
      if (sessionPoints.length > 0 && sessionPoints.includes(point)) {
        console.log(`[PointHistory] Point ${point.id} is from current session, including it`);
        return true;
      }
      
      // Fallback to the localStorage format as a last resort
      if (point.set_id === `set-${currentSet}`) {
        console.log(`[PointHistory] Point ${point.id} matches localStorage format set-${currentSet}`);
        return true;
      }
      
      // If none of the above conditions match, don't include this point
      console.log(`[PointHistory] Point ${point.id} does not match any criteria, excluding it`);
      return false;
    }
  );

  // If there are no points in the current set, show a message
  if (currentSetPoints.length === 0) {
    return (
      <div>
        <div className="point-history-title">Point History</div>
        <div className="no-points-message">No points recorded yet</div>
      </div>
    );
  }

  // Calculate win streaks for visual representation
  let currentStreak = { player: 0, opponent: 0 };
  const pointsWithStreaks = currentSetPoints.map((point, index) => {
    // Reset opposite player's streak
    if (point.winner === 'player') {
      currentStreak.opponent = 0;
      currentStreak.player += 1;
    } else {
      currentStreak.player = 0;
      currentStreak.opponent += 1;
    }

    // Return point with streak information
    return {
      ...point,
      streak: point.winner === 'player' ? currentStreak.player : currentStreak.opponent
    };
  });

  return (
    <div>
      <div className="point-history-title">Point History</div>
      <div className="point-sequence">
        {pointsWithStreaks.map((point, index) => (
          <div 
            key={point.id}
            className={`point-marker ${point.winner === 'player' ? 'player-point' : 'opponent-point'}`}
            style={{
              height: `${Math.min(point.streak * 4 + 16, 40)}px`,
              width: `${Math.min(point.streak * 2 + 8, 20)}px`
            }}
            title={`Point ${index + 1}: ${point.winner === 'player' ? playerName : opponentName} won with ${point.winning_shot}`}
          />
        ))}
      </div>
      <div className="point-history-legend">
        <div className="legend-item">
          <div className="legend-marker player-point" />
          <span>{playerName}</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker opponent-point" />
          <span>{opponentName}</span>
        </div>
      </div>
    </div>
  );
};

export default PointHistory;