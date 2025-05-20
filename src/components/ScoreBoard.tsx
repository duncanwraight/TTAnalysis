import React from 'react';

type ScoreBoardProps = {
  currentSet: number;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  currentServer: 'player' | 'opponent';
};

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  currentSet,
  playerScore,
  opponentScore,
  opponentName,
  currentServer
}) => {
  return (
    <div className="score-board">
      <div className="set-indicator">
        <strong>SET {currentSet}</strong>
      </div>
      
      <div className="scores">
        <div className={`player-score ${currentServer === 'player' ? 'serving' : ''}`}>
          <span className="score-label">You</span>
          <span className="score-value">{playerScore}</span>
          {currentServer === 'player' && (
            <span className="server-indicator">
              <span className="serve-icon">🏓</span>
            </span>
          )}
        </div>
        
        <div className={`opponent-score ${currentServer === 'opponent' ? 'serving' : ''}`}>
          {currentServer === 'opponent' && (
            <span className="server-indicator opponent-indicator">
              <span className="serve-icon">🏓</span>
            </span>
          )}
          <span className="score-value">{opponentScore}</span>
          <span className="score-label">{opponentName}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;