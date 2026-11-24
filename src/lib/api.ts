/**
 * API client for interacting with the database
 * Uses Supabase client directly
 */

import { Match, MatchSet, Point } from '../types/database.types';
import { supabase, createSharedClient } from './supabase';
import { invalidateShotData } from './shotsApi';
import { FunctionsHttpError, PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisPoint, AnalysisSet, AnalysisShot } from './analysis';
import type { StoredMatchSummary } from './aiSummary';

export type AnalysisMatch = Pick<Match, 'id' | 'opponent_name' | 'player_name' | 'event' | 'video_url' | 'date' | 'best_of' | 'initial_server' | 'share_token'>;

export type MatchDetails = Pick<Match, 'opponent_name' | 'player_name' | 'event' | 'video_url' | 'date'>;

export type AnalysisData = {
  match: AnalysisMatch;
  sets: AnalysisSet[];
  points: AnalysisPoint[];
  shots: AnalysisShot[];
  summary: StoredSummary | null;
  // The owner's notes for the next rewrite; always null on a shared view
  summaryNotes: string | null;
};

export type StoredSummary = {
  summary: StoredMatchSummary;
  input_hash: string;
  model: string;
  created_at: string;
};

export type GeneratedSummary = StoredSummary & { notes: string | null };

// Type guard for PostgrestError
function isPostgrestError(error: unknown): error is PostgrestError {
  const e = error as { code?: string; message?: string };
  return error !== null && typeof error === 'object' && typeof e.code === 'string' && typeof e.message === 'string';
}

/**
 * Match API functions
 */
export const matchApi = {
  // Get all matches owned by a user. Filter by user_id explicitly rather than
  // relying on RLS to scope the results.
  getAllMatches: async (userId: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', userId)
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
      // Recording order; point_number restarts every set
      supabase.from('points').select('*').eq('match_id', id).order('created_at', { ascending: true })
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

  // Get the analysis for a shared match from its share token. Throws if the
  // token is unknown or sharing has been turned off.
  getSharedAnalysis: async (shareToken: string) => {
    const client = createSharedClient(shareToken);
    const { data, error } = await client
      .from('matches')
      .select('id')
      .eq('share_token', shareToken)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Shared match not found');
    return matchApi.getAnalysis(data.id, client);
  },

  // Turn on sharing, returning the share token (reuses an existing one)
  enableSharing: async (id: string) => {
    const { data: existing, error: readError } = await supabase
      .from('matches')
      .select('share_token')
      .eq('id', id)
      .single();

    if (readError) throw readError;
    if (existing.share_token) return existing.share_token as string;

    const shareToken = crypto.randomUUID();
    const { error } = await supabase
      .from('matches')
      .update({ share_token: shareToken })
      .eq('id', id);

    if (error) throw error;
    return shareToken;
  },

  // Turn off sharing. The old link stops working for good.
  disableSharing: async (id: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ share_token: null })
      .eq('id', id);

    if (error) throw error;
  },

  // Everything the analysis page and points editor need: the match, its sets
  // and points in recorded order, and the shot list. Works with the shared
  // client too, since the share token grants read access to all of them.
  getAnalysis: async (id: string, client: SupabaseClient = supabase): Promise<AnalysisData> => {
    const [match, sets, points, shots, summary, notes] = await Promise.all([
      client.from('matches')
        .select('id, opponent_name, player_name, event, video_url, date, best_of, initial_server, share_token')
        .eq('id', id)
        .single(),
      client.from('sets')
        .select('id, set_number, player_score, opponent_score')
        .eq('match_id', id),
      client.from('points')
        .select('id, set_id, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, is_lucky_shot, is_unforced_error')
        .eq('match_id', id)
        .order('created_at', { ascending: true }),
      client.from('shots')
        .select('id, name, display_name, check_qualities, technical_notes, shot_categories(name, display_order)'),
      // Readable by the owner, or with the share token on a shared client
      client.from('match_summaries')
        .select('summary, input_hash, model, created_at')
        .eq('match_id', id)
        .maybeSingle(),
      // Owner only, so empty on a shared client
      client.from('match_summary_notes').select('notes').eq('match_id', id).maybeSingle(),
    ]);

    for (const [name, result] of [['Match', match], ['Sets', sets], ['Points', points], ['Shots', shots]] as const) {
      if (result.error) {
        throw new Error(`${name} query failed: ${isPostgrestError(result.error) ? result.error.message : 'unknown error'}`);
      }
    }

    type ShotRow = {
      id: string; name: string; display_name: string; check_qualities: string[] | null; technical_notes: string | null;
      shot_categories: { name: string; display_order: number } | null;
    };
    return {
      match: match.data as AnalysisMatch,
      sets: sets.data as AnalysisSet[],
      points: points.data as AnalysisPoint[],
      shots: (shots.data as unknown as ShotRow[]).map(s => ({
        id: s.id,
        name: s.name,
        display_name: s.display_name,
        category: s.shot_categories?.name ?? '',
        category_order: s.shot_categories?.display_order ?? 0,
        check_qualities: s.check_qualities ?? [],
        technical_notes: s.technical_notes,
      })),
      // A summary that fails to load shouldn't take the analysis down with it
      summary: summary.error ? null : (summary.data as StoredSummary | null),
      summaryNotes: notes.error ? null : (notes.data?.notes ?? null),
    };
  },

  // Ask the match-summary Edge Function for the AI summary. Without notes it
  // returns the stored one if the points haven't changed. With notes it always
  // rewrites the summary, and an empty string clears the saved notes.
  generateSummary: async (id: string, notes?: string): Promise<GeneratedSummary> => {
    const { data, error } = await supabase.functions.invoke('match-summary', { body: { matchId: id, notes } });
    if (error) {
      let message = 'The summary could not be written. Try again later.';
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (typeof body?.error === 'string') message = body.error;
      }
      throw new Error(message);
    }
    return data as GeneratedSummary;
  },

  // Create a new match
  createMatch: async (
    match: Omit<Match, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'best_of' | 'share_token' | 'is_complete'> & { best_of?: number },
    userId?: string
  ) => {
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

  // Delete a set
  deleteSet: async (id: string) => {
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', id);

    if (error) throw error;
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

  // Change the lucky and unforced flags on a recorded point
  updatePoint: async (id: string, changes: Pick<Point, 'is_lucky_shot' | 'is_unforced_error'>) => {
    const { error } = await supabase
      .from('points')
      .update(changes)
      .eq('id', id);

    if (error) throw error;
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
    invalidateShotData();
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
    invalidateShotData();
    return data;
  },

  // Delete a shot category
  deleteCategory: async (id: string) => {
    const { error } = await supabase
      .from('shot_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    invalidateShotData();
    return { message: 'Category deleted successfully', id };
  },

  // Create a new shot
  createShot: async (shot: { 
    category_id: string; 
    name: string; 
    display_name: string; 
    description?: string; 
    display_order: number;
    check_qualities?: string[];
    technical_notes?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('shots')
      .insert([shot])
      .select()
      .single();

    if (error) throw error;
    invalidateShotData();
    return data;
  },

  // Update a shot
  updateShot: async (id: string, shot: { 
    category_id?: string; 
    name?: string; 
    display_name?: string; 
    description?: string; 
    display_order?: number;
    check_qualities?: string[];
    technical_notes?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('shots')
      .update(shot)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    invalidateShotData();
    return data;
  },

  // Delete a shot
  deleteShot: async (id: string) => {
    const { error } = await supabase
      .from('shots')
      .delete()
      .eq('id', id);

    if (error) throw error;
    invalidateShotData();
    return { message: 'Shot deleted successfully', id };
  }
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi
};