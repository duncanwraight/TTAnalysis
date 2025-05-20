import React from 'react';
import '../styles/components/PlayerPanel.css';

type PlayerPanelProps = {
  type: 'player' | 'opponent';
  name: string;
  onClick: () => void;
};

// Helper function to properly capitalize names
const toProperCase = (str: string): string => {
  // Split by spaces and capitalize each word
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ type, name, onClick }) => {
  // Only capitalize opponent names
  const displayName = type === 'opponent' ? toProperCase(name) : name;
  
  return (
    <div 
      className={`player-panel ${type}-panel`} 
      onClick={onClick}
    >
      <div className="player-avatar">
        {/* Placeholder for avatar */}
        <div className="avatar-placeholder">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
      <h3 className="player-name">{displayName}</h3>
    </div>
  );
};

export default PlayerPanel;