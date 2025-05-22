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
  // Debug log to see what shots we're getting
  console.log('ShotList rendered with shots:', shots);
  
  // Helper to get the selected hand if this shot is selected
  const getSelectedHand = (shotId: string): 'fh' | 'bh' | null => {
    if (!selectedShot) return null;
    
    console.log(`ShotList: Checking if shot with ID ${shotId} is selected. Current selected shot:`, selectedShot);
    
    // Direct comparison with the shot ID in the ShotInfo object
    return selectedShot.shotId === shotId ? selectedShot.hand : null;
  };

  // Create a handler that wraps onShotSelect to log what's happening
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    console.log(`ShotList: Shot selected with ID: ${shotId} and hand: ${hand}`);
    
    // Force shotId to be a string
    const shotIdString = String(shotId);
    
    // Log the actual value being passed
    console.log(`ShotList: Shot ID type: ${typeof shotIdString}, value: ${shotIdString}`);
    
    // Pass the ID and hand to the parent
    onShotSelect(shotIdString, hand);
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