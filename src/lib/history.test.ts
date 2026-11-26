import { describe, expect, it } from 'vitest';
import type { Analysis, AttackFirst, ShotRow, Tally } from './analysis';
import { buildHistory, filterMatches, formatRatio, DEFAULT_FILTERS, type HistoryMatch } from './history';
import { EMPTY_KIT, type Kit, type PlayStyle } from './styles';

const STYLES: PlayStyle[] = [
  { id: 'looper', name: 'Inverted looper', description: '', as_notes: '', against_notes: '', display_order: 1 },
  { id: 'defender', name: 'Classical defender', description: '', as_notes: '', against_notes: '', display_order: 2 },
];

type Spec = {
  sets: [number, number];
  points: [number, number];
  serve?: [number, number];
  receive?: [number, number];
  close?: [number, number];
  // Unforced errors, when confirmed
  unforced?: number;
  // Points where the player attacked first and where the opponent did, when confirmed
  attackFirst?: [number, number];
  shots?: { key: string; won: number; lost: number; unforced?: number }[];
  complete?: boolean;
  kit?: Partial<Kit>;
  event?: string;
};

const t = ([won, lost]: [number, number]): Tally => ({ won, lost });

const row = (s: { key: string; won: number; lost: number; unforced?: number }): ShotRow =>
  ({ key: s.key, shot: s.key, hand: null, category: '', won: s.won, lost: s.lost, unforced: s.unforced ?? 0 });

/** Only the parts of the analysis the history reads. */
const fakeAnalysis = (s: Spec): Analysis => {
  const pointsTotal = s.points[0] + s.points[1];
  const serve = s.serve ?? [Math.ceil(s.points[0] / 2), Math.ceil(s.points[1] / 2)];
  const receive = s.receive ?? [s.points[0] - serve[0], s.points[1] - serve[1]];
  const attackFirst: AttackFirst | null = s.attackFirst
    ? {
      confirmed: true,
      player: { won: s.attackFirst[0], lost: 0 },
      opponent: { won: 0, lost: s.attackFirst[1] },
      unclear: { won: 0, lost: 0 },
      byServer: {} as AttackFirst['byServer'],
    }
    : null;
  return {
    setsWon: t(s.sets),
    points: t(s.points),
    onServe: t(serve),
    onReceive: t(receive),
    fromEightAll: { ...t(s.close ?? [0, 0]), unforced: 0 },
    unforced: {
      recorded: s.unforced !== undefined,
      confirmed: s.unforced !== undefined,
      total: s.unforced ?? 0,
      onServe: 0,
      onReceive: 0,
      bunchedLate: false,
    },
    attackFirst,
    shots: { player: (s.shots ?? []).map(row), opponent: [] },
    // Not read by the history
    rows: Array.from({ length: pointsTotal }),
  } as unknown as Analysis;
};

let day = 1;
const match = (s: Spec): HistoryMatch => {
  const d = day++;
  return {
    id: `m${d}`,
    date: `2026-${String(Math.ceil(d / 28)).padStart(2, '0')}-${String(((d - 1) % 28) + 1).padStart(2, '0')}`,
    opponentName: `Opponent ${d}`,
    event: s.event ?? null,
    isComplete: s.complete ?? true,
    opponentKit: { ...EMPTY_KIT, ...s.kit },
    analysis: fakeAnalysis(s),
  };
};

describe('totals', () => {
  it('adds up every match, and only counts finished matches as won or lost', () => {
    const h = buildHistory([
      match({ sets: [3, 1], points: [44, 36] }),
      match({ sets: [1, 3], points: [34, 41] }),
      match({ sets: [1, 1], points: [20, 18], complete: false }),
    ], STYLES);
    expect(h.totals.results).toEqual({ won: 1, lost: 1 });
    expect(h.totals.sets).toEqual({ won: 5, lost: 5 });
    expect(h.totals.points).toEqual({ won: 98, lost: 95 });
    expect(h.rows.map(r => r.result)).toEqual(['won', 'lost', null]);
  });

  it('sorts matches oldest first whatever order they come in', () => {
    const a = match({ sets: [3, 0], points: [33, 10] });
    const b = match({ sets: [0, 3], points: [10, 33] });
    expect(buildHistory([b, a], STYLES).rows.map(r => r.id)).toEqual([a.id, b.id]);
  });
});

describe('trends', () => {
  it('counts points together rather than averaging each match', () => {
    const h = buildHistory([
      match({ sets: [3, 0], points: [10, 0] }),
      match({ sets: [0, 3], points: [10, 90] }),
    ], STYLES);
    const points = h.trends.find(x => x.key === 'points')!;
    // 20 of 110, not the average of 100% and 10%
    expect(points.recent).toEqual({ n: 20, d: 110 });
    expect(formatRatio(points.recent!, 'percent')).toBe('18%');
  });

  it('compares the last 5 with the 5 before once 10 matches count', () => {
    const h = buildHistory(Array.from({ length: 11 }, () => match({ sets: [3, 2], points: [50, 50] })), STYLES);
    const sets = h.trends.find(x => x.key === 'sets')!;
    expect(sets.recentIdx).toEqual([6, 7, 8, 9, 10]);
    expect(sets.earlierIdx).toEqual([1, 2, 3, 4, 5]);
  });

  it('splits fewer counted matches in half and leaves the oldest odd one out', () => {
    const h = buildHistory(Array.from({ length: 7 }, () => match({ sets: [3, 2], points: [50, 50] })), STYLES);
    const sets = h.trends.find(x => x.key === 'sets')!;
    expect(sets.recentIdx).toEqual([4, 5, 6]);
    expect(sets.earlierIdx).toEqual([1, 2, 3]);
  });

  it("doesn't compare below 6 counted matches", () => {
    const h = buildHistory(Array.from({ length: 5 }, () => match({ sets: [3, 2], points: [50, 50] })), STYLES);
    const sets = h.trends.find(x => x.key === 'sets')!;
    expect(sets.earlier).toBeNull();
    expect(sets.recent).toEqual({ n: 15, d: 25 });
  });

  it('leaves a gap for matches without unforced errors confirmed', () => {
    const h = buildHistory([
      match({ sets: [3, 0], points: [33, 20] }),
      match({ sets: [3, 0], points: [33, 20], unforced: 4 }),
    ], STYLES);
    const unforced = h.trends.find(x => x.key === 'unforced')!;
    expect(unforced.values[0]).toBeNull();
    expect(unforced.values[1]).toEqual({ n: 4, d: 53 });
    expect(unforced.counted).toBe(1);
    expect(h.unforcedMatches).toBe(1);
  });

  it('leaves out matches with no close finish rather than counting them as 0%', () => {
    const h = buildHistory([match({ sets: [3, 0], points: [33, 10] })], STYLES);
    expect(h.trends.find(x => x.key === 'close')!.values).toEqual([null]);
  });

  it('counts attacked first only when confirmed, and leaves unclear points out', () => {
    const h = buildHistory([match({ sets: [3, 2], points: [50, 50], attackFirst: [30, 20] })], STYLES);
    expect(h.trends.find(x => x.key === 'attackFirst')!.values).toEqual([{ n: 30, d: 50 }]);
  });
});

describe('shots', () => {
  it('adds each shot up and keeps its net in each match', () => {
    const h = buildHistory([
      match({ sets: [3, 0], points: [33, 20], shots: [{ key: 'BH loop', won: 2, lost: 5 }] }),
      match({ sets: [3, 0], points: [33, 20], shots: [{ key: 'FH loop', won: 6, lost: 1 }] }),
      match({ sets: [3, 0], points: [33, 20], shots: [{ key: 'BH loop', won: 4, lost: 3 }] }),
    ], STYLES);
    const bh = h.shots.player.find(s => s.key === 'BH loop')!;
    expect(bh).toMatchObject({ won: 6, lost: 8, used: 2, losingIn: 1, nets: [-3, null, 1] });
    // Worst net first
    expect(h.shots.player[0].key).toBe('BH loop');
  });

  it('only counts unforced errors from matches where they are confirmed', () => {
    const h = buildHistory([
      match({ sets: [3, 0], points: [33, 20], shots: [{ key: 'BH loop', won: 2, lost: 5, unforced: 3 }] }),
      match({ sets: [3, 0], points: [33, 20], unforced: 2, shots: [{ key: 'BH loop', won: 2, lost: 5, unforced: 2 }] }),
    ], STYLES);
    expect(h.shots.player[0].unforced).toBe(2);
  });
});

describe('opponents', () => {
  it('groups by the opponent rubbers, putting a match in each non-inverted one', () => {
    const h = buildHistory([
      match({ sets: [1, 3], points: [30, 40], kit: { forehand_rubber: 'inverted', backhand_rubber: 'long_pips' } }),
      match({ sets: [3, 1], points: [40, 30], kit: { forehand_rubber: 'inverted', backhand_rubber: 'inverted' } }),
      match({ sets: [2, 3], points: [45, 46], kit: { forehand_rubber: 'anti', backhand_rubber: 'long_pips' } }),
      match({ sets: [3, 0], points: [33, 20] }),
    ], STYLES);
    const by = Object.fromEntries(h.opponents.rubber.map(g => [g.key, g.matchIds.length]));
    expect(by).toEqual({ long_pips: 2, inverted: 1, anti: 1, unset: 1 });
    // Matches left without a rubber come last
    expect(h.opponents.rubber.at(-1)!.label).toBe('Not set');
  });

  it('names styles and greys out groups under 3 matches', () => {
    const h = buildHistory([
      match({ sets: [1, 3], points: [30, 40], kit: { style_id: 'defender' } }),
      match({ sets: [1, 3], points: [30, 40], kit: { style_id: 'defender' } }),
      match({ sets: [1, 3], points: [30, 40], kit: { style_id: 'defender' } }),
      match({ sets: [3, 1], points: [40, 30], kit: { style_id: 'looper' } }),
      match({ sets: [3, 1], points: [40, 30], kit: { style_id: 'deleted-style' } }),
    ], STYLES);
    const groups = h.opponents.style.map(g => [g.label, g.matchIds.length, g.few]);
    expect(groups).toEqual([['Classical defender', 3, false], ['Inverted looper', 1, true], ['No style set', 1, true]]);
  });
});

describe('what stands out', () => {
  it('points out winning points but losing sets', () => {
    const h = buildHistory([
      match({ sets: [2, 3], points: [50, 45], close: [2, 8] }),
      match({ sets: [2, 3], points: [50, 45], close: [2, 8] }),
      match({ sets: [1, 3], points: [44, 40], close: [1, 6] }),
    ], STYLES);
    expect(h.standouts[0]).toMatchObject({ kind: 'sets', title: 'Winning points but not sets' });
    expect(h.standouts[0].text).toContain('only 36% of sets');
    expect(h.standouts[0].text).toContain('19% of the time');
  });

  it('names a trend that moved, with lower unforced errors as fewer', () => {
    const early = Array.from({ length: 4 }, () => match({ sets: [3, 2], points: [50, 50], unforced: 15 }));
    const late = Array.from({ length: 4 }, () => match({ sets: [3, 2], points: [50, 50], unforced: 5 }));
    const h = buildHistory([...early, ...late], STYLES);
    const s = h.standouts.find(x => x.kind === 'trend')!;
    expect(s.title).toBe('Fewer unforced errors');
    expect(s.text).toBe('0.5 per 10 points in the last 4 matches, 1.5 in the 4 before.');
  });

  it('names a shot that loses in most matches it was used in', () => {
    const ms = [-3, -2, -4, 1, -1].map(net => match({ sets: [3, 2], points: [50, 50], shots: [{ key: 'Backhand loop', won: 5, lost: 5 - net }] }));
    const s = buildHistory(ms, STYLES).standouts.find(x => x.kind === 'shot')!;
    expect(s.title).toBe('Backhand loop keeps losing');
    expect(s.text).toContain('in 4 of the 5 matches');
  });

  it('names the hardest match-up, but never from a group under 3 matches', () => {
    const pips = { forehand_rubber: 'inverted', backhand_rubber: 'long_pips' } as const;
    const inv = { forehand_rubber: 'inverted', backhand_rubber: 'inverted' } as const;
    const h = buildHistory([
      match({ sets: [1, 3], points: [38, 42], kit: pips }),
      match({ sets: [0, 3], points: [25, 33], kit: pips }),
      match({ sets: [2, 3], points: [45, 46], kit: pips }),
      ...Array.from({ length: 4 }, () => match({ sets: [3, 1], points: [44, 36], kit: inv })),
      match({ sets: [0, 3], points: [10, 33], kit: { hand: 'left' } }),
    ], STYLES);
    const s = h.standouts.find(x => x.kind === 'opponent')!;
    expect(s.title).toBe('Long pips: the hardest match-up');
    expect(s.text).toContain('Lost all 3 finished matches.');
    expect(s.text).toContain('Won 3 of 12 sets');
  });

  it('shows at most three', () => {
    const ms = Array.from({ length: 8 }, (_, i) => match({
      sets: i < 4 ? [3, 0] : [0, 3], points: i < 4 ? [33, 10] : [10, 33], unforced: i < 4 ? 1 : 10,
      shots: [{ key: 'Backhand loop', won: 1, lost: 5 }],
    }));
    expect(buildHistory(ms, STYLES).standouts.length).toBeLessThanOrEqual(3);
  });
});

describe('filters', () => {
  const list = [
    { date: '2025-10-01', isComplete: true, event: 'League' },
    { date: '2026-06-01', isComplete: false, event: null },
    { date: '2026-11-01', isComplete: true, event: 'County closed' },
  ];
  const today = new Date(2026, 10, 26);

  it('keeps finished matches by default', () => {
    expect(filterMatches(list, DEFAULT_FILTERS, today).map(m => m.date)).toEqual(['2025-10-01', '2026-11-01']);
  });

  it('keeps the last so many months', () => {
    expect(filterMatches(list, { months: 6, finishedOnly: false, event: null }, today).map(m => m.date)).toEqual(['2026-06-01', '2026-11-01']);
  });

  it('keeps one event', () => {
    expect(filterMatches(list, { months: null, finishedOnly: false, event: 'League' }, today).map(m => m.date)).toEqual(['2025-10-01']);
  });
});
