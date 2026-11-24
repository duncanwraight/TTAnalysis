/**
 * Table tennis scoring rules, kept free of React and Supabase so the tracker
 * can rely on one implementation.
 */

import type { MatchSet, Point } from '../types/database.types';

export type Side = 'player' | 'opponent';

export type SetScore = {
  playerScore: number;
  opponentScore: number;
};

export const POINTS_TO_WIN_SET = 11;
export const MIN_SET_MARGIN = 2;
export const DEFAULT_BEST_OF = 5;

export const EMPTY_SET: SetScore = { playerScore: 0, opponentScore: 0 };

export const otherSide = (side: Side): Side => (side === 'player' ? 'opponent' : 'player');

/** A set is over at 11+ points with a lead of at least 2. */
export const isSetOver = ({ playerScore, opponentScore }: SetScore): boolean =>
  (playerScore >= POINTS_TO_WIN_SET || opponentScore >= POINTS_TO_WIN_SET) &&
  Math.abs(playerScore - opponentScore) >= MIN_SET_MARGIN;

/** The side with more points, or null on a tie. */
export const setLeader = ({ playerScore, opponentScore }: SetScore): Side | null => {
  if (playerScore > opponentScore) return 'player';
  if (opponentScore > playerScore) return 'opponent';
  return null;
};

/** Sets won by each side, counting only the sets passed in. */
export const countSetsWon = (finishedSets: SetScore[]) => ({
  player: finishedSets.filter(s => setLeader(s) === 'player').length,
  opponent: finishedSets.filter(s => setLeader(s) === 'opponent').length,
});

export const setsNeededToWin = (bestOf: number) => Math.floor(bestOf / 2) + 1;

/**
 * Sets that are finished: every set before the last one (the tracker only moves
 * on once a set is done or ended manually), plus the last one if it's over.
 */
export const finishedSets = (sets: SetScore[]): SetScore[] => {
  if (sets.length === 0) return [];
  const last = sets[sets.length - 1];
  return isSetOver(last) ? sets : sets.slice(0, -1);
};

export const isMatchOver = (finished: SetScore[], bestOf: number): boolean => {
  const won = countSetsWon(finished);
  const needed = setsNeededToWin(bestOf);
  return won.player >= needed || won.opponent >= needed;
};

export const matchScoreString = (finished: SetScore[]): string => {
  const won = countSetsWon(finished);
  return `${won.player}-${won.opponent}`;
};

export const setScoreString = ({ playerScore, opponentScore }: SetScore) =>
  `${playerScore}-${opponentScore}`;

/**
 * Who serves next. Serve alternates between sets, changes every 2 points, and
 * changes every point once the set reaches 10-10.
 */
export const getServer = (matchInitialServer: Side, setNumber: number, score: SetScore): Side => {
  const setInitialServer = setNumber % 2 === 1 ? matchInitialServer : otherSide(matchInitialServer);
  const totalPoints = score.playerScore + score.opponentScore;
  const isDeuce = score.playerScore >= 10 && score.opponentScore >= 10;
  // Before deuce the serve changes every 2 points. At 10-10 (20 points) that
  // count is even, so continuing every point from there lines up.
  const changes = isDeuce ? 10 + (totalPoints - 20) : Math.floor(totalPoints / 2);
  return changes % 2 === 0 ? setInitialServer : otherSide(setInitialServer);
};

export type MatchState = {
  currentSet: number;
  sets: SetScore[];
  points: Point[];
  isMatchComplete: boolean;
  // Database rows for the sets that exist so far, ordered by set_number
  dbSets: MatchSet[];
  // ID of the current set's row, or null if it hasn't been created yet
  currentSetId: string | null;
};

/**
 * Build tracker state from what's in the database. Set rows hold the scores;
 * the current set is the last row unless that set is over, in which case the
 * next set starts (its row is created when its first point is recorded).
 */
export const buildMatchState = (
  dbSetsIn: MatchSet[],
  points: Point[],
  bestOf: number,
  markedComplete: boolean
): MatchState => {
  const dbSets = [...dbSetsIn].sort((a, b) => a.set_number - b.set_number);

  if (dbSets.length === 0) {
    return {
      currentSet: 1,
      sets: [{ ...EMPTY_SET }],
      points,
      isMatchComplete: false,
      dbSets: [],
      currentSetId: null,
    };
  }

  const sets: SetScore[] = dbSets.map(s => ({ playerScore: s.player_score, opponentScore: s.opponent_score }));
  const last = dbSets[dbSets.length - 1];
  const isMatchComplete = markedComplete || isMatchOver(finishedSets(sets), bestOf);

  if (!isMatchComplete && isSetOver(sets[sets.length - 1])) {
    return {
      currentSet: last.set_number + 1,
      sets: [...sets, { ...EMPTY_SET }],
      points,
      isMatchComplete,
      dbSets,
      currentSetId: null,
    };
  }

  return {
    currentSet: last.set_number,
    sets,
    points,
    isMatchComplete,
    dbSets,
    currentSetId: last.id,
  };
};

/**
 * Whether Undo should reverse an End Set rather than remove a point. That's the
 * case when the most recent set finished without reaching a winning score:
 * either the match is complete on a set that isn't over, or the current set is
 * empty and the one before it isn't over.
 */
export const lastActionWasEndSet = (sets: SetScore[], isMatchComplete: boolean): boolean => {
  const last = sets[sets.length - 1];
  if (!last) return false;
  if (isMatchComplete) return !isSetOver(last);
  if (sets.length < 2) return false;
  const previous = sets[sets.length - 2];
  return last.playerScore + last.opponentScore === 0 && !isSetOver(previous);
};
