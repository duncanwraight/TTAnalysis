import { describe, expect, it } from 'vitest';
import type { AnalysisPoint, AnalysisSet } from './analysis.ts';
import { checkPointEdits, editChanges, editFromPoint, normaliseEdit, type PointEdit } from './pointEdits.ts';
import type { Side } from './scoring.ts';

const shots = [
  { id: 'serve', name: 'serve' },
  { id: 'fault', name: 'service_fault' },
  { id: 'none', name: 'no_shot' },
  { id: 'loop', name: 'loop' },
  { id: 'push', name: 'push' },
];

// A set from a string of winners: p for the player, o for the opponent
const buildSet = (setId: string, winners: string, startAt = 0): AnalysisPoint[] =>
  [...winners].map((w, i) => ({
    id: `${setId}-${i + startAt + 1}`,
    set_id: setId,
    winner: (w === 'p' ? 'player' : 'opponent') as Side,
    winning_shot_id: 'loop',
    winning_hand: 'fh',
    other_shot_id: 'push',
    other_hand: 'bh',
  }));

const setRow = (id: string, n: number, points: AnalysisPoint[]): AnalysisSet => ({
  id,
  set_number: n,
  player_score: points.filter(p => p.winner === 'player').length,
  opponent_score: points.filter(p => p.winner === 'opponent').length,
});

const flip = (p: AnalysisPoint, extra: Partial<PointEdit> = {}): PointEdit => ({
  ...editFromPoint(p),
  winner: p.winner === 'player' ? 'opponent' : 'player',
  ...extra,
});

// 11-5 to the player
const elevenFive = () => {
  const pts = buildSet('s1', 'ppoppoppopoppopp');
  return { pts, set: setRow('s1', 1, pts) };
};

describe('checkPointEdits', () => {
  it('saves a shot change without touching the score', () => {
    const { pts, set } = elevenFive();
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [{ ...editFromPoint(pts[3]), winning_shot_id: 'push', winning_hand: 'bh' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sets).toEqual([]);
      expect(result.points[3].winning_shot_id).toBe('push');
    }
  });

  it('refuses a single winner change in a set that reached 11', () => {
    const { pts, set } = elevenFive();
    expect(set.player_score).toBe(11);
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [flip(pts[0])],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/Set 1 would end 10-6/);
  });

  it('accepts two winner changes that cancel out', () => {
    const { pts, set } = elevenFive();
    // Point 3 went to the opponent; swap it with point 1
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [flip(pts[0]), flip(pts[2])],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sets).toEqual([]);
  });

  it('refuses a change that would end the set early', () => {
    // 10-10 then the player wins 12-10
    const pts = buildSet('s1', 'popopopopopopopopopopp');
    const set = setRow('s1', 1, pts);
    // Making point 19 the player's leaves 11-9 after point 20
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [flip(pts[19]), flip(pts[18])],
    });
    expect(result.ok).toBe(true);
    const early = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [flip(pts[17])],
    });
    expect(early.ok).toBe(false);
  });

  it('lets a winner change through in the set still being entered', () => {
    const pts = buildSet('s1', 'ppoop');
    const set = setRow('s1', 1, pts);
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [flip(pts[2])],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sets).toEqual([{ id: 's1', player_score: 4, opponent_score: 1, score: '4-1' }]);
      expect(result.match).toEqual({ match_score: '0-0', is_complete: false });
    }
  });

  it('refuses a level score in a set that was ended early', () => {
    const first = buildSet('s1', 'ppop');
    const second = buildSet('s2', 'pp');
    const sets = [setRow('s1', 1, first), setRow('s2', 2, second)];
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets, points: [...first, ...second], shots,
      edits: [flip(first[0])],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/level at 2-2/);
  });

  it('refuses a serve as the winning shot of the receiver', () => {
    const { pts, set } = elevenFive();
    // The player serves points 1 and 2; the opponent wins point 3, which the opponent serves
    const bad = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [{ ...editFromPoint(pts[0]), winning_shot_id: 'serve' }, { ...editFromPoint(pts[2]), winning_shot_id: 'fault' }],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems).toHaveLength(1);
    if (!bad.ok) expect(bad.problems[0]).toMatch(/point 3: a service fault/);
  });

  it('refuses a service fault as the losing shot', () => {
    const { pts, set } = elevenFive();
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets: [set], points: pts, shots,
      edits: [{ ...editFromPoint(pts[0]), other_shot_id: 'fault' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/not a losing shot/);
  });

  it('completes the match when the last set now finishes', () => {
    const a = buildSet('s1', 'ppppppppppp');
    const b = buildSet('s2', 'ppppppppppp');
    const c = buildSet('s3', 'ppppppppppo');
    const sets = [setRow('s1', 1, a), setRow('s2', 2, b), setRow('s3', 3, c)];
    const result = checkPointEdits({
      initialServer: 'player', bestOf: 5, isComplete: false, sets, points: [...a, ...b, ...c], shots,
      edits: [flip(c[10])],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.match).toEqual({ match_score: '3-0', is_complete: true });
  });
});

describe('normaliseEdit', () => {
  const name = (id: string) => shots.find(s => s.id === id)?.name;

  it('makes a service fault unforced with no attack', () => {
    const e = normaliseEdit({ ...editFromPoint(buildSet('s', 'p')[0]), winning_shot_id: 'fault', is_attacked_first: true }, name);
    expect(e).toMatchObject({ is_unforced_error: true, is_attacked_first: false, is_early_attack: false });
  });

  it('keeps attacking straight away an attack first', () => {
    const e = normaliseEdit({ ...editFromPoint(buildSet('s', 'p')[0]), is_early_attack: true }, name);
    expect(e.is_attacked_first).toBe(true);
  });
});

describe('editChanges', () => {
  it('spots a changed hand', () => {
    const p = buildSet('s', 'p')[0];
    expect(editChanges(p, editFromPoint(p))).toBe(false);
    expect(editChanges(p, { ...editFromPoint(p), other_hand: 'fh' })).toBe(true);
  });
});
