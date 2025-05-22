import React, { useState, useEffect } from 'react';
import { shotApi } from '../lib/api';
import { ShotCategory as DbShotCategory, Shot as DbShot } from '../types/database.types';
import { useAuth } from '../context/AuthContext';

/**
 * ShotSelector component for selecting shot types in table tennis matches
 * Displays shot categories and shot options with forehand/backhand selection
 */
type ShotSelectorProps = {
  onSelect: (shot: string) => void;
  shotType: 'winning' | 'other';
  selected?: string | null;
  disabled?: boolean;
  onUndo?: () => void;
  currentServer?: 'player' | 'opponent';
  isWinningPlayer?: boolean;
};

type ShotType = {
  id: string;
  name: string;
  label: string;
};

type FormattedShotCategory = {
  id: string;
  name: string;
  label: string;
  shots: ShotType[];
};

// Static variable outside of component to persist between renders
let lastSelectedCategory = 'serve';

// Fallback shot categories in case the database fetch fails
const fallbackShotCategories: FormattedShotCategory[] = [
  {
    id: 'serve',
    name: 'serve',
    label: 'Serve',
    shots: [
      { id: 'serve', name: 'serve', label: 'Serve' },
      { id: 'serve_receive', name: 'serve_receive', label: 'Serve receive' }
    ]
  },
  {
    id: 'around_net',
    name: 'around_net',
    label: 'Around the net',
    shots: [
      { id: 'push', name: 'push', label: 'Push' },
      { id: 'flick', name: 'flick', label: 'Flick' },
    ]
  },
  {
    id: 'pips',
    name: 'pips',
    label: 'Pips',
    shots: [
      { id: 'bump', name: 'bump', label: 'Bump' },
      { id: 'sideswipe', name: 'sideswipe', label: 'Sideswipe' },
      { id: 'attack', name: 'attack', label: 'Attack' },
    ]
  },
  {
    id: 'attacks',
    name: 'attacks',
    label: 'Attacks',
    shots: [
      { id: 'flat_hit', name: 'flat_hit', label: 'Flat-hit' },
      { id: 'loop', name: 'loop', label: 'Loop' },
      { id: 'smash', name: 'smash', label: 'Smash' },
      { id: 'counter_loop', name: 'counter_loop', label: 'Counter-loop' },
    ]
  },
  {
    id: 'defence',
    name: 'defence',
    label: 'Defence',
    shots: [
      { id: 'chop', name: 'chop', label: 'Chop' },
      { id: 'fish', name: 'fish', label: 'Fish' },
      { id: 'lob', name: 'lob', label: 'Lob' },
    ]
  }
];

/**
 * ShotSelector component for selecting shot types in table tennis matches
 */
const ShotSelector: React.FC<ShotSelectorProps> = ({ 
  onSelect, 
  shotType, 
  selected = null, 
  disabled = false,
  onUndo,
  currentServer = 'player',
  isWinningPlayer = true
}) => {
  const { session } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>(lastSelectedCategory);
  const [shotCategories, setShotCategories] = useState<FormattedShotCategory[]>(fallbackShotCategories);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Add debugging for component props
  useEffect(() => {
    console.log(`ShotSelector (${shotType}): rendered with selected=${selected}, disabled=${disabled}`);
  }, [shotType, selected, disabled]);

  // Fetch shot categories and shots from the database using the API client
  useEffect(() => {
    const loadShots = async () => {
      try {
        setIsLoading(true);
        
        // Get authentication token from context
        const token = session?.access_token;
        
        // Fetch categories and shots using the API client
        const [categories, shots] = await Promise.all([
          shotApi.getCategories(token),
          shotApi.getShots(token)
        ]);
        
        if (categories.length > 0 && shots.length > 0) {
          // Format the categories and shots for display
          const formattedCategories = categories.map((category: DbShotCategory) => {
            // Get shots for this category
            const categoryShots = shots
              .filter((shot: DbShot) => shot.category_id === category.id)
              .map((shot: DbShot) => ({
                id: shot.id,
                name: shot.name,
                label: shot.display_name
              }));
              
            return {
              id: category.id,
              name: category.name,
              label: category.name.charAt(0).toUpperCase() + category.name.slice(1).replace('_', ' '),
              shots: categoryShots
            };
          });
          
          setShotCategories(formattedCategories);
        }
      } catch (error) {
        // Keep using fallback categories on error
        console.error('Error loading shots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShots();
  }, [session]);

  /**
   * Helper to get the hand ID (forehand or backhand)
   */
  const getHandId = (shotId: string, hand: 'fh' | 'bh'): string => {
    return `${hand}_${shotId}`;
  };

  /**
   * Handle category selection
   */
  const handleCategoryClick = (categoryId: string) => {
    // Find the category with that ID
    const category = shotCategories.find(c => c.id === categoryId);
    if (category) {
      setActiveCategory(categoryId);
      // Update the static variable to persist the selection
      lastSelectedCategory = category.name;
    }
  };

  /**
   * Handle shot selection with hand specification
   */
  const handleShotSelect = (shotId: string, shotName: string, hand: 'fh' | 'bh') => {
    if (!disabled) {
      // For backward compatibility, use the shot name in the hand ID
      const handId = getHandId(shotName, hand);
      console.log(`ShotSelector: Selected ${shotType} shot: ${handId} (token: ${session?.access_token ? 'Available' : 'Missing'})`);
      
      // Immediately call onSelect with the selected shot
      onSelect(handId);
    }
  };

  // Find the current category based on name for DB categories or ID for fallback
  const currentCategory = shotCategories.find(c => 
    c.name === lastSelectedCategory || c.id === activeCategory
  ) || shotCategories[0];

  /**
   * Determine if the serve shots should be disabled based on who's serving and who's winning
   */
  const isServeDisabled = (shot: ShotType) => {
    // If the shot is not serve related, it's never disabled by server status
    if (shot.name !== 'serve' && shot.name !== 'serve_receive') {
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

    // Apply server/receiver logic
    if (shot.name === 'serve') {
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
      {isLoading ? (
        <div className="loading-indicator">Loading shots...</div>
      ) : (
        <>
          <div className="shot-categories">
            {shotCategories.map((category) => (
              <button 
                key={category.id}
                className={`category-tab ${activeCategory === category.id || lastSelectedCategory === category.name ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category.id)}
                disabled={selected !== null}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          <div className="shot-list">
            {currentCategory.shots.map((shot) => {
              const isDisabled = isServeDisabled(shot);
              const fhSelected = selected === getHandId(shot.name, 'fh');
              const bhSelected = selected === getHandId(shot.name, 'bh');
              
              // No inline styles - we'll use CSS classes instead
              const disabledStyle = {};
                
              return (
                <div key={shot.id} className={`shot-item ${isDisabled ? 'shot-item-disabled' : ''}`}>
                  <button
                    className={`shot-hand fh-button ${fhSelected ? 'selected' : ''} ${isDisabled ? 'disabled-button' : ''}`}
                    onClick={() => {
                      console.log(`ShotSelector: FH button clicked for ${shotType} shot: ${shot.name}`);
                      handleShotSelect(shot.id, shot.name, 'fh');
                    }}
                    disabled={disabled || isDisabled}
                    title="Forehand"
                    style={disabledStyle}
                  >
                    FH
                  </button>
                  
                  <span 
                    className={`shot-label ${isDisabled ? 'disabled-label' : ''}`}
                  >
                    {shot.label}
                  </span>
                  
                  <button
                    className={`shot-hand bh-button ${bhSelected ? 'selected' : ''} ${isDisabled ? 'disabled-button' : ''}`}
                    onClick={() => {
                      console.log(`ShotSelector: BH button clicked for ${shotType} shot: ${shot.name}`);
                      handleShotSelect(shot.id, shot.name, 'bh');
                    }}
                    disabled={disabled || isDisabled}
                    title="Backhand"
                    style={disabledStyle}
                  >
                    BH
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ShotSelector;