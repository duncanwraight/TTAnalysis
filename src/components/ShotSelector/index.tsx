import React, { useState, useEffect } from 'react';
import ShotCategory from './ShotCategory';
import ShotList from './ShotList';
import { ShotCategory as ShotCategoryType } from './types';
import { useShotData, ShotCategory as DbShotCategory, Shot } from '../../lib/shotsApi';
import '../../styles/components/ShotSelector.css';

// Shot info type for passing between components
type ShotInfo = {
  shotId: string; // This should be the database UUID
  hand: 'fh' | 'bh';
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

// Static variables outside of component to persist between renders
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
  
  // Use the shot data hook to fetch categories and shots
  const { fetchShotsWithCategories } = useShotData();
  
  // Fetch shots and categories on component mount if not cached
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
        console.error('Error loading shot data:', err);
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
      console.error(`Shot with ID ${shotId} not found in database shots!`);
      return;
    }
    
    // Create a shot info object with the shot ID and hand
    const shotInfo: ShotInfo = {
      shotId: shot.id, // Make sure we use the ID from the database object
      hand: hand
    };
    
    // Pass the shot info object to the parent component
    onSelect(shotInfo);
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
          label: dbCategory.name,
          shots: mappedShots
        };
      }
    }
    
    // If we can't find categories, return empty category with a console error
    console.error('Failed to find shot category:', activeCategory);
    return {
      id: 'error',
      label: 'Error',
      shots: []
    };
  };
  
  const currentCategory = getCurrentCategory();

  // Determine if the serve shots should be disabled based on who's serving and who's winning
  const isServeDisabled = (shotId: string) => {
    // Get the name of the shot for checking serve-related shots
    const shot = dbShots.find(s => s.id === shotId);
    if (!shot) {
      console.warn(`Shot with ID ${shotId} not found in database shots for isServeDisabled check.`);
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
    } else if (shotName.includes('receive')) {
      // Can only use 'serve_receive' shot if this player is NOT the server
      return playerIsServer; // Disable if the player is the server
    }
    
    // Default case
    return false;
  };

  return (
    <div className={`shot-selector ${disabled ? 'disabled' : ''} ${selected ? 'selection-made' : ''}`}>
      {selected && (
        <div className="selection-display" style={{
          backgroundColor: '#e6f7ff',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '12px',
          border: '1px solid #91d5ff'
        }}>
          <div><strong>Selected Shot:</strong></div>
          <div>Shot ID: {selected.shotId.substring(0, 8)}...</div>
          <div>Hand: {selected.hand.toUpperCase()}</div>
          
          {onUndo && shotType === 'winning' && (
            <button 
              className="undo-shot-btn" 
              onClick={onUndo}
              title="Undo shot selection"
              style={{ marginTop: '4px' }}
            >
              ↩️ Change Selection
            </button>
          )}
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
                label={category.name}
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
    </div>
  );
};

export default ShotSelector;