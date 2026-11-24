import { describe, expect, it } from 'vitest';
import { AnalysisPoint, AnalysisShot, buildAnalysis, shotLabel, shotWithHand } from './analysis';
import { Side } from './scoring';

const SHOTS: AnalysisShot[] = [
  { id: 'serve', name: 'serve', display_name: 'Serve', category: 'serve', category_order: 1 },
  { id: 'fault', name: 'service_fault', display_name: 'Service fault', category: 'serve', category_order: 1 },
  { id: 'none', name: 'no_shot', display_name: 'No shot', category: 'serve', category_order: 1 },
  { id: 'push', name: 'push', display_name: 'Push', category: 'short_game', category_order: 2 },
  { id: 'pips-push', name: 'push', display_name: 'Push', category: 'pips / anti', category_order: 3 },
  { id: 'loop', name: 'loop', display_name: 'Loop', category: 'attacks', category_order: 4 },
  { id: 'chop', name: 'chop', display_name: 'Chop', category: 'defence / blocks', category_order: 5 },
];

type Spec = {
  set?: number;
  winner: Side;
  win?: string;
  winHand?: 'fh' | 'bh';
  lose?: string;
  loseHand?: 'fh' | 'bh';
  lucky?: boolean;
  unforced?: boolean;
};

let nextId = 0;
const pt = (s: Spec): AnalysisPoint => ({
  id: `p${nextId++}`,
  set_id: `set-${s.set ?? 1}`,
  winner: s.winner,
  winning_shot_id: s.win ?? 'loop',
  winning_hand: s.winHand ?? 'fh',
  other_shot_id: s.lose ?? 'chop',
  other_hand: s.loseHand ?? 'bh',
  is_lucky_shot: s.lucky ?? false,
  is_unforced_error: s.unforced ?? false,
});

// n points in a row to one side, all in the same set
const many = (n: number, winner: Side, set = 1, extra: Partial<Spec> = {}) =>
  Array.from({ length: n }, () => pt({ winner, set, ...extra }));

const SETS = [1, 2, 3, 4, 5].map(n => ({ id: `set-${n}`, set_number: n, player_score: 0, opponent_score: 0 }));

const analyse = (points: AnalysisPoint[], initialServer: Side = 'player') =>
  buildAnalysis({ initialServer, sets: SETS, points, shots: SHOTS });

describe('shot labels', () => {
  it('prefixes pips shots so they differ from inverted ones', () => {
    expect(shotLabel(SHOTS[3])).toBe('Push');
    expect(shotLabel(SHOTS[4])).toBe('Pips push');
  });

  it('names the hand in full', () => {
    expect(shotWithHand('Chop', 'bh')).toBe('Backhand chop');
    expect(shotWithHand('Pips push', 'fh')).toBe('Forehand pips push');
    expect(shotWithHand('Service fault', null)).toBe('Service fault');
  });
});

describe('winning and losing shots', () => {
  it('gives the winning shot to the winner and the losing shot to the loser', () => {
    const a = analyse([pt({ winner: 'player', win: 'loop', winHand: 'fh', lose: 'chop', loseHand: 'bh' })]);
    expect(a.shots.player).toMatchObject([{ shot: 'Loop', hand: 'fh', won: 1, lost: 0 }]);
    expect(a.shots.opponent).toMatchObject([{ shot: 'Chop', hand: 'bh', won: 0, lost: 1 }]);
  });

  it('charges a service fault to the server as an unforced losing shot', () => {
    // Recorded with the fault as the receiver's "winning shot" and no shot for the server
    const a = analyse([pt({ winner: 'opponent', win: 'fault', lose: 'none' })]);
    expect(a.shots.player).toMatchObject([{ shot: 'Service fault', hand: null, won: 0, lost: 1, unforced: 1 }]);
    expect(a.shots.opponent).toEqual([]);
    expect(a.unforced.total).toBe(1);
    expect(a.rows[0]).toMatchObject({ winningShot: null, losingShot: 'Service fault', isServiceFault: true, isUnforced: true });
  });

  it('ignores "no shot" as a losing shot', () => {
    const a = analyse([pt({ winner: 'player', win: 'serve', lose: 'none' })]);
    expect(a.shots.opponent).toEqual([]);
    expect(a.categories.opponent).toEqual([]);
  });

  it('keeps pips and inverted pushes apart', () => {
    const a = analyse([
      pt({ winner: 'player', win: 'push', winHand: 'bh' }),
      pt({ winner: 'player', win: 'pips-push', winHand: 'bh' }),
    ]);
    expect(a.shots.player.map(s => s.shot).sort()).toEqual(['Pips push', 'Push']);
  });

  it('puts the most costly of your shots first and their best shot first', () => {
    const a = analyse([
      pt({ winner: 'opponent', lose: 'chop', loseHand: 'bh' }),
      pt({ winner: 'opponent', lose: 'chop', loseHand: 'bh' }),
      pt({ winner: 'player', win: 'loop', winHand: 'fh' }),
    ]);
    expect(a.shots.player[0]).toMatchObject({ shot: 'Chop', lost: 2 });
    expect(a.shots.opponent[0]).toMatchObject({ shot: 'Loop', won: 2 });
  });

  it('groups by category for each side', () => {
    const a = analyse([
      pt({ winner: 'player', win: 'loop', lose: 'chop' }),
      pt({ winner: 'opponent', win: 'loop', lose: 'chop' }),
    ]);
    expect(a.categories.player).toMatchObject([
      { category: 'attacks', won: 1, lost: 0 },
      { category: 'defence / blocks', won: 0, lost: 1 },
    ]);
  });

  it('leaves serves out of the hand split', () => {
    const a = analyse([
      pt({ winner: 'player', win: 'serve', winHand: 'fh', lose: 'push', loseHand: 'bh' }),
      pt({ winner: 'player', win: 'loop', winHand: 'bh', lose: 'chop', loseHand: 'fh' }),
    ]);
    expect(a.hands.player).toEqual({ fh: { won: 0, lost: 0 }, bh: { won: 1, lost: 0 } });
    expect(a.hands.opponent).toEqual({ fh: { won: 0, lost: 1 }, bh: { won: 0, lost: 1 } });
  });
});

describe('serve and receive', () => {
  it('works out the server from the scoring rules', () => {
    // Player serves points 1-2, opponent 3-4
    const a = analyse([
      pt({ winner: 'player' }), pt({ winner: 'opponent' }),
      pt({ winner: 'player' }), pt({ winner: 'player' }),
    ]);
    expect(a.onServe).toEqual({ won: 1, lost: 1 });
    expect(a.onReceive).toEqual({ won: 2, lost: 0 });
    expect(a.rows.map(r => r.server)).toEqual(['player', 'player', 'opponent', 'opponent']);
  });

  it('starts set 2 with the other server', () => {
    const a = analyse([...many(11, 'player', 1), pt({ set: 2, winner: 'player' })], 'opponent');
    expect(a.rows[11].server).toBe('player');
    expect(a.sets[1].playerServe).toEqual({ won: 1, lost: 0 });
  });
});

describe('sets, gaps and runs', () => {
  it('tracks the score gap and the score after each point', () => {
    const a = analyse([pt({ winner: 'player' }), pt({ winner: 'opponent' }), pt({ winner: 'opponent' })]);
    expect(a.sets[0].gaps).toEqual([0, 1, 0, -1]);
    expect(a.rows.map(r => `${r.playerScore}-${r.opponentScore}`)).toEqual(['1-0', '1-1', '1-2']);
  });

  it('counts a set ended early for whoever was ahead', () => {
    const a = analyse([...many(11, 'player', 1), ...many(8, 'player', 2), ...many(5, 'opponent', 2)]);
    expect(a.setsWon).toEqual({ won: 2, lost: 0 });
  });

  it('restarts runs at each set', () => {
    const a = analyse([...many(11, 'opponent', 1), ...many(3, 'opponent', 2)]);
    expect(a.runs.map(r => [r.side, r.length, r.setNumber])).toEqual([['opponent', 11, 1], ['opponent', 3, 2]]);
  });

  it('records where a run started', () => {
    const a = analyse([pt({ winner: 'player' }), ...many(4, 'opponent')]);
    expect(a.runs[0]).toMatchObject({ side: 'opponent', length: 4, fromPlayer: 1, fromOpponent: 0 });
  });

  it('leaves out runs shorter than 3', () => {
    const a = analyse([pt({ winner: 'player' }), pt({ winner: 'opponent' }), pt({ winner: 'player' })]);
    expect(a.runs).toEqual([]);
  });
});

describe('stages and close finishes', () => {
  it('splits points by how many had been played in the set', () => {
    const a = analyse([...many(6, 'player'), ...many(9, 'opponent'), pt({ winner: 'player' })]);
    expect(a.stages.map(s => [s.label, s.won, s.lost])).toEqual([
      ['Points 1–6', 6, 0], ['Points 7–15', 0, 9], ['Points 16+', 1, 0],
    ]);
  });

  it('counts points from 9-all or once either side has 10', () => {
    // 9-9, then 10-9, then 10-10, then 11-10... and 10-0 counts too
    const a = analyse([...many(9, 'player'), ...many(9, 'opponent'), pt({ winner: 'player' }), pt({ winner: 'opponent' })]);
    expect(a.fromNineAll).toEqual({ won: 1, lost: 1 });
    const b = analyse([...many(10, 'player'), pt({ winner: 'player' })]);
    expect(b.fromNineAll).toEqual({ won: 1, lost: 0 });
  });
});

describe('unforced errors and lucky points', () => {
  it('counts only the player\'s unforced losing shots in the total', () => {
    const a = analyse([
      pt({ winner: 'opponent', lose: 'chop', loseHand: 'bh', unforced: true }),
      pt({ winner: 'opponent', lose: 'chop', loseHand: 'bh' }),
      pt({ winner: 'player', lose: 'chop', unforced: true }),
    ]);
    expect(a.unforced).toMatchObject({ recorded: true, total: 1 });
    expect(a.shots.player.find(s => s.shot === 'Chop')).toMatchObject({ lost: 2, unforced: 1 });
    expect(a.shots.opponent.find(s => s.shot === 'Chop')).toMatchObject({ lost: 1, unforced: 1 });
  });

  it('is not recorded until one of the player\'s losses is ticked', () => {
    const a = analyse([pt({ winner: 'opponent', win: 'fault', lose: 'none' })]);
    expect(a.unforced).toMatchObject({ recorded: false, total: 1 });
  });

  it('splits unforced errors by serve and stage', () => {
    // Player serves points 1-2
    const a = analyse([pt({ winner: 'opponent', unforced: true }), pt({ winner: 'opponent' })]);
    expect(a.unforced).toMatchObject({ onServe: 1, onReceive: 0 });
    expect(a.stages[0].unforced).toBe(1);
  });

  it('counts lucky points for whoever won them', () => {
    const a = analyse([pt({ winner: 'player', lucky: true }), pt({ winner: 'opponent', lucky: true }), pt({ winner: 'opponent' })]);
    expect(a.lucky).toEqual({ player: 1, opponent: 1 });
  });
});

describe('patterns', () => {
  it('pairs each side\'s winning shot with the losing shot it came off, twice or more', () => {
    const a = analyse([
      ...many(3, 'player', 1, { win: 'loop', winHand: 'fh', lose: 'push', loseHand: 'bh' }),
      pt({ winner: 'player', win: 'loop', winHand: 'fh', lose: 'chop', loseHand: 'bh' }),
      ...many(2, 'opponent', 1, { win: 'loop', winHand: 'bh', lose: 'chop', loseHand: 'bh' }),
    ]);
    expect(a.patterns.player).toEqual([
      { key: expect.any(String), winningShot: 'Loop', winningHand: 'fh', losingShot: 'Push', losingHand: 'bh', count: 3 },
    ]);
    expect(a.patterns.opponent).toMatchObject([{ winningShot: 'Loop', winningHand: 'bh', losingShot: 'Chop', losingHand: 'bh', count: 2 }]);
  });

  it('tells the hands apart', () => {
    const a = analyse([
      pt({ winner: 'player', win: 'loop', winHand: 'fh', lose: 'push', loseHand: 'bh' }),
      pt({ winner: 'player', win: 'loop', winHand: 'fh', lose: 'push', loseHand: 'fh' }),
    ]);
    expect(a.patterns.player).toEqual([]);
  });

  it('leaves out service faults and serves that got no return', () => {
    const a = analyse([
      ...many(2, 'opponent', 1, { win: 'fault', lose: 'none' }),
      ...many(2, 'player', 1, { win: 'serve', lose: 'none' }),
    ]);
    expect(a.patterns).toEqual({ player: [], opponent: [] });
  });
});

describe('cards', () => {
  const titles = (points: AnalysisPoint[]) => analyse(points).cards.map(c => c.title);

  it('notes a set lost from 2 or more up, with the closing run', () => {
    // 7-3 up, then 0-8 to lose 7-11
    const a = analyse([...many(7, 'player'), ...many(3, 'opponent'), ...many(8, 'opponent')]);
    expect(a.cards[0]).toEqual({ tag: 'Match story', title: 'Set 1 got away', text: 'Up 7-0, then lost 11 in a row.' });
  });

  it('notes a comeback', () => {
    const a = analyse([...many(4, 'opponent'), ...many(11, 'player')]);
    expect(a.cards[0]).toMatchObject({ title: 'Came back in set 1', text: 'Down 0-4, won 11-4.' });
  });

  it('notes fading late in sets', () => {
    // Early: 8 of 9 won. Late (16th point on): 1 of 9 won, over two sets
    const set = (n: number) => [
      ...many(5, 'player', n), pt({ set: n, winner: 'opponent' }),
      ...many(5, 'player', n), ...many(4, 'opponent', n),
      ...many(5, 'opponent', n),
    ];
    expect(titles([...set(1), ...set(2)])).toContain('Faded late in sets');
  });

  it('names the most costly shot to work on', () => {
    const a = analyse([...many(5, 'opponent', 1, { lose: 'chop', loseHand: 'bh' }), pt({ winner: 'player', win: 'chop', winHand: 'bh' })]);
    expect(a.cards).toContainEqual({ tag: 'Work on', title: 'Backhand chop', text: 'Your losing shot in 5 points. Your winning shot in 1.' });
  });

  it('prefers the shot with most unforced errors once they are recorded', () => {
    const a = analyse([
      ...many(3, 'opponent', 1, { lose: 'loop', loseHand: 'fh', unforced: true }),
      ...many(6, 'opponent', 1, { lose: 'chop', loseHand: 'bh' }),
    ]);
    expect(a.cards.filter(c => c.tag === 'Work on')[0]).toEqual({ tag: 'Work on', title: 'Forehand loop', text: '3 of your 3 losing forehand loops were unforced.' });
  });

  it('names their weapon and their weakness', () => {
    const a = analyse([
      ...many(5, 'opponent', 1, { win: 'loop', winHand: 'fh' }),
      ...many(4, 'player', 1, { win: 'push', lose: 'loop', loseHand: 'bh' }),
    ]);
    const scouting = a.cards.filter(c => c.tag === 'Scouting');
    expect(scouting).toEqual([
      { tag: 'Scouting', title: 'Their forehand loop', text: 'Won them 5 of their 5 points.' },
      { tag: 'Scouting', title: 'Their backhand loop', text: 'Their losing shot 4 times. Their winning shot never.' },
    ]);
  });

  it('notes attacking winners dropping off in a later set', () => {
    // Set 1: 8 winning loops, 11-6. Set 2: 2 winning loops and 4 losing ones, 6-11.
    const a = analyse([
      ...many(8, 'player', 1, { win: 'loop' }), ...many(3, 'player', 1, { win: 'push' }), ...many(6, 'opponent', 1, { win: 'push', lose: 'push' }),
      ...many(2, 'player', 2, { win: 'loop' }), ...many(4, 'player', 2, { win: 'push' }),
      ...many(4, 'opponent', 2, { win: 'push', lose: 'loop' }), ...many(7, 'opponent', 2, { win: 'push', lose: 'push' }),
    ]);
    expect(a.attacksBySet).toEqual([
      { setNumber: 1, points: 17, player: { won: 8, lost: 0 }, opponent: { won: 0, lost: 0 } },
      { setNumber: 2, points: 17, player: { won: 2, lost: 4 }, opponent: { won: 0, lost: 0 } },
    ]);
    expect(a.cards).toContainEqual({
      tag: 'Match story',
      title: 'Your attacking dropped off in set 2',
      text: 'An attack was your winning shot in 8 points in set 1, and 2 in set 2. Your losing shot in 0, then 4.',
    });
  });

  it('notes the opponent\'s attacking dropping off', () => {
    const a = analyse([
      ...many(6, 'opponent', 1, { win: 'loop' }), ...many(5, 'opponent', 1, { win: 'push', lose: 'push' }), ...many(2, 'player', 1, { win: 'push', lose: 'push' }),
      ...many(11, 'player', 2, { win: 'push', lose: 'push' }),
    ]);
    expect(a.cards.map(c => c.title)).toContain('Their attacking dropped off in set 2');
  });

  it('ignores a drop into a set cut short with End Set', () => {
    const a = analyse([
      ...many(8, 'player', 1, { win: 'loop' }), ...many(3, 'player', 1, { win: 'push' }),
      ...many(3, 'player', 2, { win: 'push' }),
    ]);
    expect(a.cards.map(c => c.title).filter(t => t.includes('attacking dropped off'))).toEqual([]);
  });

  it('has no cards for a match with no points', () => {
    expect(analyse([]).cards).toEqual([]);
  });
});
