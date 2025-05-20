import React from 'react';

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
  
  // Direct inline styling instead of relying on CSS classes
  const panelStyle: React.CSSProperties = {
    backgroundColor: type === 'opponent' ? '#f1f5f9' : '#e0e7ff',
    border: `2px solid ${type === 'opponent' ? '#64748b' : '#2563eb'}`,
    borderLeftWidth: '6px'
  };
  
  return (
    <div 
      className={`player-panel ${type}-panel`} 
      onClick={onClick}
      style={panelStyle}
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