/**
 * The AI coach's summary of a match. Shared by the analysis page and the
 * match-summary Edge Function, so it stays free of React, Supabase and Deno.
 *
 * The function sends the model the match details, the computed analysis and
 * one line per point. The input is hashed so the page can tell when a stored
 * summary no longer matches the points.
 */

import type { Analysis } from './analysis.ts';

export const SUMMARY_MODEL = 'claude-opus-5-5';

// Part of every input hash. Bump it when the prompt or input changes enough
// that stored summaries should show as out of date.
export const SUMMARY_VERSION = 1;

export type SummaryProblem = { title: string; detail: string; try: string };
export type SummaryNote = { title: string; detail: string };
export type MatchSummary = {
  headline: string;
  problems: SummaryProblem[];
  // Empty when the points show no pattern worth a note on the mental side
  mental: SummaryNote[];
};

/** JSON schema for structured output. Every object is closed and every field required. */
export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          try: { type: 'string' },
        },
        required: ['title', 'detail', 'try'],
        additionalProperties: false,
      },
    },
    mental: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['title', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'problems', 'mental'],
  additionalProperties: false,
} as const;

// The prompt asks for under 70 words a field. Well past that, the output has
// usually fallen apart into a run of fragments, so it's rejected rather than stored.
export const MAX_FIELD_WORDS = 140;

const isText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().split(/\s+/).length <= MAX_FIELD_WORDS;

export const isMatchSummary = (v: unknown): v is MatchSummary => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return isText(s.headline)
    && Array.isArray(s.problems)
    && s.problems.every(p => p && isText(p.title) && isText(p.detail) && isText(p.try))
    && Array.isArray(s.mental)
    && s.mental.every(m => m && isText(m.title) && isText(m.detail));
};

export type SummaryMatch = {
  player_name?: string | null;
  opponent_name: string;
  event?: string | null;
  date: string;
  best_of: number;
};

/** The user message sent to the model: match details, computed analysis, then every point. */
export const buildSummaryInput = (match: SummaryMatch, analysis: Analysis): string => {
  // Ids, row keys and the page's own cards add tokens without adding information.
  // JSON.stringify leaves out the undefined fields.
  const { rows, ...rest } = analysis;
  const noKey = <T extends { key: string }>(item: T) => ({ ...item, key: undefined });
  const computed = {
    ...rest,
    cards: undefined,
    shots: { player: rest.shots.player.map(noKey), opponent: rest.shots.opponent.map(noKey) },
    patterns: { player: rest.patterns.player.map(noKey), opponent: rest.patterns.opponent.map(noKey) },
  };

  const player = match.player_name?.trim() || 'Not given';
  const details = [
    `Player: ${player}`,
    `Opponent: ${match.opponent_name}`,
    match.event?.trim() ? `Event: ${match.event.trim()}` : null,
    `Date: ${match.date}`,
    `Best of ${match.best_of}`,
  ].filter(Boolean).join('. ');

  const points = rows.map(r => {
    const flags = [r.isLucky && 'lucky', r.isUnforced && 'unforced'].filter(Boolean).join(' ');
    return [r.setNumber, r.number, r.server, r.winner, `${r.playerScore}-${r.opponentScore}`,
      r.winningShot ?? '-', r.losingShot ?? '-', flags].join(',');
  });

  return [
    `${details}.`,
    '',
    'Computed analysis (player = the player named above):',
    JSON.stringify(computed),
    '',
    'Points in order. Columns: set, point, server, winner, score after (player-opponent), winning shot, loser\'s last shot, flags (lucky, unforced).',
    ...points,
  ].join('\n');
};

export const MAX_NOTES_LENGTH = 1000;

/** The follow-up message when the owner has notes on the previous summary. */
export const notesMessage = (notes: string) => [
  'Notes from the player on that summary:',
  '',
  notes,
  '',
  'Rewrite the whole summary with these notes in mind. Treat their corrections of what happened as true, even where the data seems to say otherwise. Follow their other requests where the data allows, and keep to the rules you were given.',
].join('\n');

/** SHA-256 of the model, version and input, as hex. */
export const hashInput = async (input: string): Promise<string> => {
  const text = `${SUMMARY_MODEL}\n${SUMMARY_VERSION}\n${input}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
};

// US dollars per million tokens. Thinking tokens are billed and counted as output.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

export type SummaryUsage = { input_tokens: number; output_tokens: number };

/** Cost of one call in US dollars. An unknown model is charged at Opus rates so spend is never undercounted. */
export const costUsd = (model: string, usage: SummaryUsage): number => {
  const price = PRICES[model] ?? PRICES['claude-opus-5-5'];
  return (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000;
};
