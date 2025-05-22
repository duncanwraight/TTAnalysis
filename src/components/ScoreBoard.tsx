import React from 'react';

type ScoreBoardProps = {
  currentSet: number;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  currentServer: 'player' | 'opponent';
  sets?: { playerScore: number; opponentScore: number }[];
};

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  currentSet,
  playerScore,
  opponentScore,
  opponentName,
  currentServer,
  sets = []
}) => {
  return (
    <div className="score-board">
      <div className="set-indicator">
        <strong>SET {currentSet}</strong>
      </div>
      
      {/* Use CSS Grid for precise alignment */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        width: '100%',
        alignItems: 'center'
      }}>
        {/* Player Side */}
        <div style={{ textAlign: 'center' }}>
          <div className="score-label">You</div>
          <div className={`score-value ${currentServer === 'player' ? 'player-serving' : ''}`}>
            {playerScore}
            {currentServer === 'player' && <span className="serve-icon-small" aria-label="Serving">🏓</span>}
          </div>
        </div>
        
        {/* Center spacer - no visible divider */}
        <div style={{ 
          margin: '0 20px'
        }}></div>
        
        {/* Opponent Side */}
        <div style={{ textAlign: 'center' }}>
          <div className="score-label">Opponent</div>
          <div className={`score-value ${currentServer === 'opponent' ? 'player-serving' : ''}`}>
            {opponentScore}
            {currentServer === 'opponent' && <span className="serve-icon-small" aria-label="Serving">🏓</span>}
          </div>
        </div>
      </div>
      {/* Set scores summary moved to PointHistory panel */}
    </div>
  );
};

export default ScoreBoard;