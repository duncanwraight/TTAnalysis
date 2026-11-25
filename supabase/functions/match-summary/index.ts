// Writes the AI coach's summary of one match.
//
// POST { matchId, notes? }, with the signed-in user's Authorization header. The user
// must own the match and have ai_summaries_enabled set by an admin. The match
// is loaded as the user, so RLS applies; the service role is only used to read
// the flag and budget and to write the summary and usage rows.
//
// notes are the owner's corrections to the current summary. Sending them
// always rewrites it, with the previous summary and the notes after the match
// data; an empty string clears them. Saved notes are applied again whenever the
// summary is rewritten after the points change. Without notes, a summary whose
// input hash still matches is returned without calling the model. Every model call is logged to ai_usage before anything else can fail,
// and no call is made once this month's logged spend reaches the budget.

import Anthropic from 'npm:@anthropic-ai/sdk@1.13.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { buildAnalysis, type AnalysisShot } from '../../../src/lib/analysis.ts';
import {
  MAX_NOTES_LENGTH, SUMMARY_MODEL, SUMMARY_SCHEMA, buildSummaryInput, costUsd, hashInput, isMatchSummary, notesMessage,
} from '../../../src/lib/aiSummary.ts';
import { SYSTEM_PROMPT } from './prompt.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const fail = (status: number, error: string) => reply(status, { error });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Method not allowed');

  const authorization = req.headers.get('Authorization');
  if (!authorization) return fail(401, 'Sign in to generate a summary.');

  let matchId: unknown;
  let rawNotes: unknown;
  try {
    ({ matchId, notes: rawNotes } = await req.json());
  } catch {
    return fail(400, 'The request body must be JSON.');
  }
  if (typeof matchId !== 'string' || !UUID.test(matchId)) return fail(400, 'matchId must be a match id.');
  if (rawNotes !== undefined && typeof rawNotes !== 'string') return fail(400, 'notes must be text.');
  // undefined: keep any saved notes; '': clear them
  const newNotes = typeof rawNotes === 'string' ? rawNotes.trim() : undefined;
  if (newNotes && newNotes.length > MAX_NOTES_LENGTH) return fail(400, `Keep notes under ${MAX_NOTES_LENGTH} characters.`);

  try {
    const url = env('SUPABASE_URL');
    const asUser = createClient(url, env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const service = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return fail(401, 'Sign in to generate a summary.');

    const { data: profile, error: profileError } = await service
      .from('profiles').select('ai_summaries_enabled').eq('id', user.id).single();
    if (profileError) throw profileError;
    if (!profile?.ai_summaries_enabled) return fail(403, 'AI summaries are not turned on for your account.');

    const { data: match, error: matchError } = await asUser
      .from('matches')
      .select('id, user_id, player_name, opponent_name, event, date, best_of, initial_server')
      .eq('id', matchId)
      .maybeSingle();
    if (matchError) throw matchError;
    if (!match || match.user_id !== user.id) return fail(404, 'Match not found.');

    const [sets, points, shots] = await Promise.all([
      asUser.from('sets').select('id, set_number, player_score, opponent_score').eq('match_id', matchId),
      asUser.from('points')
        .select('id, set_id, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, is_lucky_shot, is_unforced_error')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true }),
      asUser.from('shots').select('id, name, display_name, check_qualities, technical_notes, role, shot_categories(name, display_order)'),
    ]);
    for (const result of [sets, points, shots]) if (result.error) throw result.error;
    if (!points.data?.length) return fail(400, 'Record some points before asking for a summary.');

    type ShotRow = {
      id: string; name: string; display_name: string; check_qualities: string[] | null; technical_notes: string | null;
      role: AnalysisShot['role'];
      shot_categories: { name: string; display_order: number } | null;
    };
    const shotList = (shots.data as unknown as ShotRow[]).map((s): AnalysisShot => ({
      id: s.id,
      name: s.name,
      display_name: s.display_name,
      category: s.shot_categories?.name ?? '',
      category_order: s.shot_categories?.display_order ?? 0,
      check_qualities: s.check_qualities ?? [],
      technical_notes: s.technical_notes,
      role: s.role,
    }));
    const analysis = buildAnalysis({
      initialServer: match.initial_server ?? 'player',
      sets: sets.data ?? [],
      points: points.data,
      shots: shotList,
    });
    const input = buildSummaryInput(match, analysis, shotList);
    const inputHash = await hashInput(input);

    const [{ data: existing, error: existingError }, { data: saved, error: savedError }] = await Promise.all([
      service.from('match_summaries').select('summary, input_hash, model, created_at').eq('match_id', matchId).maybeSingle(),
      service.from('match_summary_notes').select('notes').eq('match_id', matchId).maybeSingle(),
    ]);
    if (existingError) throw existingError;
    if (savedError) throw savedError;
    if (newNotes === undefined && existing?.input_hash === inputHash) return reply(200, { ...existing, notes: saved?.notes ?? null });
    if (newNotes && !existing) return fail(400, 'Write a summary before adding notes to it.');
    const notes = newNotes ?? saved?.notes ?? '';

    // Budget for the current calendar month, UTC
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const [settings, usage] = await Promise.all([
      service.from('ai_settings').select('monthly_budget_usd').single(),
      service.from('ai_usage').select('cost_usd').gte('created_at', monthStart),
    ]);
    if (settings.error) throw settings.error;
    if (usage.error) throw usage.error;
    const spent = (usage.data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
    if (spent >= Number(settings.data.monthly_budget_usd)) {
      return fail(429, 'This month\'s AI budget has been used. Summaries will be available again next month.');
    }

    const anthropic = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY') });
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: SUMMARY_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: notes && existing
          ? [
            { role: 'user', content: input },
            { role: 'assistant', content: JSON.stringify(existing.summary) },
            { role: 'user', content: notesMessage(notes) },
          ]
          : [{ role: 'user', content: input }],
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: SUMMARY_SCHEMA as unknown as Record<string, unknown> },
        },
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return fail(429, 'The AI service is busy. Try again in a minute.');
      if (err instanceof Anthropic.APIError) {
        console.error('Anthropic API error', err.status, err.message);
        return fail(502, 'The AI service returned an error. Try again later.');
      }
      throw err;
    }

    // The call is billed whatever happens next, so log it first
    const { error: usageError } = await service.from('ai_usage').insert({
      user_id: user.id,
      match_id: matchId,
      model: response.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd: costUsd(response.model, response.usage),
    });
    if (usageError) console.error('Failed to log AI usage', usageError);

    if (response.stop_reason !== 'end_turn') {
      console.error('Summary did not finish', response.stop_reason);
      return fail(502, response.stop_reason === 'refusal'
        ? 'The AI declined to summarise this match.'
        : 'The summary was cut short. Try again.');
    }

    const text = response.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('');
    let summary: unknown;
    try {
      summary = JSON.parse(text);
    } catch {
      summary = null;
    }
    if (!isMatchSummary(summary)) {
      console.error('Summary did not match the schema', text.slice(0, 500));
      return fail(502, 'The summary came back in the wrong shape. Try again.');
    }

    const row = { match_id: matchId, summary, input_hash: inputHash, model: response.model, created_at: new Date().toISOString() };
    const { error: saveError } = await service.from('match_summaries').upsert(row);
    if (saveError) throw saveError;

    if (newNotes !== undefined) {
      const { error: notesError } = newNotes
        ? await service.from('match_summary_notes').upsert({ match_id: matchId, notes: newNotes, updated_at: row.created_at })
        : await service.from('match_summary_notes').delete().eq('match_id', matchId);
      if (notesError) throw notesError;
    }

    return reply(200, { summary, input_hash: inputHash, model: response.model, created_at: row.created_at, notes: notes || null });
  } catch (err) {
    console.error('match-summary failed', err);
    return fail(500, 'Something went wrong writing the summary.');
  }
});
