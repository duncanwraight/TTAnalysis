import React from 'react';
import { Point, MatchSet } from '../types/database.types';
import '../styles/components/PointHistory.css';

type PointHistoryProps = {
  points: Point[];
  currentSet: number;
  playerName?: string;
  opponentName?: string;
  sets?: MatchSet[]; // Optional array of sets for database implementation
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
  // Uncomment for debugging during development
  //   pointsCount: points.length,
  //   currentSet,
  //   setsCount: sets?.length,
  //   currentSetId
  // });

  /* Points Filtering Logic */
  const currentSetPoints = points.filter(point => {
    // Primary method: Match by current set ID (most reliable)
    if (currentSetId && point.set_id === currentSetId) {
      return true;
    }
    
    // Secondary method: If we have sets array, find the matching set by set_number
    if (sets && sets.length > 0) {
      const matchingSet = sets.find(set => set.set_number === currentSet);
      if (matchingSet && point.set_id === matchingSet.id) {
        return true;
      }
    }
    
    // Fallback method: Check if point was recorded in this session (recent points)
    if (point.created_at) {
      const pointTime = new Date(point.created_at).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      // Only use this fallback if we don't have reliable set data yet
      if (!currentSetId && !sets?.length && pointTime > oneHourAgo) {
        return true;
      }
    }
    
    return false;
  });

  // If there are no points in the current set, show a message
  if (currentSetPoints.length === 0) {
    return (
      <div>
        <div className="point-history-title">Point History</div>
        <div className="no-points-message">No points recorded yet</div>
      </div>
    );
  }

  /* Streak Calculation for Visualization */
  let currentStreak = { player: 0, opponent: 0 };
  const pointsWithStreaks = currentSetPoints.map((point) => {
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
            title={`Point ${index + 1}: ${point.winner === 'player' ? playerName : opponentName} won with shot ID ${point.winning_shot_id}`}
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