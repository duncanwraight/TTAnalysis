import { supabase } from './supabase';

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

// Fetch all shot categories and their shots
export const fetchShotsWithCategories = async (): Promise<{
  categories: ShotCategory[];
  shots: Shot[];
}> => {
  try {
    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('shot_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching shot categories:', categoriesError);
      throw categoriesError;
    }

    // Fetch shots
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('*')
      .order('display_order', { ascending: true });

    if (shotsError) {
      console.error('Error fetching shots:', shotsError);
      throw shotsError;
    }

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

// Get shots by category name
export const getShotsByCategory = (shots: Shot[], categories: ShotCategory[], categoryName: string): Shot[] => {
  const category = categories.find(cat => cat.name === categoryName);
  if (!category) return [];
  
  return shots.filter(shot => shot.category_id === category.id);
};