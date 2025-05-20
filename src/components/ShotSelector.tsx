import React, { useState } from 'react';

type ShotSelectorProps = {
  onSelect: (shot: string) => void;
  shotType: 'winning' | 'other';
  selected?: string | null;
  disabled?: boolean;
  onUndo?: () => void;
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

const ShotSelector: React.FC<ShotSelectorProps> = ({ 
  onSelect, 
  shotType, 
  selected = null, 
  disabled = false,
  onUndo
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('serve');

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
  };

  // When a shot is selected with hand specification
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    if (!disabled) {
      onSelect(getHandId(shotId, hand));
    }
  };

  const currentCategory = shotCategories.find(c => c.id === activeCategory) || shotCategories[0];


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
          <div key={shot.id} className="shot-item">
            <button
              className={`shot-hand fh-button ${selected === getHandId(shot.id, 'fh') ? 'selected' : ''}`}
              onClick={() => handleShotSelect(shot.id, 'fh')}
              disabled={disabled}
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
              disabled={disabled}
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