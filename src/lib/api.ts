/**
 * API client for interacting with the database
 * Uses Supabase client directly
 */

import { Match, MatchSet, Point } from '../types/database.types';
import { supabase, createSharedClient } from './supabase';
import { invalidateShotData } from './shotsApi';
import { FunctionsHttpError, PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisPoint, AnalysisSet, AnalysisShot, Role } from './analysis';
import type { StoredMatchSummary } from './aiSummary';
import { hasKit, opponentKit, type Kit, type KitNote, type MatchKit, type Player, type PlayStyle, type StyleData, type StyleMatchup } from './styles';

export type AnalysisMatch = MatchKit & Pick<Match, 'id' | 'opponent_name' | 'player_name' | 'player_id' | 'event' | 'video_url' | 'date' | 'best_of' | 'initial_server' | 'share_token' | 'confirmed_tags' | 'sweep_progress'>;

export type MatchDetails = MatchKit & Pick<Match, 'opponent_name' | 'player_name' | 'player_id' | 'event' | 'video_url' | 'date'>;

// The match columns that hold each side's style, hand and rubbers
export const MATCH_KIT_COLUMNS = 'player_style_id, player_hand, player_forehand_rubber, player_backhand_rubber, opponent_style_id, opponent_hand, opponent_forehand_rubber, opponent_backhand_rubber';

export type AnalysisData = {
  match: AnalysisMatch;
  sets: AnalysisSet[];
  points: AnalysisPoint[];
  shots: AnalysisShot[];
  summary: StoredSummary | null;
  // The owner's notes for the next rewrite; always null on a shared view
  summaryNotes: string | null;
  styles: StyleData;
  // The player's notes, for the coach's summary; always null on a shared view
  playerNotes: string | null;
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
    const [match, sets, points, shots, summary, notes, styleData] = await Promise.all([
      client.from('matches')
        .select(`id, opponent_name, player_name, player_id, event, video_url, date, best_of, initial_server, share_token, confirmed_tags, sweep_progress, ${MATCH_KIT_COLUMNS}`)
        .eq('id', id)
        .single(),
      client.from('sets')
        .select('id, set_number, player_score, opponent_score')
        .eq('match_id', id),
      client.from('points')
        .select('id, set_id, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, is_lucky_shot, is_unforced_error, is_attacked_first, is_early_attack')
        .eq('match_id', id)
        .order('created_at', { ascending: true }),
      client.from('shots')
        .select('id, name, display_name, check_qualities, technical_notes, role, shot_categories(name, display_order)'),
      // Readable by the owner, or with the share token on a shared client
      client.from('match_summaries')
        .select('summary, input_hash, model, created_at')
        .eq('match_id', id)
        .maybeSingle(),
      // Owner only, so empty on a shared client
      client.from('match_summary_notes').select('notes').eq('match_id', id).maybeSingle(),
      styleApi.getStyleData(client),
    ]);

    for (const [name, result] of [['Match', match], ['Sets', sets], ['Points', points], ['Shots', shots]] as const) {
      if (result.error) {
        throw new Error(`${name} query failed: ${isPostgrestError(result.error) ? result.error.message : 'unknown error'}`);
      }
    }

    type ShotRow = {
      id: string; name: string; display_name: string; check_qualities: string[] | null; technical_notes: string | null;
      role: Role | null;
      shot_categories: { name: string; display_order: number } | null;
    };
    const analysisMatch = match.data as AnalysisMatch;
    // Players are owner only, so a shared client gets nothing back
    let playerNotes: string | null = null;
    if (analysisMatch.player_id) {
      const player = await client.from('players').select('notes').eq('id', analysisMatch.player_id).maybeSingle();
      playerNotes = player.error ? null : (player.data?.notes ?? null);
    }

    return {
      match: analysisMatch,
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
        role: s.role,
      })),
      // A summary that fails to load shouldn't take the analysis down with it
      summary: summary.error ? null : (summary.data as StoredSummary | null),
      summaryNotes: notes.error ? null : (notes.data?.notes ?? null),
      styles: styleData,
      playerNotes,
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

  // Change the ticks on a recorded point: lucky, unforced, attacked first, attacked straight away
  updatePoint: async (id: string, changes: Partial<Pick<Point, 'is_lucky_shot' | 'is_unforced_error' | 'is_attacked_first' | 'is_early_attack'>>) => {
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
    role?: Role | null;
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
    role?: Role | null;
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

/**
 * Styles of play, hand and rubber notes, and match-ups. Anyone can read them;
 * only admins can change them.
 */
export const styleApi = {
  getStyleData: async (client: SupabaseClient = supabase): Promise<StyleData> => {
    const [styles, kitNotes, matchups] = await Promise.all([
      client.from('play_styles').select('id, name, description, as_notes, against_notes, display_order').order('display_order').order('name'),
      client.from('kit_notes').select('key, against_notes'),
      client.from('style_matchups').select('id, player_style_id, opponent_style_id, notes'),
    ]);
    for (const result of [styles, kitNotes, matchups]) if (result.error) throw result.error;
    return {
      styles: styles.data as PlayStyle[],
      kitNotes: kitNotes.data as KitNote[],
      matchups: matchups.data as StyleMatchup[],
    };
  },

  saveStyle: async (style: Omit<PlayStyle, 'id'> & { id?: string }) => {
    const { id, ...fields } = style;
    const { error } = id
      ? await supabase.from('play_styles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
      : await supabase.from('play_styles').insert([fields]);
    if (error) throw error;
  },

  deleteStyle: async (id: string) => {
    const { error } = await supabase.from('play_styles').delete().eq('id', id);
    if (error) throw error;
  },

  saveKitNote: async (note: KitNote) => {
    const { error } = await supabase.from('kit_notes')
      .update({ against_notes: note.against_notes, updated_at: new Date().toISOString() })
      .eq('key', note.key);
    if (error) throw error;
  },

  saveMatchup: async (matchup: Omit<StyleMatchup, 'id'> & { id?: string }) => {
    const { id, ...fields } = matchup;
    const { error } = id
      ? await supabase.from('style_matchups').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
      : await supabase.from('style_matchups').insert([fields]);
    if (error) throw error;
  },

  deleteMatchup: async (id: string) => {
    const { error } = await supabase.from('style_matchups').delete().eq('id', id);
    if (error) throw error;
  },

  // How many matches use each style, on either side, for the admin page
  getStyleUsage: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.rpc('style_usage');
    if (error) throw error;
    return Object.fromEntries((data as { style_id: string; matches: number }[]).map(r => [r.style_id, Number(r.matches)]));
  },
};

const PLAYER_COLUMNS = 'id, name, is_self, style_id, hand, forehand_rubber, backhand_rubber, notes';

/** The account owner's players: themselves and the people whose matches they enter. */
export const playerApi = {
  getPlayers: async (): Promise<Player[]> => {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_COLUMNS)
      .order('is_self', { ascending: false })
      .order('name');
    if (error) throw error;
    return data as Player[];
  },

  // Number of matches for each player
  getMatchCounts: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from('matches').select('player_id').not('player_id', 'is', null);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data as { player_id: string }[]) counts[row.player_id] = (counts[row.player_id] ?? 0) + 1;
    return counts;
  },

  savePlayer: async (player: Omit<Player, 'id'> & { id?: string }): Promise<Player> => {
    const { id, ...fields } = player;
    const query = id
      ? supabase.from('players').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
      : supabase.from('players').insert([fields]);
    const { data, error } = await query.select(PLAYER_COLUMNS).single();
    if (error) throw error;
    return data as Player;
  },

  // Make this player "you". The old self player becomes an ordinary player, and
  // matches with no player name (the owner's own, from before players) move across.
  setSelfPlayer: async (id: string) => {
    const { error } = await supabase.rpc('set_self_player', { target: id });
    if (error) throw error;
  },

  deletePlayer: async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },

  // The opponent's style, hand and rubbers from the latest match against that name, if any
  getLastOpponentKit: async (opponentName: string): Promise<{ kit: Kit; date: string } | null> => {
    const name = opponentName.trim();
    if (!name) return null;
    const { data, error } = await supabase
      .from('matches')
      .select('date, opponent_style_id, opponent_hand, opponent_forehand_rubber, opponent_backhand_rubber')
      .ilike('opponent_name', name.replace(/[\\%_]/g, c => `\\${c}`))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    const found = (data as (MatchKit & { date: string })[]).find(m => hasKit(opponentKit(m)));
    return found ? { kit: opponentKit(found), date: found.date } : null;
  },
};

export default {
  match: matchApi,
  set: setApi,
  point: pointApi,
  shot: shotApi,
  style: styleApi,
  player: playerApi,
};