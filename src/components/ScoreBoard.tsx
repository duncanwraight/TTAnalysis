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
        <span>Set {currentSet}</span>
      </div>
      
      <div className="scores">
        <div className={`player-score ${currentServer === 'player' ? 'serving' : ''}`}>
          <span className="score-label">You</span>
          <span className="score-value">{playerScore}</span>
          {currentServer === 'player' && <span className="server-indicator">•</span>}
        </div>
        
        <div className="score-divider">-</div>
        
        <div className={`opponent-score ${currentServer === 'opponent' ? 'serving' : ''}`}>
          <span className="score-value">{opponentScore}</span>
          <span className="score-label">{opponentName}</span>
          {currentServer === 'opponent' && <span className="server-indicator">•</span>}
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;