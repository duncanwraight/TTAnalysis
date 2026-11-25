/**
 * The AI coach's summary of a match. Shared by the analysis page and the
 * match-summary Edge Function, so it stays free of React, Supabase and Deno.
 *
 * The function sends the model the match details, the computed analysis and
 * one line per point, then the shot guide for the shots that appear. The
 * input is hashed so the page can tell when a stored summary no longer matches
 * the points or the guide.
 */

import { shotLabel, type Analysis, type AnalysisShot } from './analysis.ts';
import { qualityLabel, sortQualities } from './shotGuide.ts';

export const SUMMARY_MODEL = 'claude-opus-5-5';

// Part of every input hash. Bump it when the prompt or input changes enough
// that stored summaries should show as out of date.
export const SUMMARY_VERSION = 7;

/**
 * What a problem is about, which decides the advice it gets: unforced errors get
 * technical advice only, a receive gets the receive guidance, and a situation
 * (a set, a spell of points, the close of sets) gets tactical advice only.
 */
export const PROBLEM_KINDS = ['shot', 'unforced', 'receive', 'serve', 'situation'] as const;
export type ProblemKind = typeof PROBLEM_KINDS[number];

export type SummaryProblem = {
  kind: ProblemKind;
  title: string;
  detail: string;
  // What to check and vary; empty for unforced errors, which only get technical advice
  tactical: string;
  // What a stroke or spin-reading fault would look like on the video; empty when it doesn't apply
  technical: string;
};
// Summaries from version 1 had a single "try" in place of tactical and technical,
// and summaries before version 6 have no kind
export type StoredProblem = Omit<SummaryProblem, 'kind' | 'tactical' | 'technical'> & { kind?: ProblemKind; tactical?: string; technical?: string; try?: string };
export type SummaryNote = { title: string; detail: string };
export type MatchSummary = {
  headline: string;
  problems: SummaryProblem[];
  // Empty when the points show no pattern worth a note on the mental side
  mental: SummaryNote[];
};
export type StoredMatchSummary = Omit<MatchSummary, 'problems'> & { problems: StoredProblem[] };

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
          kind: { type: 'string', enum: [...PROBLEM_KINDS] },
          title: { type: 'string' },
          detail: { type: 'string' },
          tactical: { type: 'string' },
          technical: { type: 'string' },
        },
        required: ['kind', 'title', 'detail', 'tactical', 'technical'],
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

const isShortEnough = (v: string) => v.trim() === '' || v.trim().split(/\s+/).length <= MAX_FIELD_WORDS;
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && isShortEnough(v);
const isOptionalText = (v: unknown): v is string => typeof v === 'string' && isShortEnough(v);

const isKind = (v: unknown): v is ProblemKind => PROBLEM_KINDS.includes(v as ProblemKind);

export const isMatchSummary = (v: unknown): v is MatchSummary => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return isText(s.headline)
    && Array.isArray(s.problems)
    && s.problems.every(p => p && isKind(p.kind) && isText(p.title) && isText(p.detail)
      && isOptionalText(p.tactical) && isOptionalText(p.technical)
      && (p.kind === 'unforced' ? isText(p.technical) : p.kind === 'situation' ? isText(p.tactical) : isText(p.tactical) || isText(p.technical)))
    && Array.isArray(s.mental)
    && s.mental.every(m => m && isText(m.title) && isText(m.detail));
};

/**
 * Applies the rules the prompt states but the model can still break: an
 * unforced problem has no tactical part, and a situation has no technical part.
 * Run before isMatchSummary, which then checks the part that's left.
 */
export const enforceKinds = (v: unknown): unknown => {
  if (!v || typeof v !== 'object' || !Array.isArray((v as { problems?: unknown }).problems)) return v;
  const s = v as { problems: Record<string, unknown>[] };
  return {
    ...s,
    problems: s.problems.map(p => (
      p?.kind === 'unforced' ? { ...p, tactical: '' }
        : p?.kind === 'situation' ? { ...p, technical: '' }
          : p)),
  };
};

export type SummaryMatch = {
  player_name?: string | null;
  opponent_name: string;
  event?: string | null;
  date: string;
  best_of: number;
};

/**
 * The shot guide for the shots in this match: what to check, and what a
 * technical fault looks like. Shots with neither are left out.
 */
const buildShotGuide = (analysis: Analysis, shots: AnalysisShot[]): string[] => {
  const used = new Set([...analysis.shots.player, ...analysis.shots.opponent].map(s => s.shot));
  // Every match has serves, and the serve guide also covers receiving, so it's
  // always included even when no serve won or lost a point outright
  for (const shot of shots) if (shot.name === 'serve') used.add(shotLabel(shot));
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const shot of shots) {
    const label = shotLabel(shot);
    if (!used.has(label) || seen.has(label)) continue;
    seen.add(label);
    const checks = sortQualities(shot.check_qualities ?? []).map(qualityLabel);
    const technical = shot.technical_notes?.trim();
    if (!checks.length && !technical) continue;
    lines.push([
      `${label}.`,
      checks.length ? `Check: ${checks.join(', ')}.` : 'Check: nothing listed.',
      technical ? `Technical: ${technical}` : 'Technical: no notes.',
    ].join(' '));
  }
  return lines.sort();
};

/** The user message sent to the model: match details, computed analysis, every point, then the shot guide. */
export const buildSummaryInput = (match: SummaryMatch, analysis: Analysis, shots: AnalysisShot[]): string => {
  // Ids, row keys and the page's own cards add tokens without adding information.
  // JSON.stringify leaves out the undefined fields.
  const { rows, ...rest } = analysis;
  const noKey = <T extends { key: string }>(item: T) => ({ ...item, key: undefined });
  const computed = {
    ...rest,
    cards: undefined,
    // The per-point gaps are in the point list; each set gets the facts drawn from them
    sets: rest.sets.map(s => ({
      setNumber: s.setNumber,
      score: `${s.playerScore}-${s.opponentScore}`,
      afterSix: s.afterSix,
      biggestLead: s.biggestLead,
      closingRun: s.closingRun,
      playerServe: s.playerServe,
      opponentServe: s.opponentServe,
    })),
    runs: rest.runs.filter(r => r.length >= 4),
    balance: { ...rest.balance, shots: rest.balance.shots.map(noKey) },
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
    const flags = [
      r.isLucky && 'lucky',
      r.isUnforced && 'unforced',
      r.isAttackedFirst && 'attacked first',
      r.isThirdBall && 'third ball',
      r.decidedBy === 'serve' && 'serve won',
      r.decidedBy === 'receive' && 'receive won',
    ].filter(Boolean).join(' ');
    return [r.setNumber, r.number, r.server, r.winner, `${r.playerScore}-${r.opponentScore}`,
      r.winningShot ?? '-', r.losingShot ?? '-', flags].join(',');
  });

  return [
    `${details}.`,
    '',
    'Computed analysis (player = the player named above):',
    JSON.stringify(computed),
    '',
    'Points in order. Columns: set, point, server, winner, score after (player-opponent), winning shot, loser\'s last shot, flags (lucky, unforced, attacked first, third ball, serve won, receive won).',
    ...points,
    '',
    'Shot guide. For each shot in this match: the qualities worth checking, then what a technical fault looks like.',
    ...guideOrNone(buildShotGuide(analysis, shots)),
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

const guideOrNone = (lines: string[]) => (lines.length ? lines : ['No guide for these shots.']);

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
