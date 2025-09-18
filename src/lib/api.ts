/**
 * API client for interacting with the database
 * Uses Supabase client directly
 */

import { Match, MatchSet, Point } from '../types/database.types';
import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Type guard for PostgrestError
function isPostgrestError(error: unknown): error is PostgrestError {
  const e = error as { code?: string; message?: string };
  return error !== null && typeof error === 'object' && typeof e.code === 'string' && typeof e.message === 'string';
}

/**
 * Match API functions
 */
export const matchApi = {
  // Get all matches
  getAllMatches: async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get a match by ID
  getMatchById: async (id: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get a match with all sets and points
  getFullMatchById: async (id: string) => {
    const [matchResult, setsResult, pointsResult] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).single(),
      supabase.from('sets').select('*').eq('match_id', id).order('set_number', { ascending: true }),
      supabase.from('points').select('*').eq('match_id', id).order('point_number', { ascending: true })
    ]);

    if (matchResult.error) throw matchResult.error;
    if (setsResult.error) throw setsResult.error;
    if (pointsResult.error) throw pointsResult.error;

    return {
      match: matchResult.data,
      sets: setsResult.data as MatchSet[],
      points: pointsResult.data
    };
  },

  // Get match analysis
  getAnalysis: async (id: string) => {
    
    const [
      matchSummary,
      mostEffectiveShots,
      mostCostlyShots,
      shotDistribution,
      handAnalysis,
      opponentHandAnalysis,
      shotHandAnalysis,
      setBreakdown,
      categoryBreakdown,
      tacticalInsights,
      luckyShots
    ] = await Promise.all([
      // Match Summary
      supabase.from('match_summary')
        .select('*')
        .eq('match_id', id)
        .single(),

      // Most Effective Shots
      supabase.from('most_effective_shots')
        .select('*')
        .eq('match_id', id)
        .order('wins', { ascending: false }),

      // Most Costly Shots
      supabase.from('most_costly_shots')
        .select('*')
        .eq('match_id', id)
        .order('losses', { ascending: false }),

      // Shot Distribution (updated to use new breakdown view)
      supabase.from('player_shot_breakdown')
        .select('*')
        .eq('match_id', id)
        .order('player_total', { ascending: false }),

      // Hand Analysis
      supabase.from('hand_analysis')
        .select('*')
        .eq('match_id', id),

      // Opponent Hand Analysis
      supabase.from('opponent_hand_analysis')
        .select('*')
        .eq('match_id', id),

      // Shot Hand Analysis
      supabase.from('shot_hand_analysis')
        .select('*')
        .eq('match_id', id),

      // Set Breakdown
      supabase.from('set_breakdown')
        .select('*')
        .eq('match_id', id)
        .order('set_number', { ascending: true }),

      // Category Breakdown
      supabase.from('category_breakdown')
        .select('*')
        .eq('match_id', id)
        .order('total_shots', { ascending: false }),

      // Tactical Insights
      supabase.from('tactical_insights')
        .select('*')
        .eq('match_id', id)
        .order('win_percentage', { ascending: false }),

      // Lucky Shots - fetch all points with lucky shot flag
      supabase.from('points')
        .select('winner, winning_shot_id, is_lucky_shot')
        .eq('match_id', id)
    ]);

    // Check for errors and log results
    const results = [
      { name: 'Match Summary', result: matchSummary },
      { name: 'Most Effective Shots', result: mostEffectiveShots },
      { name: 'Most Costly Shots', result: mostCostlyShots },
      { name: 'Shot Distribution', result: shotDistribution },
      { name: 'Hand Analysis', result: handAnalysis },
      { name: 'Opponent Hand Analysis', result: opponentHandAnalysis },
      { name: 'Shot Hand Analysis', result: shotHandAnalysis },
      { name: 'Set Breakdown', result: setBreakdown },
      { name: 'Category Breakdown', result: categoryBreakdown },
      { name: 'Tactical Insights', result: tacticalInsights },
      { name: 'Lucky Shots', result: luckyShots }
    ];

    for (const { name, result } of results) {
      if (result.error) {
        if (isPostgrestError(result.error)) {
          throw new Error(`${name} query failed: ${result.error.message}`);
        }
        throw new Error(`${name} query failed with unknown error`);
      }
    }

    const finalResult = {
      matchSummary: matchSummary.data,
      mostEffectiveShots: mostEffectiveShots.data,
      mostCostlyShots: mostCostlyShots.data,
      shotDistribution: shotDistribution.data,
      handAnalysis: handAnalysis.data,
      opponentHandAnalysis: opponentHandAnalysis.data,
      shotHandAnalysis: shotHandAnalysis.data,
      setBreakdown: setBreakdown.data,
      categoryBreakdown: categoryBreakdown.data,
      tacticalInsights: tacticalInsights.data,
      luckyShots: luckyShots.data
    };
    
    return finalResult;
  },

  // Create a new match
  createMatch: async (match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId?: string) => {
    let user_id = userId;
    
    if (!user_id) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');
      user_id = userData.user.id;
    }

    const insertData = { ...match, user_id };

    const { data, error } = await supabase
      .from('matches')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a match
  updateMatch: async (id: string, match: Partial<Match>) => {
    const { data, error } = await supabase
      .from('matches')
      .update(match)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a match
  deleteMatch: async (id: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Match deleted successfully', id };
  }
};

/**
 * Set API functions
 */
export const setApi = {
  // Get all sets for a match
  getSetsByMatchId: async (matchId: string) => {
    const { data, error } = await supabase
      .from('sets')
      .select('*')
      .eq('match_id', matchId)
      .order('set_number', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create a new set
  createSet: async (set: Omit<MatchSet, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('sets')
      .insert([set])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a set
  updateSet: async (id: string, set: Partial<MatchSet>) => {
    const { data, error } = await supabase
      .from('sets')
      .update(set)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Point API functions
 */
export const pointApi = {
  // Get all points for a set
  getPointsBySetId: async (setId: string) => {
    const { data, error } = await supabase
      .from('points')
      .select('*')
      .eq('set_id', setId)
      .order('point_number', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create a new point
  createPoint: async (point: Omit<Point, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('points')
      .insert([point])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a point
  deletePoint: async (id: string) => {
    const { error } = await supabase
      .from('points')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Point deleted successfully' };
  }
};

/**
 * Shot API functions
 */
export const shotApi = {
  // Get all shot categories
  getCategories: async () => {
    const { data, error } = await supabase
      .from('shot_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get all shots
  getShots: async () => {
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create a new shot category
  createCategory: async (category: { name: string; display_order: number }) => {
    const { data, error } = await supabase
      .from('shot_categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a shot category
  updateCategory: async (id: string, category: { name?: string; display_order?: number }) => {
    const { data, error } = await supabase
      .from('shot_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a shot category
  deleteCategory: async (id: string) => {
    const { error } = await supabase
      .from('shot_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Category deleted successfully', id };
  },

  // Create a new shot
  createShot: async (shot: { 
    category_id: string; 
    name: string; 
    display_name: string; 
    description?: string; 
    display_order: number 
  }) => {
    const { data, error } = await supabase
      .from('shots')
      .insert([shot])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a shot
  updateShot: async (id: string, shot: { 
    category_id?: string; 
    name?: string; 
    display_name?: string; 
    description?: string; 
    display_order?: number 
  }) => {
    const { data, error } = await supabase
      .from('shots')
      .update(shot)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a shot
  deleteShot: async (id: string) => {
    const { error } = await supabase
      .from('shots')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Shot deleted successfully', id };
  }
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi
};