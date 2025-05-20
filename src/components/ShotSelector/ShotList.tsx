import React from 'react';
import ShotItem from './ShotItem';
import { ShotType } from './types';

type ShotListProps = {
  shots: ShotType[];
  selectedShot: string | null;
  onShotSelect: (shotId: string, hand: 'fh' | 'bh') => void;
  isServeDisabled: (shotId: string) => boolean;
};

const ShotList: React.FC<ShotListProps> = ({
  shots,
  selectedShot,
  onShotSelect,
  isServeDisabled
}) => {
  // Helper to get the selected hand if this shot is selected
  const getSelectedHand = (shotId: string): 'fh' | 'bh' | null => {
    if (!selectedShot) return null;
    
    const shotPrefix = selectedShot.slice(0, 3);
    const shotSuffix = selectedShot.slice(3);
    
    if ((shotPrefix === 'fh_' || shotPrefix === 'bh_') && shotSuffix === shotId) {
      return shotPrefix.slice(0, 2) as 'fh' | 'bh';
    }
    
    return null;
  };

  return (
    <div className="shot-list">
      {shots.map((shot) => (
        <ShotItem
          key={shot.id}
          id={shot.id}
          label={shot.label}
          isDisabled={isServeDisabled(shot.id)}
          selectedHand={getSelectedHand(shot.id)}
          onHandSelect={(shotId, hand) => onShotSelect(shotId, hand)}
        />
      ))}
    </div>
  );
};

export default ShotList;