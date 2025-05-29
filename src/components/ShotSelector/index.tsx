import React, { useState, useEffect } from 'react';
import ShotCategory from './ShotCategory';
import ShotList from './ShotList';
import { useShotData, ShotCategory as DbShotCategory, Shot } from '../../lib/shotsApi';
import { ShotInfo } from '../../types/database.types';
import '../../styles/components/ShotSelector.css';

/* String Formatting Helper */
// Capitalizes each word and replaces underscores with spaces
const formatCategoryName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

type ShotSelectorProps = {
  onSelect: (shotInfo: ShotInfo) => void;
  shotType: 'winning' | 'other';
  selected?: ShotInfo | null;
  disabled?: boolean;
  onUndo?: () => void;
  currentServer?: 'player' | 'opponent';
  isWinningPlayer?: boolean;
};

/* Persistent State Variables */
// These variables persist between component renders
let lastSelectedCategory = 'serve';
let cachedCategories: DbShotCategory[] = [];
let cachedShots: Shot[] = [];

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
  const [dbCategories, setDbCategories] = useState<DbShotCategory[]>(cachedCategories);
  const [dbShots, setDbShots] = useState<Shot[]>(cachedShots);
  const [loading, setLoading] = useState<boolean>(cachedCategories.length === 0);
  const [error, setError] = useState<string | null>(null);
  
  /* Data Fetching */
  const { fetchShotsWithCategories } = useShotData();
  
  /* Data Loading on Component Mount */
  useEffect(() => {
    const loadShotData = async () => {
      try {
        if (cachedCategories.length === 0 || cachedShots.length === 0) {
          setLoading(true);
          const { categories, shots } = await fetchShotsWithCategories();
          
          // Cache the data
          cachedCategories = categories;
          cachedShots = shots;
          
          setDbCategories(categories);
          setDbShots(shots);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load shots');
        setLoading(false);
      }
    };
    
    loadShotData();
  }, [fetchShotsWithCategories]);

  // When a category is clicked
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Update the static variable to persist the selection
    lastSelectedCategory = categoryId;
  };

  // When a shot is selected with hand specification
  const handleShotSelect = (shotId: string, hand: 'fh' | 'bh') => {
    if (disabled) return;
    
    // Find the shot in our database to get complete info
    const shot = dbShots.find(s => s.id === shotId);
    
    if (!shot) {
      // Cannot find the shot in the database
      return;
    }
    
    // Create a shot info object with the shot ID and hand
    const shotInfo: ShotInfo = {
      shotId: shot.id, // Make sure we use the ID from the database object
      hand: hand,
      isLucky: false
    };
    
    // Pass the shot info object to the parent component
    onSelect(shotInfo);
  };

  // Handle lucky shot toggle
  const handleLuckyToggle = () => {
    if (!selected) return;
    
    const updatedShot: ShotInfo = {
      ...selected,
      isLucky: !selected.isLucky
    };
    
    console.log('Lucky shot toggle:', {
      before: selected.isLucky,
      after: updatedShot.isLucky,
      updatedShot: updatedShot
    });
    
    onSelect(updatedShot);
  };

  // Find the current category
  const getCurrentCategory = () => {
    if (dbCategories.length > 0) {
      // Try to find category by name in DB
      const dbCategory = dbCategories.find(c => c.name.toLowerCase() === activeCategory);
      
      if (dbCategory) {
        // Get shots for this category
        const categoryShots = dbShots.filter(s => s.category_id === dbCategory.id);
        
        const mappedShots = categoryShots.map(s => ({
          id: s.id, // This is the database UUID
          name: s.name, // Original shot name (serve, loop, etc.)
          label: s.display_name || s.name // Display name
        }));
        
        return {
          id: dbCategory.id,
          label: formatCategoryName(dbCategory.name),
          shots: mappedShots
        };
      }
    }
    
    // If we can't find categories, return empty category
    return {
      id: 'error',
      label: 'Error',
      shots: []
    };
  };
  
  const currentCategory = getCurrentCategory();

  /* Serve Shot Availability Logic */
  const isServeDisabled = (shotId: string) => {
    // Get the name of the shot for checking serve-related shots
    const shot = dbShots.find(s => s.id === shotId);
    if (!shot) {
      // Shot not found, return false to prevent disabling
      return false;
    }
    
    const shotName = shot.name.toLowerCase();
    
    // If the shot is not serve related, it's never disabled by server status
    if (!shotName.includes('serve')) {
      return false;
    }

    // If the component is disabled entirely, all shots are disabled
    if (disabled) {
      return true;
    }
    
    // First determine which player this shot selector represents
    // For the winning shot selector, this is the winner (determined by isWinningPlayer)
    // For the other shot selector, this is the loser (opposite of isWinningPlayer)
    const isForPlayer = shotType === 'winning' ? isWinningPlayer : !isWinningPlayer;
    
    // Determine if this player is the server
    const playerIsServer = (isForPlayer && currentServer === 'player') || 
                          (!isForPlayer && currentServer === 'opponent');
    
    // Logic for different shot types
    if (shotName === 'serve') {
      // Can only use 'serve' shot if this player IS the server
      return !playerIsServer; // Disable if the player is not the server
    } else if (shotName.includes('service_fault')) {
      // Can only use 'service_fault' shot if this player is NOT the server
      return playerIsServer; // Disable if the player is the server
    }
    
    // Default case
    return false;
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
      
      {loading && (
        <div className="loading-indicator">Loading shots...</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="shot-categories">
        {dbCategories.length > 0 ? (
          // Use database categories if available
          dbCategories
            .sort((a, b) => a.display_order - b.display_order)
            .map((category) => (
              <ShotCategory 
                key={category.id}
                id={category.name.toLowerCase()}
                label={formatCategoryName(category.name)}
                isActive={activeCategory === category.name.toLowerCase()}
                onClick={handleCategoryClick}
                disabled={selected !== null}
              />
            ))
        ) : (
          <div className="empty-categories">No shot categories found</div>
        )}
      </div>
      
      <ShotList
        shots={currentCategory.shots}
        selectedShot={selected}
        onShotSelect={handleShotSelect}
        isServeDisabled={isServeDisabled}
      />
      
      {selected && shotType === 'winning' && (
        <div className="shot-modifiers">
          <div className="modifier-checkboxes">
            <label className="modifier-checkbox">
              <input
                type="checkbox"
                checked={selected.isLucky || false}
                onChange={handleLuckyToggle}
                disabled={disabled}
              />
              <span className="checkbox-label">Lucky shot (hit net/edge)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotSelector;