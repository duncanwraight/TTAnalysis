import React from 'react';

type ShotItemProps = {
  id: string;
  label: string;
  isDisabled: boolean;
  selectedHand: 'fh' | 'bh' | null;
  onHandSelect: (shotId: string, hand: 'fh' | 'bh') => void;
};

const ShotItem: React.FC<ShotItemProps> = ({
  id,
  label,
  isDisabled,
  selectedHand,
  onHandSelect
}) => {
  return (
    <div className={`shot-item ${isDisabled ? 'shot-item-disabled' : ''}`}>
      <button
        className={`shot-hand fh-button ${selectedHand === 'fh' ? 'selected' : ''}`}
        onClick={() => onHandSelect(id, 'fh')}
        disabled={isDisabled}
        title="Forehand"
      >
        FH
      </button>
      
      <span className="shot-label">
        {label}
      </span>
      
      <button
        className={`shot-hand bh-button ${selectedHand === 'bh' ? 'selected' : ''}`}
        onClick={() => onHandSelect(id, 'bh')}
        disabled={isDisabled}
        title="Backhand"
      >
        BH
      </button>
    </div>
  );
};

export default ShotItem;