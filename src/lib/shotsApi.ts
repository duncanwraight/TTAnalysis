/**
 * API client for shot-related operations
 * Provides functions for retrieving and organizing shot data
 */
import { shotApi } from './api';

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
 * Fetch all shot categories and their shots
 * @param token Optional authentication token
 * @returns Object containing categories and shots arrays
 */
export const fetchShotsWithCategories = async (token?: string): Promise<{
  categories: ShotCategory[];
  shots: Shot[];
}> => {
  try {
    // Fetch categories and shots using the API client
    const [categories, shots] = await Promise.all([
      shotApi.getCategories(token),
      shotApi.getShots(token)
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