/**
 * Utility module for shot-related operations using the API hook
 * Provides functions for retrieving and organizing shot data
 */
import { useApi } from './useApi';

// Types for shot data
export interface ShotCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface Shot {
  id: string;
  category_id: string;
  name: string;
  display_name: string;
  display_order: number;
  description?: string;
}

/**
 * Get shots by category name
 * @param shots Array of shots to filter
 * @param categories Array of categories to search in
 * @param categoryName Category name to filter by
 * @returns Filtered array of shots that belong to the specified category
 */
export const getShotsByCategory = (
  shots: Shot[], 
  categories: ShotCategory[], 
  categoryName: string
): Shot[] => {
  const category = categories.find(cat => cat.name === categoryName);
  if (!category) return [];
  
  return shots.filter(shot => shot.category_id === category.id);
};

/**
 * Custom hook for accessing shot data
 * @returns Object with function to fetch shot data
 */
export const useShotData = () => {
  const api = useApi();
  
  /**
   * Fetch all shot categories and their shots
   * @returns Object containing categories and shots arrays
   */
  const fetchShotsWithCategories = async (): Promise<{
    categories: ShotCategory[];
    shots: Shot[];
  }> => {
    try {
      // Fetch categories and shots using the API hook
      const [categories, shots] = await Promise.all([
        api.shot.getCategories(),
        api.shot.getShots()
      ]);

      return {
        categories: categories || [],
        shots: shots || []
      };
    } catch (error) {
      console.error('Error in fetchShotsWithCategories:', error);
      
      // Fallback to empty arrays
      return {
        categories: [],
        shots: []
      };
    }
  };
  
  return { fetchShotsWithCategories };
};