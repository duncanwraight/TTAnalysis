import React from 'react';
import ShotItem from './ShotItem';

type ShotType = {
  id: string;
  label: string;
  name?: string;
};

// Shot info type for passing between components
type ShotInfo = {
  shotId: string; // This should be the database UUID
  hand: 'fh' | 'bh';
};

type ShotListProps = {
  shots: ShotType[];
  selectedShot: ShotInfo | null;
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
    // Direct comparison with the shot ID in the ShotInfo object
    return selectedShot.shotId === shotId ? selectedShot.hand : null;
  };

  // Handler for shot selection
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    // Force shotId to be a string and pass to parent
    onShotSelect(String(shotId), hand);
  };

  return (
    <div className="shot-list">
      {shots.length > 0 ? (
        shots.map((shot) => (
          <ShotItem
            key={shot.id}
            id={shot.id}
            label={shot.label}
            name={shot.name}
            isDisabled={isServeDisabled(shot.id)}
            selectedHand={getSelectedHand(shot.id)}
            onHandSelect={handleShotSelect}
          />
        ))
      ) : (
        <div className="empty-shots">No shots available in this category</div>
      )}
    </div>
  );
};

export default ShotList;