import React from 'react';

type ShotSelectorProps = {
  onSelect: (shot: string) => void;
  shotType: 'winning' | 'other';
  selected?: string | null;
  disabled?: boolean;
};

const ShotSelector: React.FC<ShotSelectorProps> = ({ 
  onSelect, 
  shotType, 
  selected = null, 
  disabled = false 
}) => {
  // These could be customizable in settings later
  const commonShots = [
    { id: 'serve', label: 'Serve' },
    { id: 'forehand', label: 'Forehand' },
    { id: 'backhand', label: 'Backhand' },
    { id: 'forehand_loop', label: 'Forehand Loop' },
    { id: 'backhand_loop', label: 'Backhand Loop' },
    { id: 'forehand_push', label: 'Forehand Push' },
    { id: 'backhand_push', label: 'Backhand Push' },
    { id: 'forehand_block', label: 'Forehand Block' },
    { id: 'backhand_block', label: 'Backhand Block' },
    { id: 'forehand_flick', label: 'Forehand Flick' },
    { id: 'backhand_flick', label: 'Backhand Flick' },
    { id: 'smash', label: 'Smash' },
    { id: 'lob', label: 'Lob' },
    { id: 'chop', label: 'Chop' },
  ];

  return (
    <div className={`shot-selector ${disabled ? 'disabled' : ''}`}>
      <div className="shot-grid">
        {commonShots.map((shot) => (
          <button
            key={shot.id}
            className={`shot-button ${shotType}-shot ${selected === shot.id ? 'selected' : ''}`}
            onClick={() => !disabled && onSelect(shot.id)}
            disabled={disabled}
          >
            {shot.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShotSelector;