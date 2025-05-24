import React from 'react';

type ShotItemProps = {
  id: string;
  label: string;
  name?: string; // Optional name field for debugging
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
  // Convert ID to string if needed
  const idString = String(id);
  
  return (
    <div 
      className={`shot-item ${isDisabled ? 'shot-item-disabled' : ''}`} 
      data-shot-id={idString}
      style={{ 
        position: 'relative',
        border: selectedHand ? '2px solid #1890ff' : '1px solid #d9d9d9'
      }}
    >
      <button
        className={`shot-hand fh-button ${selectedHand === 'fh' ? 'selected' : ''}`}
        onClick={() => onHandSelect(idString, 'fh')}
        disabled={isDisabled}
        title="Forehand"
        style={{
          backgroundColor: selectedHand === 'fh' ? '#1890ff' : '#f5f5f5',
          color: selectedHand === 'fh' ? 'white' : 'black',
          fontWeight: selectedHand === 'fh' ? 'bold' : 'normal'
        }}
      >
        FH
      </button>
      
      <span className="shot-label" style={{ position: 'relative' }}>
        {label}
        
        {selectedHand && (
          <div style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#52c41a',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            SELECTED
          </div>
        )}
      </span>
      
      <button
        className={`shot-hand bh-button ${selectedHand === 'bh' ? 'selected' : ''}`}
        onClick={() => onHandSelect(idString, 'bh')}
        disabled={isDisabled}
        title="Backhand"
        style={{
          backgroundColor: selectedHand === 'bh' ? '#1890ff' : '#f5f5f5',
          color: selectedHand === 'bh' ? 'white' : 'black',
          fontWeight: selectedHand === 'bh' ? 'bold' : 'normal'
        }}
      >
        BH
      </button>
    </div>
  );
};

export default ShotItem;