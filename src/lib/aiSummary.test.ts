import { describe, expect, it } from 'vitest';
import { AnalysisPoint, AnalysisShot, buildAnalysis } from './analysis';
import { buildSummaryInput, costUsd, hashInput, isMatchSummary } from './aiSummary';

const SHOTS: AnalysisShot[] = [
  { id: 'push', name: 'push', display_name: 'Push', category: 'short_game', category_order: 2 },
  { id: 'loop', name: 'loop', display_name: 'Loop', category: 'attacks', category_order: 4 },
  { id: 'block', name: 'block', display_name: 'Block', category: 'defence / blocks', category_order: 5 },
];

const point = (i: number, winner: 'player' | 'opponent', extra: Partial<AnalysisPoint> = {}): AnalysisPoint => ({
  id: `p${i}`,
  set_id: 'set-1',
  winner,
  winning_shot_id: 'loop',
  winning_hand: 'fh',
  other_shot_id: 'block',
  other_hand: 'bh',
  is_lucky_shot: false,
  is_unforced_error: false,
  ...extra,
});

const POINTS = [
  point(0, 'player'),
  point(1, 'opponent', { winning_shot_id: 'push', other_shot_id: 'loop', other_hand: 'fh', is_unforced_error: true }),
  point(2, 'player', { is_lucky_shot: true }),
];

const analysis = buildAnalysis({
  initialServer: 'player',
  sets: [{ id: 'set-1', set_number: 1, player_score: 2, opponent_score: 1 }],
  points: POINTS,
  shots: SHOTS,
});

const MATCH = { player_name: 'James Moore', opponent_name: 'Howard McCain', event: 'York One Star', date: '2026-11-14', best_of: 5 };

describe('summary input', () => {
  const input = buildSummaryInput(MATCH, analysis);

  it('starts with the match details', () => {
    expect(input.split('\n')[0]).toBe('Player: James Moore. Opponent: Howard McCain. Event: York One Star. Date: 2026-11-14. Best of 5.');
  });

  it('leaves out ids, row keys and the page cards', () => {
    const json = JSON.parse(input.split('\n')[3]);
    expect(json).not.toHaveProperty('rows');
    expect(json).not.toHaveProperty('cards');
    expect(json.shots.player[0]).not.toHaveProperty('key');
    expect(input).not.toContain('p0');
  });

  it('lists every point with its score and flags', () => {
    const lines = input.split('\n').slice(6);
    expect(lines).toEqual([
      '1,1,player,player,1-0,Loop FH,Block BH,',
      '1,2,player,opponent,1-1,Push FH,Loop FH,unforced',
      '1,3,opponent,player,2-1,Loop FH,Block BH,lucky',
    ]);
  });

  it('copes with a match that has no player name or event', () => {
    const first = buildSummaryInput({ ...MATCH, player_name: '', event: null }, analysis).split('\n')[0];
    expect(first).toBe('Player: Not given. Opponent: Howard McCain. Date: 2026-11-14. Best of 5.');
  });
});

describe('input hash', () => {
  it('changes when a point changes', async () => {
    const changed = buildAnalysis({
      initialServer: 'player',
      sets: [{ id: 'set-1', set_number: 1, player_score: 2, opponent_score: 1 }],
      points: [POINTS[0], { ...POINTS[1], is_unforced_error: false }, POINTS[2]],
      shots: SHOTS,
    });
    const a = await hashInput(buildSummaryInput(MATCH, analysis));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashInput(buildSummaryInput(MATCH, analysis))).toBe(a);
    expect(await hashInput(buildSummaryInput(MATCH, changed))).not.toBe(a);
  });
});

describe('cost', () => {
  it('prices the measured Opus test call', () => {
    expect(costUsd('claude-opus-5-5', { input_tokens: 6291, output_tokens: 3077 })).toBeCloseTo(0.086704, 6);
  });

  it('charges an unknown model at Opus rates', () => {
    expect(costUsd('claude-something-new', { input_tokens: 1_000_000, output_tokens: 0 })).toBe(4);
  });
});

describe('summary shape', () => {
  const valid = {
    headline: 'Lost 2-3.',
    problems: [{ title: 'Backhand loop', detail: 'Won 5, lost 12.', try: 'Check placement on the video.' }],
    mental: [],
  };

  it('accepts a complete summary', () => {
    expect(isMatchSummary(valid)).toBe(true);
  });

  it('rejects missing or empty fields', () => {
    expect(isMatchSummary(null)).toBe(false);
    expect(isMatchSummary({ ...valid, headline: ' ' })).toBe(false);
    expect(isMatchSummary({ ...valid, problems: [{ title: 'x', detail: 'y' }] })).toBe(false);
    expect(isMatchSummary({ ...valid, mental: undefined })).toBe(false);
  });

  it('rejects a field that has run on far past the limit', () => {
    const runOn = Array.from({ length: 141 }, () => 'Repeat.').join(' ');
    expect(isMatchSummary({ ...valid, mental: [{ title: 'Starts', detail: runOn }] })).toBe(false);
  });
});
