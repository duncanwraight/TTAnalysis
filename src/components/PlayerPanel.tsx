import React from 'react';

type PlayerPanelProps = {
  type: 'player' | 'opponent';
  name: string;
  onClick: () => void;
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ type, name, onClick }) => {
  return (
    <div className={`player-panel ${type}-panel`} onClick={onClick}>
      <div className="player-avatar">
        {/* Placeholder for avatar */}
        <div className="avatar-placeholder">
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
      <h3 className="player-name">{name}</h3>
    </div>
  );
};

export default PlayerPanel;