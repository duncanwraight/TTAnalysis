import React, { useState } from 'react';
import ShotCategory from './ShotCategory';
import ShotList from './ShotList';
import { SHOT_CATEGORIES } from './types';
import '../../styles/components/ShotSelector.css';

type ShotSelectorProps = {
  onSelect: (shot: string) => void;
  shotType: 'winning' | 'other';
  selected?: string | null;
  disabled?: boolean;
  onUndo?: () => void;
  currentServer?: 'player' | 'opponent';
  isWinningPlayer?: boolean;
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

  // When a category is clicked
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Update the static variable to persist the selection
    lastSelectedCategory = categoryId;
  };

  // When a shot is selected with hand specification
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    if (!disabled) {
      onSelect(`${hand}_${shotId}`);
    }
  };

  const currentCategory = SHOT_CATEGORIES.find(c => c.id === activeCategory) || SHOT_CATEGORIES[0];

  // Determine if the serve shots should be disabled based on who's serving and who's winning
  const isServeDisabled = (shotId: string) => {
    // If the shot is not serve related, it's never disabled by server status
    if (shotId !== 'serve' && shotId !== 'serve_receive') {
      return false;
    }

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
      {selected && onUndo && shotType === 'winning' && (
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
        {SHOT_CATEGORIES.map((category) => (
          <ShotCategory 
            key={category.id}
            id={category.id}
            label={category.label}
            isActive={activeCategory === category.id}
            onClick={handleCategoryClick}
            disabled={selected !== null}
          />
        ))}
      </div>
      
      <ShotList
        shots={currentCategory.shots}
        selectedShot={selected}
        onShotSelect={handleShotSelect}
        isServeDisabled={isServeDisabled}
      />
    </div>
  );
};

export default ShotSelector;