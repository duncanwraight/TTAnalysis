/**
 * A player's history: every match's analysis added up. Built from the same
 * buildAnalysis results the analysis page uses, so serve and receive, close
 * finishes and the sweep tags are counted the same way in both places.
 *
 * Kept free of React and Supabase so it can be tested.
 */

import { shotWithHand, type Analysis, type Hand as ShotHand, type Tally } from './analysis.ts';
import { RUBBERS, RUBBER_LABEL, type Kit, type PlayStyle, type Rubber } from './styles.ts';

export type HistoryMatch = {
  id: string;
  // yyyy-mm-dd
  date: string;
  opponentName: string;
  event: string | null;
  isComplete: boolean;
  opponentKit: Kit;
  analysis: Analysis;
};

/** A count out of a total, kept apart so matches can be added together rather than averaged. */
export type Ratio = { n: number; d: number };

export type MetricKey = 'sets' | 'points' | 'serve' | 'receive' | 'close' | 'unforced' | 'attackFirst';

export type Trend = {
  key: MetricKey;
  label: string;
  unit: 'percent' | 'per10';
  lowerIsBetter: boolean;
  // Why a match might not count, for the basis line ("confirmed in 8 of 10")
  countedWord: string | null;
  // One per match, oldest first. Null when the match doesn't count.
  values: (Ratio | null)[];
  counted: number;
  // Positions in values of the matches in each half
  recentIdx: number[];
  earlierIdx: number[];
  recent: Ratio | null;
  // Null when there are too few counted matches to compare
  earlier: Ratio | null;
};

export type HistoryShot = {
  key: string;
  shot: string;
  hand: ShotHand | null;
  won: number;
  lost: number;
  // Only from matches with unforced errors confirmed
  unforced: number;
  // Won minus lost in each match, oldest first. Null when it wasn't used.
  nets: (number | null)[];
  used: number;
  // Matches where it lost more than it won
  losingIn: number;
};

export type GroupBy = 'rubber' | 'style' | 'hand';

export type OpponentGroup = {
  key: string;
  label: string;
  matchIds: string[];
  // Finished matches only
  results: Tally;
  sets: Tally;
  points: Tally;
  onServe: Tally;
  onReceive: Tally;
  close: Tally;
  // Too few matches to read anything into
  few: boolean;
  // Matches with nothing set for this
  unset: boolean;
};

export type Standout = {
  kind: 'sets' | 'trend' | 'shot' | 'opponent';
  title: string;
  text: string;
  // Which tab says more
  tab: 'overview' | 'shots' | 'opponents';
  // The trend tile it's about, for a link on the overview
  metric?: MetricKey;
};

export type HistoryRow = {
  id: string;
  date: string;
  opponentName: string;
  event: string | null;
  // Null until the match is finished
  result: 'won' | 'lost' | null;
  sets: Tally;
  points: Tally;
  onReceive: Tally;
};

export type Totals = {
  results: Tally;
  sets: Tally;
  points: Tally;
  onServe: Tally;
  onReceive: Tally;
  close: Tally;
};

export type History = {
  // Oldest first
  rows: HistoryRow[];
  totals: Totals;
  trends: Trend[];
  shots: { player: HistoryShot[]; opponent: HistoryShot[] };
  // Matches whose unforced errors are confirmed, which the unforced column counts
  unforcedMatches: number;
  opponents: { [by in GroupBy]: OpponentGroup[] };
  standouts: Standout[];
};

/** Below this many counted matches a trend shows no recent-against-earlier comparison. */
export const MIN_TO_COMPARE = 6;
/** The most matches in each half of a comparison. */
export const COMPARE_SIZE = 5;
/** Opponent groups with fewer matches are greyed out and never used in What stands out. */
export const MIN_GROUP = 3;
/** Shots used fewer times than this in all go in an "other shots" list. */
export const MIN_SHOT_USES = 10;

const tally = (): Tally => ({ won: 0, lost: 0 });
const add = (into: Tally, t: Tally) => { into.won += t.won; into.lost += t.lost; };
const total = (t: Tally) => t.won + t.lost;
export const pct = (t: Tally) => (total(t) > 0 ? Math.round((100 * t.won) / total(t)) : 0);
const fromTally = (t: Tally): Ratio | null => (total(t) > 0 ? { n: t.won, d: total(t) } : null);

const resultOf = (m: HistoryMatch): 'won' | 'lost' | null => {
  if (!m.isComplete) return null;
  const { won, lost } = m.analysis.setsWon;
  return won > lost ? 'won' : won < lost ? 'lost' : null;
};

/** The figure a ratio stands for: a percentage, or per 10 points. */
export const ratioValue = (r: Ratio, unit: Trend['unit']) => (unit === 'per10' ? (10 * r.n) / r.d : (100 * r.n) / r.d);

export const formatRatio = (r: Ratio, unit: Trend['unit']) => {
  const v = ratioValue(r, unit);
  return unit === 'per10' ? v.toFixed(1) : `${Math.round(v)}%`;
};

const sumRatios = (rs: Ratio[]): Ratio | null => {
  const n = rs.reduce((s, r) => s + r.n, 0);
  const d = rs.reduce((s, r) => s + r.d, 0);
  return d > 0 ? { n, d } : null;
};

type MetricDef = {
  key: MetricKey;
  label: string;
  unit: Trend['unit'];
  lowerIsBetter?: boolean;
  countedWord?: string;
  // Follows "the last 4 matches" when not every match counts
  countedPhrase?: string;
  value: (a: Analysis) => Ratio | null;
  // Shown in What stands out when the recent half moved this way
  up: string;
  down: string;
};

const METRICS: MetricDef[] = [
  { key: 'sets', label: 'Sets won', unit: 'percent', value: a => fromTally(a.setsWon), up: 'Winning more sets', down: 'Winning fewer sets' },
  { key: 'points', label: 'Points won', unit: 'percent', value: a => fromTally(a.points), up: 'Winning more points', down: 'Winning fewer points' },
  { key: 'serve', label: 'Points won on serve', unit: 'percent', value: a => fromTally(a.onServe), up: 'More points won on serve', down: 'Fewer points won on serve' },
  { key: 'receive', label: 'Points won on receive', unit: 'percent', value: a => fromTally(a.onReceive), up: 'More points won on receive', down: 'Fewer points won on receive' },
  {
    key: 'close', label: 'Close finishes won from 8-all', unit: 'percent', countedWord: 'reached 8-all', countedPhrase: 'that reached 8-all',
    value: a => fromTally(a.fromEightAll), up: 'Close finishes going better', down: 'Close finishes going worse',
  },
  {
    key: 'unforced', label: 'Unforced errors', unit: 'per10', lowerIsBetter: true, countedWord: 'confirmed', countedPhrase: 'with unforced errors confirmed',
    value: a => (a.unforced.confirmed && total(a.points) > 0 ? { n: a.unforced.total, d: total(a.points) } : null),
    up: 'More unforced errors', down: 'Fewer unforced errors',
  },
  {
    key: 'attackFirst', label: 'Attacked first', unit: 'percent', countedWord: 'confirmed', countedPhrase: 'with attacked first confirmed',
    value: a => {
      const af = a.attackFirst;
      if (!af || !af.confirmed) return null;
      const yours = total(af.player);
      const d = yours + total(af.opponent);
      return d > 0 ? { n: yours, d } : null;
    },
    up: 'Attacking first more often', down: 'Attacking first less often',
  },
];

/** How far the recent half has to move from the earlier one to stand out. */
const STANDOUT_MOVE: { [unit in Trend['unit']]: number } = { percent: 8, per10: 0.4 };

/** The last few counted matches against the same number before them. */
const splitHalves = (idx: number[]) => {
  const c = idx.length;
  if (c < MIN_TO_COMPARE) return { recentIdx: idx, earlierIdx: [] as number[] };
  const k = Math.min(COMPARE_SIZE, Math.floor(c / 2));
  return { recentIdx: idx.slice(c - k), earlierIdx: idx.slice(c - 2 * k, c - k) };
};

const buildTrend = (def: MetricDef, matches: HistoryMatch[]): Trend => {
  const values = matches.map(m => def.value(m.analysis));
  const idx = values.flatMap((v, i) => (v ? [i] : []));
  const { recentIdx, earlierIdx } = splitHalves(idx);
  const pick = (list: number[]) => sumRatios(list.map(i => values[i] as Ratio));
  return {
    key: def.key,
    label: def.label,
    unit: def.unit,
    lowerIsBetter: !!def.lowerIsBetter,
    countedWord: def.countedWord ?? null,
    values,
    counted: idx.length,
    recentIdx,
    earlierIdx,
    recent: pick(recentIdx),
    earlier: earlierIdx.length > 0 ? pick(earlierIdx) : null,
  };
};

const buildShots = (matches: HistoryMatch[], side: 'player' | 'opponent'): HistoryShot[] => {
  const byKey = new Map<string, HistoryShot>();
  matches.forEach((m, i) => {
    const confirmed = m.analysis.unforced.confirmed;
    for (const row of m.analysis.shots[side]) {
      let s = byKey.get(row.key);
      if (!s) {
        s = { key: row.key, shot: row.shot, hand: row.hand, won: 0, lost: 0, unforced: 0, nets: matches.map(() => null), used: 0, losingIn: 0 };
        byKey.set(row.key, s);
      }
      s.won += row.won;
      s.lost += row.lost;
      if (confirmed) s.unforced += row.unforced;
      s.nets[i] = (s.nets[i] ?? 0) + row.won - row.lost;
    }
  });
  const shots = [...byKey.values()];
  for (const s of shots) {
    s.used = s.nets.filter(n => n !== null).length;
    s.losingIn = s.nets.filter(n => n !== null && n < 0).length;
  }
  // Worst first
  return shots.sort((a, b) => (a.won - a.lost) - (b.won - b.lost) || (b.won + b.lost) - (a.won + a.lost));
};

const UNSET = 'unset';

/** The groups a match falls in. A match against long pips and anti counts in both. */
const groupKeys = (kit: Kit, by: GroupBy): string[] => {
  if (by === 'style') return [kit.style_id ?? UNSET];
  if (by === 'hand') return [kit.hand ?? UNSET];
  const rubbers = [kit.forehand_rubber, kit.backhand_rubber].filter((r): r is Rubber => !!r);
  const special = [...new Set(rubbers.filter(r => r !== 'inverted'))];
  if (special.length > 0) return special;
  return rubbers.length > 0 ? ['inverted'] : [UNSET];
};

const groupLabel = (key: string, by: GroupBy, styles: PlayStyle[]) => {
  if (key === UNSET) return by === 'style' ? 'No style set' : 'Not set';
  if (by === 'style') return styles.find(s => s.id === key)?.name ?? 'No style set';
  if (by === 'hand') return key === 'left' ? 'Left-handers' : 'Right-handers';
  return RUBBER_LABEL[key as Rubber];
};

const buildGroups = (matches: HistoryMatch[], by: GroupBy, styles: PlayStyle[]): OpponentGroup[] => {
  const groups = new Map<string, OpponentGroup>();
  for (const m of matches) {
    const keys = groupKeys(m.opponentKit, by).map(k => (by === 'style' && k !== UNSET && !styles.some(s => s.id === k) ? UNSET : k));
    for (const key of new Set(keys)) {
      let g = groups.get(key);
      if (!g) {
        g = {
          key, label: groupLabel(key, by, styles), matchIds: [],
          results: tally(), sets: tally(), points: tally(), onServe: tally(), onReceive: tally(), close: tally(),
          few: false, unset: key === UNSET,
        };
        groups.set(key, g);
      }
      const a = m.analysis;
      g.matchIds.push(m.id);
      const result = resultOf(m);
      if (result === 'won') g.results.won++;
      if (result === 'lost') g.results.lost++;
      add(g.sets, a.setsWon);
      add(g.points, a.points);
      add(g.onServe, a.onServe);
      add(g.onReceive, a.onReceive);
      add(g.close, a.fromEightAll);
    }
  }
  const order = (g: OpponentGroup) => (by === 'rubber' ? RUBBERS.indexOf(g.key as Rubber) : 0);
  return [...groups.values()]
    .map(g => ({ ...g, few: g.matchIds.length < MIN_GROUP }))
    .sort((a, b) => Number(a.unset) - Number(b.unset) || b.matchIds.length - a.matchIds.length || order(a) - order(b));
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 'es'}`;

/** Sets won against points won across every finished match: a big gap says how sets end. */
const setsStandout = (totals: Totals, finished: number): Standout | null => {
  if (finished < MIN_GROUP || total(totals.sets) === 0) return null;
  const sets = pct(totals.sets);
  const points = pct(totals.points);
  const close = total(totals.close) > 0 ? ` Close finishes from 8-all went your way ${pct(totals.close)}% of the time.` : '';
  if (sets - points <= -10) {
    return {
      kind: 'sets', tab: 'overview', metric: 'sets', title: 'Winning points but not sets',
      text: `Won ${points}% of points but only ${sets}% of sets, so sets are getting away at the end.${close}`,
    };
  }
  if (sets - points >= 10) {
    return {
      kind: 'sets', tab: 'overview', metric: 'sets', title: 'Winning the sets that matter',
      text: `Won ${sets}% of sets from ${points}% of points.${close}`,
    };
  }
  return null;
};

const trendStandouts = (trends: Trend[]): Standout[] =>
  trends
    .flatMap(t => {
      if (!t.recent || !t.earlier) return [];
      const move = ratioValue(t.recent, t.unit) - ratioValue(t.earlier, t.unit);
      // Rounded first, so the text never shows two equal figures as a move
      if (formatRatio(t.recent, t.unit) === formatRatio(t.earlier, t.unit)) return [];
      if (Math.abs(move) < STANDOUT_MOVE[t.unit]) return [];
      const def = METRICS.find(d => d.key === t.key) as MetricDef;
      const k = t.recentIdx.length;
      const which = def.countedPhrase && t.counted < t.values.length ? ` ${def.countedPhrase}` : '';
      const unit = t.unit === 'per10' ? ' per 10 points' : '';
      return [{
        size: Math.abs(move) / STANDOUT_MOVE[t.unit],
        standout: {
          kind: 'trend' as const, tab: 'overview' as const, metric: t.key,
          title: move > 0 ? def.up : def.down,
          text: `${formatRatio(t.recent, t.unit)}${unit} in the last ${plural(k, 'match')}${which}, ${formatRatio(t.earlier, t.unit)} in the ${k} before.`,
        },
      }];
    })
    .sort((a, b) => b.size - a.size)
    .map(x => x.standout);

const shotStandout = (shots: HistoryShot[]): Standout | null => {
  const losing = shots.filter(s => s.used >= 4 && s.lost > s.won && s.losingIn / s.used >= 0.6);
  if (losing.length === 0) return null;
  const s = losing[0];
  return {
    kind: 'shot', tab: 'shots', title: `${shotWithHand(s.shot, s.hand)} keeps losing`,
    text: `It lost more points than it won in ${s.losingIn} of the ${plural(s.used, 'match')} it was used in: won ${s.won}, lost ${s.lost} in all.`,
  };
};

const opponentStandout = (groups: History['opponents'], totals: Totals): Standout | null => {
  const overall = pct(totals.sets);
  const candidates = (Object.keys(groups) as GroupBy[])
    .flatMap(by => groups[by].filter(g => !g.few && !g.unset && total(g.sets) > 0).map(g => ({ g, by, gap: pct(g.sets) - overall })))
    .filter(x => x.gap <= -8)
    .sort((a, b) => a.gap - b.gap);
  if (candidates.length === 0) return null;
  const { g } = candidates[0];
  const n = g.matchIds.length;
  const results = total(g.results) > 0 && g.results.won === 0 ? `Lost all ${total(g.results)} finished matches. ` : '';
  const pointsGap = pct(g.sets) - pct(g.points) <= -10 ? ` They won ${pct(g.points)}% of the points, so the sets are slipping away at the end.` : '';
  return {
    kind: 'opponent', tab: 'opponents', title: `${g.label}: the hardest match-up`,
    text: `${results}Won ${g.sets.won} of ${total(g.sets)} sets in ${plural(n, 'match')} (${pct(g.sets)}%), ${overall}% overall.${pointsGap}`,
  };
};

/** Every match added up. Matches can come in any order; the history sorts them oldest first. */
export const buildHistory = (input: HistoryMatch[], styles: PlayStyle[]): History => {
  const matches = [...input].sort((a, b) => a.date.localeCompare(b.date));
  const totals: Totals = { results: tally(), sets: tally(), points: tally(), onServe: tally(), onReceive: tally(), close: tally() };
  const rows: HistoryRow[] = matches.map(m => {
    const a = m.analysis;
    const result = resultOf(m);
    if (result === 'won') totals.results.won++;
    if (result === 'lost') totals.results.lost++;
    add(totals.sets, a.setsWon);
    add(totals.points, a.points);
    add(totals.onServe, a.onServe);
    add(totals.onReceive, a.onReceive);
    add(totals.close, a.fromEightAll);
    return { id: m.id, date: m.date, opponentName: m.opponentName, event: m.event, result, sets: a.setsWon, points: a.points, onReceive: a.onReceive };
  });

  const trends = METRICS.map(def => buildTrend(def, matches));
  const shots = { player: buildShots(matches, 'player'), opponent: buildShots(matches, 'opponent') };
  const opponents = {
    rubber: buildGroups(matches, 'rubber', styles),
    style: buildGroups(matches, 'style', styles),
    hand: buildGroups(matches, 'hand', styles),
  };

  const byTrend = trendStandouts(trends);
  const standouts = [
    setsStandout(totals, total(totals.results)),
    byTrend[0] ?? null,
    shotStandout(shots.player),
    opponentStandout(opponents, totals),
    ...byTrend.slice(1),
  ].filter((s): s is Standout => !!s).slice(0, 3);

  return {
    rows,
    totals,
    trends,
    shots,
    unforcedMatches: matches.filter(m => m.analysis.unforced.confirmed).length,
    opponents,
    standouts,
  };
};

export type HistoryFilters = {
  // Null for every match
  months: number | null;
  finishedOnly: boolean;
  // Null for every event
  event: string | null;
};

export const DEFAULT_FILTERS: HistoryFilters = { months: null, finishedOnly: true, event: null };

/** The matches the filters keep. Today is passed in so tests don't depend on the date. */
export const filterMatches = <T extends { date: string; isComplete: boolean; event: string | null }>(
  matches: T[], filters: HistoryFilters, today: Date,
): T[] => {
  let from: string | null = null;
  if (filters.months !== null) {
    const d = new Date(today.getFullYear(), today.getMonth() - filters.months, today.getDate());
    from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return matches.filter(m =>
    (!filters.finishedOnly || m.isComplete)
    && (from === null || m.date >= from)
    && (filters.event === null || (m.event ?? '').trim() === filters.event));
};
