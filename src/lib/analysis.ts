/**
 * Match analysis built from the raw points, kept free of React and Supabase so
 * it can be tested.
 *
 * Each point records two shots: the winner's winning shot, and the loser's
 * losing shot (either the shot that set up the winner, or the one that missed).
 * Every figure here is about how points ended, not every shot in a rally.
 */

import { Side, getServer, otherSide } from './scoring.ts';

export type Hand = 'fh' | 'bh';

/** What a shot does in a rally, for shot balance. Set per shot on /admin/shots. */
export type Role = 'attack' | 'control' | 'defence';
export const ROLES: Role[] = ['attack', 'control', 'defence'];
export const ROLE_LABEL: { [role in Role]: string } = { attack: 'Attack', control: 'Control', defence: 'Defence' };

export type AnalysisShot = {
  id: string;
  name: string;
  display_name: string;
  category: string;
  category_order: number;
  // Shot guide for the AI summary; see shotGuide.ts
  check_qualities?: string[];
  technical_notes?: string | null;
  // Shots with no role (serve, no shot, service fault) are left out of shot balance
  role?: Role | null;
};

export type AnalysisPoint = {
  id: string;
  set_id: string;
  winner: Side;
  winning_shot_id: string;
  winning_hand?: Hand | null;
  other_shot_id: string;
  other_hand?: Hand | null;
  is_lucky_shot?: boolean | null;
  is_unforced_error?: boolean | null;
  // Ticked in a sweep; see sweeps.ts
  is_attacked_first?: boolean | null;
  is_third_ball_attack?: boolean | null;
};

export type AnalysisSet = {
  id: string;
  set_number: number;
  player_score: number;
  opponent_score: number;
};

export type AnalysisInput = {
  initialServer: Side;
  sets: AnalysisSet[];
  // In the order they were recorded
  points: AnalysisPoint[];
  shots: AnalysisShot[];
  // Sweep tags the owner has confirmed are complete for the match; see sweeps.ts
  confirmed?: string[];
};

export const SERVICE_FAULT = 'service_fault';

/** What counts as an unforced error, shown wherever one can be ticked or read. */
export const UNFORCED_ERROR_DEFINITION =
  "An unforced error is a shot you would typically expect to make. You weren't out of position, you read the spin, you went for the right type of shot, and it still missed.";
export const NO_SHOT = 'no_shot';
const SERVE_CATEGORY = 'serve';
const PIPS_CATEGORY = 'pips / anti';

/** Points won and lost. */
export type Tally = { won: number; lost: number };

export type ShotRow = {
  key: string;
  shot: string;
  hand: Hand | null;
  category: string;
  // Points where this was the side's winning shot
  won: number;
  // Points where this was the side's losing shot
  lost: number;
  // Of those losing shots, how many were unforced
  unforced: number;
};


export type PointRow = {
  id: string;
  setNumber: number;
  number: number;
  server: Side;
  winner: Side;
  // Score after the point, player first
  playerScore: number;
  opponentScore: number;
  winningShot: string | null;
  losingShot: string | null;
  isServiceFault: boolean;
  isLucky: boolean;
  isUnforced: boolean;
  isAttackedFirst: boolean;
  isThirdBall: boolean;
  // 'serve' when the serve won the point (the receive missed or wasn't returned),
  // 'receive' when the receive won it outright; null otherwise, including service faults
  decidedBy: 'serve' | 'receive' | null;
};

/** A side's biggest lead in a set, and the score when they had it, player first. */
export type Lead = { lead: number; at: string };

export type SetSummary = {
  setNumber: number;
  playerScore: number;
  opponentScore: number;
  // Score gap after each point, player minus opponent, starting at 0
  gaps: number[];
  playerServe: Tally;
  opponentServe: Tally;
  // Score after the first six points, player first ("2-4"), or the final score in a shorter set
  afterSix: string;
  // Biggest lead each side had at any point, the latest if it happened more than once
  biggestLead: { player: Lead | null; opponent: Lead | null };
  // Points in a row that ended the set, and who won them
  closingRun: { side: Side; length: number };
};

export type Run = { side: Side; length: number; setNumber: number; fromPlayer: number; fromOpponent: number };

export type Stage = { label: string; won: number; lost: number; unforced: number };

/** A winning shot and the losing shot it was played against, seen three times or more, excluding unforced errors. */
export type Pattern = {
  key: string;
  winningShot: string;
  winningHand: Hand | null;
  losingShot: string;
  losingHand: Hand | null;
  count: number;
};

/** Attacks as each side's winning and losing shot in one set. */
export type SetAttacks = { setNumber: number; points: number; player: Tally; opponent: Tally };

/** One side's winning and losing shots with a role, by role. */
export type BalanceSide = { total: number; roles: ({ role: Role } & Tally)[] };

/** How often a shot and hand was each side's winning or losing shot. */
export type BalanceShot = { key: string; shot: string; role: Role; player: number; opponent: number };

export type Balance = {
  player: BalanceSide;
  opponent: BalanceSide;
  // By role, then most used first
  shots: BalanceShot[];
  // Up to three plain counts worth pointing out
  standouts: string[];
};

/** A shot and how often it ended a point in one way. The shot includes the hand, as in "Backhand loop". */
export type ShotCount = { shot: string; count: number; unforced: number };

/**
 * What happened on one side's serve. The first two shots are the only part of a
 * rally the data pins down: when the serve is the winning shot, the receiver's
 * losing shot was the receive, and when the serve is the server's losing shot,
 * the receive won the point.
 */
export type ServeStats = {
  // Points on this side's serve, from the server's point of view
  points: Tally;
  // The serve was the winning shot: a missed receive or no return
  serveWon: number;
  // Of those, how many the receiver didn't touch (recorded as "no shot")
  notReturned: number;
  // The receiver's missed receives, by shot, most first
  receiveMissed: ShotCount[];
  // The receive won the point outright, by shot
  receiveWon: ShotCount[];
  faults: number;
  // Points that went past the receive, from the server's point of view
  rally: Tally;
};

/**
 * Who played the first attacking shot, from the attacked-first tag. Only the
 * player's attack first is ticked. On an unticked point, an attacking shot in
 * the last two means the opponent attacked first; with none, either nobody
 * attacked or the opponent attacked earlier in the rally. Tallies are the
 * player's points won and lost.
 */
export type AttackFirst = {
  // False until the owner confirms every point was checked
  confirmed: boolean;
  player: Tally;
  opponent: Tally;
  unclear: Tally;
};

/** The player's serves that went past the receive, split by whether they attacked the third ball. */
export type ThirdBall = { confirmed: boolean; attacked: Tally; other: Tally };

export type Card = { tag: 'Match story' | 'Work on' | 'Scouting'; title: string; text: string };

export type Analysis = {
  setsWon: Tally;
  points: Tally;
  sets: SetSummary[];
  // Points the player won and lost while serving, and while receiving
  onServe: Tally;
  onReceive: Tally;
  // Points played with both players on 8 or more: the close finish of a set
  fromEightAll: Tally & { unforced: number };
  stages: Stage[];
  // Runs of 3 or more, longest first
  runs: Run[];
  // Keyed by the server
  serveReceive: { player: ServeStats; opponent: ServeStats };
  lucky: { player: number; opponent: number };
  balance: Balance;
  shots: { player: ShotRow[]; opponent: ShotRow[] };
  // Winning and losing shots by hand, serves left out
  hands: { player: { fh: Tally; bh: Tally }; opponent: { fh: Tally; bh: Tally } };
  attacksBySet: SetAttacks[];
  // Null when the tag hasn't been used for this match
  attackFirst: AttackFirst | null;
  thirdBall: ThirdBall | null;
  unforced: {
    // False until at least one of the player's unforced errors has been ticked, or the owner confirms there are none
    recorded: boolean;
    // The owner confirmed every point was checked
    confirmed: boolean;
    total: number;
    onServe: number;
    onReceive: number;
    // Unforced errors from 8-all were at least 3, and at least twice as frequent per point as in the rest of the match
    bunchedLate: boolean;
  };
  rows: PointRow[];
  // Repeated winning/losing shot pairs, by who won the point
  patterns: { player: Pattern[]; opponent: Pattern[] };
  cards: Card[];
};

const HAND_WORD: { [hand in Hand]: string } = { fh: 'Forehand', bh: 'Backhand' };

/** Shot label shown to people. Pips shots are prefixed so they don't clash with the inverted versions. */
export const shotLabel = (shot: AnalysisShot): string => {
  if (shot.name === SERVICE_FAULT) return 'Service fault';
  return shot.category === PIPS_CATEGORY ? `Pips ${shot.display_name.toLowerCase()}` : shot.display_name;
};

/** "Backhand chop", or the shot alone when there's no hand. */
export const shotWithHand = (shot: string, hand: Hand | null): string =>
  hand ? `${HAND_WORD[hand]} ${shot.toLowerCase()}` : shot;

const stageLabel = (pointsPlayed: number) =>
  pointsPlayed < 6 ? 'Points 1–6' : pointsPlayed < 15 ? 'Points 7–15' : 'Points 16+';
const STAGES = ['Points 1–6', 'Points 7–15', 'Points 16+'];

const emptyRecord = (): Tally => ({ won: 0, lost: 0 });

/** Both players on 8 or more before the point: the close finish of a set. */
export const isFromEightAll = (playerScore: number, opponentScore: number) => playerScore >= 8 && opponentScore >= 8;

const emptyServe = () => ({
  points: emptyRecord(), serveWon: 0, notReturned: 0,
  receiveMissed: new Map<string, ShotCount>(), receiveWon: new Map<string, ShotCount>(),
  faults: 0, rally: emptyRecord(),
});
const countShot = (counts: Map<string, ShotCount>, shot: string, unforced: boolean) => {
  const c = counts.get(shot) ?? { shot, count: 0, unforced: 0 };
  c.count += 1;
  if (unforced) c.unforced += 1;
  counts.set(shot, c);
};
const byCount = (counts: Map<string, ShotCount>) =>
  [...counts.values()].sort((a, b) => b.count - a.count || a.shot.localeCompare(b.shot));
const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const buildAnalysis = ({ initialServer, sets, points, shots, confirmed = [] }: AnalysisInput): Analysis => {
  const shotById = new Map(shots.map(s => [s.id, s]));
  const setById = new Map(sets.map(s => [s.id, s]));

  const scores = new Map<number, [number, number]>();
  const gaps = new Map<number, number[]>();
  const serveBySet = new Map<number, { player: Tally; opponent: Tally }>();
  const setCounts = new Map<number, number>();

  const shotRows = { player: new Map<string, ShotRow>(), opponent: new Map<string, ShotRow>() };
  const hands = {
    player: { fh: emptyRecord(), bh: emptyRecord() },
    opponent: { fh: emptyRecord(), bh: emptyRecord() },
  };
  const stages = new Map(STAGES.map(label => [label, { label, won: 0, lost: 0, unforced: 0 }]));
  const onServe = emptyRecord();
  const onReceive = emptyRecord();
  const fromEightAll = { ...emptyRecord(), unforced: 0 };
  const lucky = { player: 0, opponent: 0 };
  const unforced = { recorded: false, confirmed: confirmed.includes('unforced'), total: 0, onServe: 0, onReceive: 0, bunchedLate: false };
  const attackFirst: AttackFirst = { confirmed: confirmed.includes('attacked_first'), player: emptyRecord(), opponent: emptyRecord(), unclear: emptyRecord() };
  const thirdBall: ThirdBall = { confirmed: confirmed.includes('third_ball'), attacked: emptyRecord(), other: emptyRecord() };
  let attackFirstTicks = 0;
  let thirdBallTicks = 0;
  const serveReceive = { player: emptyServe(), opponent: emptyServe() };
  const runs: Run[] = [];
  const rows: PointRow[] = [];
  const patterns = { player: new Map<string, Pattern>(), opponent: new Map<string, Pattern>() };
  const attacksBySet = new Map<number, { player: Tally; opponent: Tally }>();
  const roleTallies = {
    player: new Map(ROLES.map(role => [role, emptyRecord()])),
    opponent: new Map(ROLES.map(role => [role, emptyRecord()])),
  };
  const balanceShots = new Map<string, BalanceShot>();
  let current: Run | null = null;

  const tallyShot = (side: Side, shot: AnalysisShot, hand: Hand | null, result: 'won' | 'lost', isUnforced: boolean, setNumber: number) => {
    const label = shotLabel(shot);
    const key = `${shot.id}:${hand ?? ''}`;
    const row = shotRows[side].get(key) ?? { key, shot: label, hand, category: shot.category, won: 0, lost: 0, unforced: 0 };
    row[result] += 1;
    if (result === 'lost' && isUnforced) row.unforced += 1;
    shotRows[side].set(key, row);

    if (hand && shot.category !== SERVE_CATEGORY) hands[side][hand][result] += 1;

    if (shot.role) {
      roleTallies[side].get(shot.role)![result] += 1;
      const shotRow = balanceShots.get(key) ?? { key, shot: shotWithHand(label, hand), role: shot.role, player: 0, opponent: 0 };
      shotRow[side] += 1;
      balanceShots.set(key, shotRow);
    }

    if (shot.role === 'attack') {
      const setAttacks = attacksBySet.get(setNumber) ?? { player: emptyRecord(), opponent: emptyRecord() };
      setAttacks[side][result] += 1;
      attacksBySet.set(setNumber, setAttacks);
    }
  };

  for (const point of points) {
    const set = setById.get(point.set_id);
    const winningShot = shotById.get(point.winning_shot_id);
    const otherShot = shotById.get(point.other_shot_id);
    if (!set || !winningShot || !otherShot) continue;

    const setNumber = set.set_number;
    const [p, o] = scores.get(setNumber) ?? [0, 0];
    const server = getServer(initialServer, setNumber, { playerScore: p, opponentScore: o });
    const winner = point.winner;
    const loser = otherSide(winner);
    const playerWon = winner === 'player';

    // A service fault is recorded as the receiver's winning shot, but it is the
    // server's losing shot, and always unforced
    const isServiceFault = winningShot.name === SERVICE_FAULT;
    const isUnforced = isServiceFault || !!point.is_unforced_error;

    if (isServiceFault) {
      tallyShot(loser, winningShot, null, 'lost', true, setNumber);
    } else {
      tallyShot(winner, winningShot, point.winning_hand ?? null, 'won', false, setNumber);
      if (otherShot.name !== NO_SHOT) {
        tallyShot(loser, otherShot, point.other_hand ?? null, 'lost', isUnforced, setNumber);
      }
      // An unforced error says nothing about how the winning shot beat the losing one
      if (otherShot.name !== NO_SHOT && !isUnforced) {
        const winHand = point.winning_hand ?? null;
        const loseHand = point.other_hand ?? null;
        const key = `${winningShot.id}:${winHand ?? ''}>${otherShot.id}:${loseHand ?? ''}`;
        const pattern = patterns[winner].get(key) ?? {
          key, winningShot: shotLabel(winningShot), winningHand: winHand, losingShot: shotLabel(otherShot), losingHand: loseHand, count: 0,
        };
        pattern.count += 1;
        patterns[winner].set(key, pattern);
      }
    }

    const serveRecord = server === 'player' ? onServe : onReceive;
    serveRecord[playerWon ? 'won' : 'lost'] += 1;
    const setServe = serveBySet.get(setNumber) ?? { player: emptyRecord(), opponent: emptyRecord() };
    setServe[server][playerWon ? 'won' : 'lost'] += 1;
    serveBySet.set(setNumber, setServe);

    const stage = stages.get(stageLabel(p + o))!;
    stage[playerWon ? 'won' : 'lost'] += 1;
    const closeFinish = isFromEightAll(p, o);
    if (closeFinish) fromEightAll[playerWon ? 'won' : 'lost'] += 1;

    if (point.is_lucky_shot) lucky[winner] += 1;
    if (!playerWon && isUnforced) {
      unforced.total += 1;
      if (server === 'player') unforced.onServe += 1; else unforced.onReceive += 1;
      stage.unforced += 1;
      if (closeFinish) fromEightAll.unforced += 1;
    }

    // The first two shots: serve and receive
    let decidedBy: PointRow['decidedBy'] = null;
    const serving = serveReceive[server];
    serving.points[winner === server ? 'won' : 'lost'] += 1;
    if (isServiceFault) {
      serving.faults += 1;
    } else if (winner === server && winningShot.category === SERVE_CATEGORY) {
      serving.serveWon += 1;
      decidedBy = 'serve';
      if (otherShot.name === NO_SHOT) serving.notReturned += 1;
      else countShot(serving.receiveMissed, shotWithHand(shotLabel(otherShot), point.other_hand ?? null), isUnforced);
    } else if (winner !== server && otherShot.category === SERVE_CATEGORY && otherShot.name !== NO_SHOT) {
      countShot(serving.receiveWon, shotWithHand(shotLabel(winningShot), point.winning_hand ?? null), false);
      decidedBy = 'receive';
    } else {
      serving.rally[winner === server ? 'won' : 'lost'] += 1;
    }
    if (!playerWon && point.is_unforced_error) unforced.recorded = true;

    // Who attacked first, and the third ball on the player's serve. Nobody
    // played a shot on a service fault.
    const result = playerWon ? 'won' : 'lost';
    if (!isServiceFault) {
      if (point.is_attacked_first) {
        attackFirstTicks += 1;
        attackFirst.player[result] += 1;
      } else if (winningShot.role === 'attack' || (otherShot.role === 'attack' && otherShot.name !== NO_SHOT)) {
        attackFirst.opponent[result] += 1;
      } else {
        attackFirst.unclear[result] += 1;
      }
      if (server === 'player' && decidedBy === null) {
        if (point.is_third_ball_attack) {
          thirdBallTicks += 1;
          thirdBall.attacked[result] += 1;
        } else {
          thirdBall.other[result] += 1;
        }
      }
    }

    if (current && current.side === winner && current.setNumber === setNumber) {
      current.length += 1;
    } else {
      current = { side: winner, length: 1, setNumber, fromPlayer: p, fromOpponent: o };
      runs.push(current);
    }

    const after: [number, number] = playerWon ? [p + 1, o] : [p, o + 1];
    scores.set(setNumber, after);
    gaps.set(setNumber, [...(gaps.get(setNumber) ?? [0]), after[0] - after[1]]);
    const number = (setCounts.get(setNumber) ?? 0) + 1;
    setCounts.set(setNumber, number);

    rows.push({
      id: point.id,
      setNumber,
      number,
      server,
      winner,
      playerScore: after[0],
      opponentScore: after[1],
      winningShot: isServiceFault ? null : shotLabelWithHand(winningShot, point.winning_hand),
      losingShot: isServiceFault ? 'Service fault' : otherShot.name === NO_SHOT ? null : shotLabelWithHand(otherShot, point.other_hand),
      isServiceFault,
      isLucky: !!point.is_lucky_shot,
      isUnforced,
      isAttackedFirst: !!point.is_attacked_first,
      isThirdBall: !!point.is_third_ball_attack,
      decidedBy,
    });
  }

  const setSummaries: SetSummary[] = [...sets]
    .sort((a, b) => a.set_number - b.set_number)
    .filter(s => (setCounts.get(s.set_number) ?? 0) > 0)
    .map(s => {
      const serve = serveBySet.get(s.set_number) ?? { player: emptyRecord(), opponent: emptyRecord() };
      const [playerScore, opponentScore] = scores.get(s.set_number) ?? [0, 0];
      const setGaps = gaps.get(s.set_number) ?? [0];
      return {
        setNumber: s.set_number,
        playerScore,
        opponentScore,
        gaps: setGaps,
        playerServe: serve.player,
        opponentServe: serve.opponent,
        afterSix: scoreAt(setGaps, Math.min(6, setGaps.length - 1)),
        biggestLead: { player: biggestLead(setGaps, 'player'), opponent: biggestLead(setGaps, 'opponent') },
        closingRun: closingRun(setGaps),
      };
    });

  const setsWon = emptyRecord();
  for (const s of setSummaries) {
    // A set ended early with End Set counts for whoever was ahead
    if (s.playerScore > s.opponentScore) setsWon.won += 1;
    else if (s.opponentScore > s.playerScore) setsWon.lost += 1;
  }

  // Confirming there are none counts as recording them
  if (unforced.confirmed) unforced.recorded = true;

  // Nerves show as unforced errors bunched at the close of sets
  const closePoints = fromEightAll.won + fromEightAll.lost;
  const otherPoints = rows.length - closePoints;
  const otherUnforced = unforced.total - fromEightAll.unforced;
  unforced.bunchedLate = fromEightAll.unforced >= 3
    && (otherUnforced === 0 || fromEightAll.unforced / closePoints >= (2 * otherUnforced) / otherPoints);

  const byNet = (a: ShotRow, b: ShotRow) => (a.won - a.lost) - (b.won - b.lost) || b.lost - a.lost;
  const analysis: Analysis = {
    setsWon,
    points: {
      won: rows.filter(r => r.winner === 'player').length,
      lost: rows.filter(r => r.winner === 'opponent').length,
    },
    sets: setSummaries,
    onServe,
    onReceive,
    fromEightAll,
    stages: [...stages.values()],
    runs: runs.filter(r => r.length >= 3).sort((a, b) => b.length - a.length),
    serveReceive: {
      player: serveStats(serveReceive.player),
      opponent: serveStats(serveReceive.opponent),
    },
    lucky,
    shots: {
      // Player: most costly first. Opponent: their best first.
      player: [...shotRows.player.values()].sort(byNet),
      opponent: [...shotRows.opponent.values()].sort((a, b) => byNet(b, a)),
    },
    balance: buildBalance(roleTallies, [...balanceShots.values()]),
    hands,
    attacksBySet: setSummaries.map(s => ({
      setNumber: s.setNumber,
      points: s.playerScore + s.opponentScore,
      ...(attacksBySet.get(s.setNumber) ?? { player: emptyRecord(), opponent: emptyRecord() }),
    })),
    attackFirst: attackFirstTicks > 0 || attackFirst.confirmed ? attackFirst : null,
    thirdBall: thirdBallTicks > 0 || thirdBall.confirmed ? thirdBall : null,
    unforced,
    rows,
    patterns: {
      player: repeated(patterns.player),
      opponent: repeated(patterns.opponent),
    },
    cards: [],
  };
  analysis.cards = buildCards(analysis);
  return analysis;
};

const serveStats = (s: ReturnType<typeof emptyServe>): ServeStats => ({
  ...s, receiveMissed: byCount(s.receiveMissed), receiveWon: byCount(s.receiveWon),
});

/** The score after a number of points, player first, from a set's gaps. */
const scoreAt = (gaps: number[], index: number) => {
  const player = (index + gaps[index]) / 2;
  return `${player}-${index - player}`;
};

const biggestLead = (gaps: number[], side: Side): Lead | null => {
  let best: Lead | null = null;
  gaps.forEach((g, i) => {
    const lead = side === 'player' ? g : -g;
    if (lead > 0 && lead >= (best?.lead ?? 0)) best = { lead, at: scoreAt(gaps, i) };
  });
  return best;
};

const closingRun = (gaps: number[]): { side: Side; length: number } => {
  const n = gaps.length - 1;
  if (n < 1) return { side: 'player', length: 0 };
  const side: Side = gaps[n] > gaps[n - 1] ? 'player' : 'opponent';
  let length = 0;
  for (let i = n; i > 0 && (gaps[i] > gaps[i - 1]) === (side === 'player'); i--) length += 1;
  return { side, length };
};

const balanceSide = (tallies: Map<Role, Tally>): BalanceSide => {
  const roles = ROLES.map(role => ({ role, ...tallies.get(role)! }));
  return { total: roles.reduce((n, r) => n + r.won + r.lost, 0), roles };
};

const buildBalance = (tallies: { player: Map<Role, Tally>; opponent: Map<Role, Tally> }, shots: BalanceShot[]): Balance => {
  const balance: Balance = {
    player: balanceSide(tallies.player),
    opponent: balanceSide(tallies.opponent),
    shots: shots.sort((a, b) =>
      ROLES.indexOf(a.role) - ROLES.indexOf(b.role)
      || (b.player + b.opponent) - (a.player + a.opponent)
      || a.shot.localeCompare(b.shot)),
    standouts: [],
  };
  balance.standouts = balanceFindings(balance).slice(0, 3).map(f => f.text);
  return balance;
};

// "Backhand block" to "backhand blocks". Fish is its own plural.
const pluralShot = (shot: string) => {
  const s = shot.toLowerCase();
  return s.endsWith('fish') ? s : /(s|sh|ch|x)$/.test(s) ? `${s}es` : `${s}s`;
};
const withArticle = (shot: string) => `${/^[aeiou]/i.test(shot) ? 'an' : 'a'} ${shot.toLowerCase()}`;

// What shot balance picks out, most telling first
const MIN_ROLE_TOTAL = 10;
const ROLE_GAP = 20;
const MISSING_MIN = 5;
const RATIO_MIN = 10;
const RATIO = 1.5;

type BalanceFinding = { kind: 'role' | 'you-missing' | 'ratio' | 'they-missing'; size: number; text: string; shot?: BalanceShot };

const balanceFindings = (b: Balance): BalanceFinding[] => {
  const found: BalanceFinding[] = [];
  if (b.player.total >= MIN_ROLE_TOTAL && b.opponent.total >= MIN_ROLE_TOTAL) {
    ROLES.forEach((role, i) => {
      const yours = b.player.roles[i].won + b.player.roles[i].lost;
      const theirs = b.opponent.roles[i].won + b.opponent.roles[i].lost;
      const gap = Math.abs(pct(yours, b.player.total) - pct(theirs, b.opponent.total));
      if (gap >= ROLE_GAP) {
        found.push({ kind: 'role', size: gap, text: `${ROLE_LABEL[role]} was ${yours} of your ${b.player.total} shots. It was ${theirs} of their ${b.opponent.total}.` });
      }
    });
  }
  for (const s of b.shots) {
    const shot = s.shot.toLowerCase();
    if (s.player === 0 && s.opponent >= MISSING_MIN) {
      found.push({ kind: 'you-missing', size: s.opponent, shot: s, text: `You never had ${withArticle(shot)} as your winning or losing shot. They had ${s.opponent}.` });
    } else if (s.opponent === 0 && s.player >= MISSING_MIN) {
      found.push({ kind: 'they-missing', size: s.player, shot: s, text: `They never had ${withArticle(shot)} as their winning or losing shot. You had ${s.player}.` });
    } else if (s.player > 0 && s.opponent > 0) {
      const [more, fewer] = [Math.max(s.player, s.opponent), Math.min(s.player, s.opponent)];
      if (more >= RATIO_MIN && more >= RATIO * fewer) {
        found.push({
          kind: 'ratio', size: more, shot: s,
          text: s.player > s.opponent
            ? `You had ${s.player} ${pluralShot(shot)} to their ${s.opponent}.`
            : `They had ${s.opponent} ${pluralShot(shot)} to your ${s.player}.`,
        });
      }
    }
  }
  const order = ['role', 'you-missing', 'ratio', 'they-missing'];
  return found.sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind) || y.size - x.size);
};

const MIN_PATTERN_COUNT = 3;

const repeated = (patterns: Map<string, Pattern>) =>
  [...patterns.values()]
    .filter(p => p.count >= MIN_PATTERN_COUNT)
    .sort((a, b) => b.count - a.count || a.winningShot.localeCompare(b.winningShot));

const shotLabelWithHand = (shot: AnalysisShot, hand?: Hand | null) =>
  hand ? `${shotLabel(shot)} ${hand.toUpperCase()}` : shotLabel(shot);

/**
 * Short findings, each from a fixed rule. Up to six, story first, then what to
 * work on, then scouting.
 */
export const buildCards = (a: Analysis): Card[] => {
  const story: Card[] = [];
  const workOn: Card[] = [];
  const scouting: Card[] = [];

  // A set lost from a real lead, or won from a real deficit: the biggest swing
  // of each. A lead counts when it was 3 or more, or 2 with the leader on 8 or
  // more, so 2-0 early in a set doesn't.
  const swings = a.sets.map(s => {
    const lostIt = s.opponentScore > s.playerScore;
    let best = { gap: 0, index: -1 };
    s.gaps.forEach((g, i) => {
      const lead = lostIt ? g : -g;
      const leaderScore = (i + Math.abs(g)) / 2;
      if ((lead >= 3 || (lead >= 2 && leaderScore >= 8)) && lead >= best.gap) best = { gap: lead, index: i };
    });
    return { s, lostIt, best };
  }).filter(x => x.best.index > 0);
  const lost = swings.filter(x => x.lostIt).sort((x, y) => y.best.gap - x.best.gap)[0];
  if (lost) {
    const run = lost.s.closingRun.side === 'opponent' ? lost.s.closingRun.length : 0;
    story.push({
      tag: 'Match story',
      title: `Lost set ${lost.s.setNumber} from ${scoreAt(lost.s.gaps, lost.best.index)} up`,
      text: run >= 3
        ? `Lost the last ${run} points of the set.`
        : `Lost the set ${lost.s.playerScore}-${lost.s.opponentScore}.`,
    });
  }
  const won = swings.filter(x => !x.lostIt).sort((x, y) => y.best.gap - x.best.gap)[0];
  if (won) {
    story.push({
      tag: 'Match story',
      title: `Came back in set ${won.s.setNumber}`,
      text: `Down ${scoreAt(won.s.gaps, won.best.index)}, won ${won.s.playerScore}-${won.s.opponentScore}.`,
    });
  }

  // Getting in first: a clear gap between points won when the player attacked
  // first and when the opponent did
  const af = a.attackFirst;
  if (af) {
    const yours = af.player.won + af.player.lost;
    const theirs = af.opponent.won + af.opponent.lost;
    if (yours >= 5 && theirs >= 5 && pct(af.player.won, yours) - pct(af.opponent.won, theirs) >= 25) {
      story.push({
        tag: 'Match story',
        title: 'Getting in first paid off',
        text: `You won ${af.player.won} of ${yours} points when you attacked first, and ${af.opponent.won} of ${theirs} when they did.`,
      });
    }
  }

  // An attack drop-off: far fewer attacking winners in a later set than an
  // earlier one. Only full-length sets count, so a set ended early doesn't.
  for (const side of ['player', 'opponent'] as const) {
    const sets = a.attacksBySet.filter(s => s.points >= 11);
    let drop: { from: SetAttacks; to: SetAttacks } | null = null;
    sets.forEach((from, i) => sets.slice(i + 1).forEach(to => {
      const high = from[side].won;
      const low = to[side].won;
      if (high - low >= 4 && low * 2 <= high && (!drop || high - low > drop.from[side].won - drop.to[side].won)) {
        drop = { from, to };
      }
    }));
    if (drop) {
      const { from, to } = drop as { from: SetAttacks; to: SetAttacks };
      const [Who, Whose] = side === 'player' ? ['You', 'Your'] : ['They', 'Their'];
      story.push({
        tag: 'Match story',
        title: `${Whose} attacking dropped off in set ${to.setNumber}`,
        text: `${Who} won ${from[side].won} points with an attacking shot in set ${from.setNumber} and ${to[side].won} in set ${to.setNumber}. Points lost on an attacking shot went from ${from[side].lost} to ${to[side].lost}.`,
      });
    }
  }

  // Early against late in sets
  const [early, , late] = a.stages;
  const earlyTotal = early.won + early.lost;
  const lateTotal = late.won + late.lost;
  if (earlyTotal >= 8 && lateTotal >= 8) {
    const diff = pct(early.won, earlyTotal) - pct(late.won, lateTotal);
    if (diff >= 20) {
      story.push({ tag: 'Match story', title: 'Won fewer points late in sets', text: `Won ${early.won} of the first ${earlyTotal} points in sets. Won ${late.won} of ${lateTotal} from the 16th point on.` });
    } else if (diff <= -20) {
      story.push({ tag: 'Match story', title: 'Won more points late in sets', text: `Won ${late.won} of ${lateTotal} points from the 16th point on, against ${early.won} of the first ${earlyTotal}.` });
    }
  }

  // Who did more attacking, or failing that more defending, by shot role
  const roleCount = (side: BalanceSide, role: Role) => {
    const r = side.roles.find(x => x.role === role)!;
    return r.won + r.lost;
  };
  for (const [role, noun, verb] of [['attack', 'An attack', 'attacking'], ['defence', 'Defence', 'defending']] as const) {
    const yours = roleCount(a.balance.player, role);
    const theirs = roleCount(a.balance.opponent, role);
    if (theirs >= 10 && theirs >= 1.4 * yours) {
      story.push({ tag: 'Match story', title: `They did more ${verb}`, text: `${noun} was their winning or losing shot in ${theirs} points. Yours: ${yours}.` });
      break;
    }
    if (yours >= 10 && yours >= 1.4 * theirs) {
      story.push({ tag: 'Match story', title: `You did more ${verb}`, text: `${noun} was your winning or losing shot in ${yours} points. Theirs: ${theirs}.` });
      break;
    }
  }

  // A shot they kept having that you never did
  const missing = balanceFindings(a.balance).find(f => f.kind === 'you-missing');
  if (missing?.shot) {
    story.push({
      tag: 'Match story',
      title: `No ${pluralShot(missing.shot.shot)}`,
      text: `${withArticle(missing.shot.shot).replace(/^a/, 'A')} was never your winning or losing shot. It was theirs in ${missing.shot.opponent} points.`,
    });
  }

  // Work on: unforced errors first when they've been recorded
  if (a.unforced.recorded) {
    const worst = [...a.shots.player].filter(s => s.unforced >= 3 && s.shot !== 'Service fault').sort((x, y) => y.unforced - x.unforced)[0];
    if (worst) {
      const name = shotWithHand(worst.shot, worst.hand);
      workOn.push({ tag: 'Work on', title: name, text: `${worst.unforced} of your ${worst.lost} losing ${pluralShot(name)} were unforced.` });
    }
    if (a.unforced.bunchedLate) {
      workOn.push({ tag: 'Work on', title: 'Errors from 8-all', text: `${a.fromEightAll.unforced} of the ${a.fromEightAll.lost} points you lost from 8-all were unforced, more often than earlier in sets.` });
    }
  }
  const costly = [...a.shots.player].filter(s => s.lost >= 4 && s.lost > s.won).sort((x, y) => y.lost - x.lost)[0];
  if (costly && !workOn.some(c => c.title === shotWithHand(costly.shot, costly.hand))) {
    workOn.push({
      tag: 'Work on',
      title: shotWithHand(costly.shot, costly.hand),
      text: `Your losing shot in ${costly.lost} points. Your winning shot in ${costly.won}.`,
    });
  }

  // Scouting: their best weapon and their weakest shot
  const weapon = [...a.shots.opponent].filter(s => s.won >= 5).sort((x, y) => y.won - x.won)[0];
  if (weapon) {
    scouting.push({
      tag: 'Scouting',
      title: `Their ${shotWithHand(weapon.shot, weapon.hand).toLowerCase()}`,
      text: `Won them ${weapon.won} of their ${a.points.lost} points.`,
    });
  }
  const weakness = [...a.shots.opponent].filter(s => s.lost >= 4 && s.lost >= 3 * s.won).sort((x, y) => y.lost - x.lost)[0];
  if (weakness) {
    scouting.push({
      tag: 'Scouting',
      title: `Their ${shotWithHand(weakness.shot, weakness.hand).toLowerCase()}`,
      text: `Their losing shot ${plural(weakness.lost, 'time')}. Their winning shot ${weakness.won === 0 ? 'never' : weakness.won === 1 ? 'once' : plural(weakness.won, 'time')}.`,
    });
  }

  // Keep the mix: at most three story cards, then work on and scouting
  return [...story.slice(0, 3), ...workOn.slice(0, 2), ...scouting.slice(0, 2)].slice(0, 6);
};
