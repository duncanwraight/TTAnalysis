import React from 'react';
import { Point } from '../types/database.types';

type PointHistoryProps = {
  points: Point[];
  currentSet: number;
  playerName?: string;
  opponentName?: string;
};

const PointHistory: React.FC<PointHistoryProps> = ({
  points,
  currentSet,
  playerName = 'You',
  opponentName = 'Opponent'
}) => {
  // Filter points for the current set
  const currentSetPoints = points.filter(
    point => point.set_id === `set-${currentSet}`
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