/**
 * Sweeps: going back through a match one point at a time to answer one
 * question, such as "did you attack first?". Next means no, so only the points
 * that count need a tap.
 *
 * A tag counts in the analysis once it is confirmed (a finished sweep, or the
 * owner saying every one is ticked) or has at least one tick. Until it's
 * confirmed, the owner is asked whether the ticks are complete.
 */

import type { PointRow } from './analysis.ts';

export type SweepTag = 'unforced' | 'attacked_first' | 'early_attack' | 'lucky';
export const SWEEP_TAGS: SweepTag[] = ['unforced', 'attacked_first', 'early_attack', 'lucky'];

export type SweepFlag = 'is_unforced_error' | 'is_attacked_first' | 'is_early_attack' | 'is_lucky_shot';

export type SweepDefinition = {
  flag: SweepFlag;
  // "Attacked first"
  name: string;
  // The answer button
  yes: string;
  // The answer button on the opponent's serve, when it differs
  yesOnTheirServe?: string;
  // What to tick, shown above every point
  instruction: string;
  // Which points the sweep covers, as in "Points you lost"
  scope: string;
  // Whether the analysis page asks about unconfirmed ticks
  warn: boolean;
};

/** What counts as an attack, for the attacked-first and attacked-straight-away tags. */
export const ATTACK_DEFINITION = 'Any attacking shot counts, including a flick on the receive.';

export const SWEEPS: { [tag in SweepTag]: SweepDefinition } = {
  unforced: {
    flag: 'is_unforced_error',
    name: 'Unforced errors',
    yes: 'Unforced error',
    instruction: "Tick when your losing shot was one you'd expect to make. You weren't out of position, you read the spin, you picked the right shot, and it still missed.",
    scope: 'Points you lost',
    warn: true,
  },
  attacked_first: {
    flag: 'is_attacked_first',
    name: 'Attacked first',
    yes: 'Attacked first',
    instruction: `Tick when you played the first attacking shot of the point. ${ATTACK_DEFINITION} If your opponent attacked first, or nobody attacked, go to the next point.`,
    scope: 'Every point',
    warn: true,
  },
  early_attack: {
    flag: 'is_early_attack',
    name: 'Attacked straight away',
    yes: 'Third-ball attack',
    yesOnTheirServe: 'Attacked their serve',
    instruction: "Includes third-ball attacks from your own serves, and whether or not you attacked your opponent's serves. Tick when you attacked at your first chance: the ball after their receive when you served, or their serve itself when they served. It also counts as attacking first.",
    scope: 'Points past the receive',
    warn: true,
  },
  lucky: {
    flag: 'is_lucky_shot',
    name: 'Lucky shots',
    yes: 'Lucky',
    instruction: 'Tick when the winning shot hit the net or the edge.',
    scope: 'Every point',
    warn: false,
  },
};

export const isSweepTag = (v: unknown): v is SweepTag => SWEEP_TAGS.includes(v as SweepTag);

/** The points a sweep goes through, in match order. */
export const sweepPoints = (tag: SweepTag, rows: PointRow[]): PointRow[] => rows.filter(r => {
  if (r.isServiceFault) return false;
  switch (tag) {
    // Only the player's own count, and there's nothing to miss on a serve nobody touched
    case 'unforced': return r.winner === 'opponent' && r.losingShot !== null;
    // Attacking straight away is already an attack first
    case 'attacked_first': return !r.isEarlyAttack;
    // Points decided by the serve or the receive already show whether the receive was an attack
    case 'early_attack': return r.decidedBy === null;
    case 'lucky': return true;
  }
});

/** Whether a point is ticked for a tag. */
export const isTicked = (tag: SweepTag, r: PointRow): boolean => {
  switch (tag) {
    case 'unforced': return r.isUnforced && !r.isServiceFault;
    case 'attacked_first': return r.isAttackedFirst;
    case 'early_attack': return r.isEarlyAttack;
    case 'lucky': return r.isLucky;
  }
};

/** Ticks that count for a tag: for unforced errors, only the player's own. */
export const tickCount = (tag: SweepTag, rows: PointRow[]): number =>
  rows.filter(r => isTicked(tag, r) && (tag !== 'unforced' || r.winner === 'opponent')).length;

/**
 * The changes to save when a point is answered. Attacking straight away is
 * always an attack first too, and the database insists on it.
 */
export const answerChanges = (tag: SweepTag, yes: boolean): Partial<Record<SweepFlag, boolean>> => {
  if (tag === 'early_attack') return yes ? { is_early_attack: true, is_attacked_first: true } : { is_early_attack: false };
  return { [SWEEPS[tag].flag]: yes };
};

/** Tags the owner should be asked about: ticked, but not confirmed as complete. */
export const unconfirmedTags = (rows: PointRow[], confirmed: string[]): { tag: SweepTag; ticks: number }[] =>
  SWEEP_TAGS
    .filter(tag => SWEEPS[tag].warn && !confirmed.includes(tag))
    .map(tag => ({ tag, ticks: tickCount(tag, rows) }))
    .filter(t => t.ticks > 0);

export type SweepProgress = Partial<Record<SweepTag, string>>;

export type SweepStatus =
  | { kind: 'done'; ticks: number; total: number }
  | { kind: 'stopped'; ticks: number; total: number; at: PointRow }
  | { kind: 'ticked'; ticks: number; total: number }
  | { kind: 'new'; ticks: 0; total: number };

/** Where a match stands on one sweep, for the points editor and the end of a sweep. */
export const sweepStatus = (tag: SweepTag, rows: PointRow[], confirmed: string[], progress: SweepProgress): SweepStatus => {
  const points = sweepPoints(tag, rows);
  const ticks = tickCount(tag, rows);
  const total = points.length;
  const at = points.find(r => r.id === progress[tag]);
  if (at) return { kind: 'stopped', ticks, total, at };
  if (confirmed.includes(tag)) return { kind: 'done', ticks, total };
  if (ticks > 0) return { kind: 'ticked', ticks, total };
  return { kind: 'new', ticks: 0, total };
};

/** The score before a point, player first, from the score after it. */
export const scoreBefore = (r: PointRow): [number, number] =>
  r.winner === 'player' ? [r.playerScore - 1, r.opponentScore] : [r.playerScore, r.opponentScore - 1];
