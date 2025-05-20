import React, { useState, useEffect } from 'react';

type ShotSelectorProps = {
  onSelect: (shot: string) => void;
  shotType: 'winning' | 'other';
  selected?: string | null;
  disabled?: boolean;
  onUndo?: () => void;
  currentServer?: 'player' | 'opponent';
  isWinningPlayer?: boolean;
};

type ShotType = {
  id: string;
  label: string;
};

type ShotCategory = {
  id: string;
  label: string;
  shots: ShotType[];
};

// Static variable outside of component to persist between renders
let lastSelectedCategory = 'serve';

const ShotSelector: React.FC<ShotSelectorProps> = ({ 
  onSelect, 
  shotType, 
  selected = null, 
  disabled = false,
  onUndo,
  currentServer = 'player',
  isWinningPlayer = true
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(lastSelectedCategory);

  // Shot categories based on the provided table
  const shotCategories: ShotCategory[] = [
    {
      id: 'serve',
      label: 'Serve',
      shots: [
        { id: 'serve', label: 'Serve' },
        { id: 'serve_receive', label: 'Serve receive' }
      ]
    },
    {
      id: 'around_net',
      label: 'Around the net',
      shots: [
        { id: 'push', label: 'Push' },
        { id: 'flick', label: 'Flick' },
      ]
    },
    {
      id: 'pips',
      label: 'Pips',
      shots: [
        { id: 'bump', label: 'Bump' },
        { id: 'sideswipe', label: 'Sideswipe' },
        { id: 'attack', label: 'Attack' },
      ]
    },
    {
      id: 'attacks',
      label: 'Attacks',
      shots: [
        { id: 'flat_hit', label: 'Flat-hit' },
        { id: 'loop', label: 'Loop' },
        { id: 'smash', label: 'Smash' },
        { id: 'counter_loop', label: 'Counter-loop' },
      ]
    },
    {
      id: 'defence',
      label: 'Defence',
      shots: [
        { id: 'chop', label: 'Chop' },
        { id: 'fish', label: 'Fish' },
        { id: 'lob', label: 'Lob' },
      ]
    }
  ];

  // Helper to get the hand ID (forehand or backhand)
  const getHandId = (shotId: string, hand: 'fh' | 'bh'): string => {
    return `${hand}_${shotId}`;
  };

  // When a category is clicked
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Update the static variable to persist the selection
    lastSelectedCategory = categoryId;
  };

  // When a shot is selected with hand specification
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    if (!disabled) {
      onSelect(getHandId(shotId, hand));
    }
  };

  const currentCategory = shotCategories.find(c => c.id === activeCategory) || shotCategories[0];


  // Determine if the serve shots should be disabled based on who's serving and who's winning
  const isServeDisabled = (shotId: string) => {
    // If the shot is not serve related, it's never disabled by server status
    if (shotId !== 'serve' && shotId !== 'serve_receive') {
      return false;
    }

    // Simplify the logic to make it more readable and to fix our issue
    
    // First determine which player this shot selector represents
    let isForPlayer: boolean;
    if (shotType === 'winning') {
      // This is for the winner of the point
      isForPlayer = isWinningPlayer;
    } else {
      // This is for the loser of the point
      isForPlayer = !isWinningPlayer; 
    }

    // Now apply server/receiver logic
    if (shotId === 'serve') {
      // Can only use 'serve' shot if this player is the server
      const playerIsServer = (isForPlayer && currentServer === 'player') || 
                            (!isForPlayer && currentServer === 'opponent');
      return !playerIsServer; // Disable if the player is not the server
    } else { // serve_receive
      // Can only use 'serve_receive' shot if this player is NOT the server
      const playerIsServer = (isForPlayer && currentServer === 'player') || 
                            (!isForPlayer && currentServer === 'opponent');
      return playerIsServer; // Disable if the player is the server
    }
  };

  return (
    <div className={`shot-selector ${disabled ? 'disabled' : ''} ${selected ? 'selection-made' : ''}`}>
      {selected && onUndo && (
        <div className="undo-button-container">
          <button 
            className="undo-shot-btn" 
            onClick={onUndo}
            title="Undo shot selection"
          >
            ↩️ Change Selection
          </button>
        </div>
      )}
      <div className="shot-categories">
        {shotCategories.map((category) => (
          <button 
            key={category.id}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(category.id)}
            disabled={selected !== null}
          >
            {category.label}
          </button>
        ))}
      </div>
      
      <div className="shot-list">

        {currentCategory.shots.map((shot) => (
          <div key={shot.id} className={`shot-item ${isServeDisabled(shot.id) ? 'shot-item-disabled' : ''}`}>
            <button
              className={`shot-hand fh-button ${selected === getHandId(shot.id, 'fh') ? 'selected' : ''}`}
              onClick={() => handleShotSelect(shot.id, 'fh')}
              disabled={disabled || isServeDisabled(shot.id)}
              title="Forehand"
            >
              FH
            </button>
            
            <span className="shot-label">
              {shot.label}
            </span>
            
            <button
              className={`shot-hand bh-button ${selected === getHandId(shot.id, 'bh') ? 'selected' : ''}`}
              onClick={() => handleShotSelect(shot.id, 'bh')}
              disabled={disabled || isServeDisabled(shot.id)}
              title="Backhand"
            >
              BH
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShotSelector;