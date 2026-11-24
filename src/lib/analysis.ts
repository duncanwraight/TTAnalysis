/**
 * Match analysis built from the raw points, kept free of React and Supabase so
 * it can be tested.
 *
 * Each point records two shots: the winner's winning shot, and the loser's
 * losing shot (either the shot that set up the winner, or the one that missed).
 * Every figure here is about how points ended, not every shot in a rally.
 */

import { Side, getServer, otherSide } from './scoring';

export type Hand = 'fh' | 'bh';

export type AnalysisShot = {
  id: string;
  name: string;
  display_name: string;
  category: string;
  category_order: number;
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
};

export const SERVICE_FAULT = 'service_fault';

/** What counts as an unforced error, shown wherever one can be ticked or read. */
export const UNFORCED_ERROR_DEFINITION =
  "An unforced error is a shot you should have made. You weren't out of position, you read the spin, you went for the right shot, and it still missed.";
export const NO_SHOT = 'no_shot';
const SERVE_CATEGORY = 'serve';
const ATTACK_CATEGORY = 'attacks';
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

export type CategoryRow = { category: string; order: number; won: number; lost: number };

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
};

export type SetSummary = {
  setNumber: number;
  playerScore: number;
  opponentScore: number;
  // Score gap after each point, player minus opponent, starting at 0
  gaps: number[];
  playerServe: Tally;
  opponentServe: Tally;
};

export type Run = { side: Side; length: number; setNumber: number; fromPlayer: number; fromOpponent: number };

export type Stage = { label: string; won: number; lost: number; unforced: number };

/** A winning shot and the losing shot it was played against, seen three times or more, unforced errors left out. */
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

export type Card = { tag: 'Match story' | 'Work on' | 'Scouting'; title: string; text: string };

export type Analysis = {
  setsWon: Tally;
  points: Tally;
  sets: SetSummary[];
  // Points the player won and lost while serving, and while receiving
  onServe: Tally;
  onReceive: Tally;
  // Points from 9-9 onwards, or once either side reached 10
  fromNineAll: Tally;
  stages: Stage[];
  runs: Run[];
  lucky: { player: number; opponent: number };
  categories: { player: CategoryRow[]; opponent: CategoryRow[] };
  shots: { player: ShotRow[]; opponent: ShotRow[] };
  // Winning and losing shots by hand, serves left out
  hands: { player: { fh: Tally; bh: Tally }; opponent: { fh: Tally; bh: Tally } };
  attacksBySet: SetAttacks[];
  unforced: {
    // False until at least one of the player's unforced errors has been ticked
    recorded: boolean;
    total: number;
    onServe: number;
    onReceive: number;
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
const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const buildAnalysis = ({ initialServer, sets, points, shots }: AnalysisInput): Analysis => {
  const shotById = new Map(shots.map(s => [s.id, s]));
  const setById = new Map(sets.map(s => [s.id, s]));

  const scores = new Map<number, [number, number]>();
  const gaps = new Map<number, number[]>();
  const serveBySet = new Map<number, { player: Tally; opponent: Tally }>();
  const setCounts = new Map<number, number>();

  const shotRows = { player: new Map<string, ShotRow>(), opponent: new Map<string, ShotRow>() };
  const categoryRows = { player: new Map<string, CategoryRow>(), opponent: new Map<string, CategoryRow>() };
  const hands = {
    player: { fh: emptyRecord(), bh: emptyRecord() },
    opponent: { fh: emptyRecord(), bh: emptyRecord() },
  };
  const stages = new Map(STAGES.map(label => [label, { label, won: 0, lost: 0, unforced: 0 }]));
  const onServe = emptyRecord();
  const onReceive = emptyRecord();
  const fromNineAll = emptyRecord();
  const lucky = { player: 0, opponent: 0 };
  const unforced = { recorded: false, total: 0, onServe: 0, onReceive: 0 };
  const runs: Run[] = [];
  const rows: PointRow[] = [];
  const patterns = { player: new Map<string, Pattern>(), opponent: new Map<string, Pattern>() };
  const attacksBySet = new Map<number, { player: Tally; opponent: Tally }>();
  let current: Run | null = null;

  const tallyShot = (side: Side, shot: AnalysisShot, hand: Hand | null, result: 'won' | 'lost', isUnforced: boolean, setNumber: number) => {
    const label = shotLabel(shot);
    const key = `${shot.id}:${hand ?? ''}`;
    const row = shotRows[side].get(key) ?? { key, shot: label, hand, category: shot.category, won: 0, lost: 0, unforced: 0 };
    row[result] += 1;
    if (result === 'lost' && isUnforced) row.unforced += 1;
    shotRows[side].set(key, row);

    const cat = categoryRows[side].get(shot.category) ?? { category: shot.category, order: shot.category_order, won: 0, lost: 0 };
    cat[result] += 1;
    categoryRows[side].set(shot.category, cat);

    if (hand && shot.category !== SERVE_CATEGORY) hands[side][hand][result] += 1;

    if (shot.category === ATTACK_CATEGORY) {
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
    if ((p >= 9 && o >= 9) || p >= 10 || o >= 10) fromNineAll[playerWon ? 'won' : 'lost'] += 1;

    if (point.is_lucky_shot) lucky[winner] += 1;
    if (!playerWon && isUnforced) {
      unforced.total += 1;
      if (server === 'player') unforced.onServe += 1; else unforced.onReceive += 1;
      stage.unforced += 1;
    }
    if (!playerWon && point.is_unforced_error) unforced.recorded = true;

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
    });
  }

  const setSummaries: SetSummary[] = [...sets]
    .sort((a, b) => a.set_number - b.set_number)
    .filter(s => (setCounts.get(s.set_number) ?? 0) > 0)
    .map(s => {
      const serve = serveBySet.get(s.set_number) ?? { player: emptyRecord(), opponent: emptyRecord() };
      const [playerScore, opponentScore] = scores.get(s.set_number) ?? [0, 0];
      return {
        setNumber: s.set_number,
        playerScore,
        opponentScore,
        gaps: gaps.get(s.set_number) ?? [0],
        playerServe: serve.player,
        opponentServe: serve.opponent,
      };
    });

  const setsWon = emptyRecord();
  for (const s of setSummaries) {
    // A set ended early with End Set counts for whoever was ahead
    if (s.playerScore > s.opponentScore) setsWon.won += 1;
    else if (s.opponentScore > s.playerScore) setsWon.lost += 1;
  }

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
    fromNineAll,
    stages: [...stages.values()],
    runs: runs.filter(r => r.length >= 3).sort((a, b) => b.length - a.length).slice(0, 4),
    lucky,
    categories: {
      player: [...categoryRows.player.values()].sort((a, b) => a.order - b.order),
      opponent: [...categoryRows.opponent.values()].sort((a, b) => a.order - b.order),
    },
    shots: {
      // Player: most costly first. Opponent: their best first.
      player: [...shotRows.player.values()].sort(byNet),
      opponent: [...shotRows.opponent.values()].sort((a, b) => byNet(b, a)),
    },
    hands,
    attacksBySet: setSummaries.map(s => ({
      setNumber: s.setNumber,
      points: s.playerScore + s.opponentScore,
      ...(attacksBySet.get(s.setNumber) ?? { player: emptyRecord(), opponent: emptyRecord() }),
    })),
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

  // A set lost from a lead of 2 or more, or won from 2 or more down: the
  // biggest swing of each
  const swings = a.sets.map(s => {
    const lostIt = s.opponentScore > s.playerScore;
    let best = { gap: 0, index: -1 };
    s.gaps.forEach((g, i) => {
      const lead = lostIt ? g : -g;
      if (lead >= 2 && lead >= best.gap) best = { gap: lead, index: i };
    });
    return { s, lostIt, best };
  }).filter(x => x.best.index > 0);
  const scoreAt = (s: SetSummary, index: number) => {
    const g = s.gaps[index];
    const total = index;
    const player = (total + g) / 2;
    return `${player}-${total - player}`;
  };
  const closingRun = (s: SetSummary, side: Side) => {
    let n = 0;
    for (let i = s.gaps.length - 1; i > 0; i--) {
      const playerWonPoint = s.gaps[i] > s.gaps[i - 1];
      if ((side === 'player') !== playerWonPoint) break;
      n += 1;
    }
    return n;
  };
  const lost = swings.filter(x => x.lostIt).sort((x, y) => y.best.gap - x.best.gap)[0];
  if (lost) {
    const run = closingRun(lost.s, 'opponent');
    story.push({
      tag: 'Match story',
      title: `Set ${lost.s.setNumber} got away`,
      text: run >= 3
        ? `Up ${scoreAt(lost.s, lost.best.index)}, then lost ${run} in a row.`
        : `Up ${scoreAt(lost.s, lost.best.index)}, lost ${lost.s.playerScore}-${lost.s.opponentScore}.`,
    });
  }
  const won = swings.filter(x => !x.lostIt).sort((x, y) => y.best.gap - x.best.gap)[0];
  if (won) {
    story.push({
      tag: 'Match story',
      title: `Came back in set ${won.s.setNumber}`,
      text: `Down ${scoreAt(won.s, won.best.index)}, won ${won.s.playerScore}-${won.s.opponentScore}.`,
    });
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
      const [whose, Whose] = side === 'player' ? ['your', 'Your'] : ['their', 'Their'];
      story.push({
        tag: 'Match story',
        title: `${Whose} attacking dropped off in set ${to.setNumber}`,
        text: `An attack was ${whose} winning shot in ${from[side].won} points in set ${from.setNumber}, and ${to[side].won} in set ${to.setNumber}. ${Whose} losing shot in ${from[side].lost}, then ${to[side].lost}.`,
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
      story.push({ tag: 'Match story', title: 'Faded late in sets', text: `Won ${early.won} of the first ${earlyTotal} points in sets. Won ${late.won} of ${lateTotal} from the 16th point on.` });
    } else if (diff <= -20) {
      story.push({ tag: 'Match story', title: 'Finished sets strongly', text: `Won ${late.won} of ${lateTotal} points from the 16th point on, against ${early.won} of the first ${earlyTotal}.` });
    }
  }

  // Who attacked more: attacks as winning or losing shot
  const attacks = (rows: CategoryRow[]) => {
    const row = rows.find(r => r.category === ATTACK_CATEGORY);
    return row ? row.won + row.lost : 0;
  };
  const yourAttacks = attacks(a.categories.player);
  const theirAttacks = attacks(a.categories.opponent);
  if (theirAttacks >= 10 && theirAttacks >= 1.4 * yourAttacks) {
    story.push({ tag: 'Match story', title: 'They did more attacking', text: `An attack was their winning or losing shot in ${theirAttacks} points. Yours: ${yourAttacks}.` });
  } else if (yourAttacks >= 10 && yourAttacks >= 1.4 * theirAttacks) {
    story.push({ tag: 'Match story', title: 'You did more attacking', text: `An attack was your winning or losing shot in ${yourAttacks} points. Theirs: ${theirAttacks}.` });
  }

  // Work on: unforced errors first when they've been recorded
  if (a.unforced.recorded) {
    const worst = [...a.shots.player].filter(s => s.unforced >= 3 && s.shot !== 'Service fault').sort((x, y) => y.unforced - x.unforced)[0];
    if (worst) {
      const name = shotWithHand(worst.shot, worst.hand);
      workOn.push({ tag: 'Work on', title: name, text: `${worst.unforced} of your ${worst.lost} losing ${name.toLowerCase()}s were unforced.` });
    }
    if (late.lost >= 4 && late.unforced >= 3 && late.unforced * 2 >= late.lost) {
      workOn.push({ tag: 'Work on', title: 'Errors late in sets', text: `${late.unforced} of the ${late.lost} points you lost from the 16th point on were unforced.` });
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
