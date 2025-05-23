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
      setBreakdown,
      tacticalInsights
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
        .order('success_rate', { ascending: false }),

      // Most Costly Shots
      supabase.from('most_costly_shots')
        .select('*')
        .eq('match_id', id)
        .order('success_rate', { ascending: true }),

      // Shot Distribution
      supabase.from('shot_distribution')
        .select('*')
        .eq('match_id', id)
        .order('total_shots', { ascending: false }),

      // Hand Analysis
      supabase.from('hand_analysis')
        .select('*')
        .eq('match_id', id),

      // Set Breakdown
      supabase.from('set_breakdown')
        .select('*')
        .eq('match_id', id)
        .order('set_number', { ascending: true }),

      // Tactical Insights
      supabase.from('tactical_insights')
        .select('*')
        .eq('match_id', id)
        .order('win_percentage', { ascending: false })
    ]);

    // Check for errors
    const results = [
      { name: 'Match Summary', result: matchSummary },
      { name: 'Most Effective Shots', result: mostEffectiveShots },
      { name: 'Most Costly Shots', result: mostCostlyShots },
      { name: 'Shot Distribution', result: shotDistribution },
      { name: 'Hand Analysis', result: handAnalysis },
      { name: 'Set Breakdown', result: setBreakdown },
      { name: 'Tactical Insights', result: tacticalInsights }
    ];

    for (const { name, result } of results) {
      if (result.error) {
        if (isPostgrestError(result.error)) {
          throw new Error(`${name} query failed: ${result.error.message}`);
        }
        throw new Error(`${name} query failed with unknown error`);
      }
    }

    return {
      matchSummary: matchSummary.data,
      mostEffectiveShots: mostEffectiveShots.data,
      mostCostlyShots: mostCostlyShots.data,
      shotDistribution: shotDistribution.data,
      handAnalysis: handAnalysis.data,
      setBreakdown: setBreakdown.data,
      tacticalInsights: tacticalInsights.data
    };
  },

  // Create a new match
  createMatch: async (match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId?: string) => {
    console.log('createMatch: Starting, match data:', match);
    
    let user_id = userId;
    
    if (!user_id) {
      console.log('createMatch: Getting user from auth...');
      const { data: userData } = await supabase.auth.getUser();
      console.log('createMatch: User data:', userData);
      
      if (!userData.user) throw new Error('User not authenticated');
      user_id = userData.user.id;
    }

    const insertData = { ...match, user_id };
    console.log('createMatch: Inserting data:', insertData);

    const { data, error } = await supabase
      .from('matches')
      .insert([insertData])
      .select()
      .single();

    console.log('createMatch: Insert result - data:', data, 'error:', error);

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
  }
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi
};