import { describe, expect, it } from 'vitest';
import type { MatchSet, Point } from '../types/database.types';
import {
  SetScore,
  Side,
  buildMatchState,
  countSetsWon,
  finishedSets,
  getServer,
  isMatchOver,
  isSetOver,
  lastActionWasEndSet,
  matchScoreString,
  setLeader,
  setScoreString,
  setsNeededToWin,
} from './scoring';

const s = (playerScore: number, opponentScore: number): SetScore => ({ playerScore, opponentScore });

const row = (setNumber: number, playerScore: number, opponentScore: number): MatchSet => ({
  id: `set-${setNumber}`,
  match_id: 'match',
  set_number: setNumber,
  score: `${playerScore}-${opponentScore}`,
  player_score: playerScore,
  opponent_score: opponentScore,
  created_at: '',
  updated_at: '',
});

const NO_POINTS: Point[] = [];

describe('isSetOver', () => {
  it.each([
    [11, 0, true],
    [11, 9, true],
    [9, 11, true],
    [11, 10, false],
    [10, 11, false],
    [10, 10, false],
    [12, 10, true],
    [10, 12, true],
    [15, 13, true],
    [14, 13, false],
    [8, 5, false],
    [0, 0, false],
  ])('%i-%i is over: %s', (p, o, expected) => {
    expect(isSetOver(s(p, o))).toBe(expected);
  });
});

describe('setLeader', () => {
  it('returns the side ahead', () => {
    expect(setLeader(s(8, 5))).toBe('player');
    expect(setLeader(s(5, 8))).toBe('opponent');
  });

  it('returns null on a tie', () => {
    expect(setLeader(s(0, 0))).toBeNull();
    expect(setLeader(s(7, 7))).toBeNull();
  });
});

describe('countSetsWon', () => {
  it('counts each side, including sets ended early', () => {
    expect(countSetsWon([s(11, 5), s(9, 11), s(8, 5)])).toEqual({ player: 2, opponent: 1 });
  });

  it('counts nothing for no sets', () => {
    expect(countSetsWon([])).toEqual({ player: 0, opponent: 0 });
  });
});

describe('setsNeededToWin', () => {
  it.each([
    [1, 1],
    [3, 2],
    [5, 3],
    [7, 4],
  ])('best of %i needs %i', (bestOf, needed) => {
    expect(setsNeededToWin(bestOf)).toBe(needed);
  });
});

describe('finishedSets', () => {
  it('is empty with no sets', () => {
    expect(finishedSets([])).toEqual([]);
  });

  it('leaves out a set in progress', () => {
    expect(finishedSets([s(11, 5), s(4, 3)])).toEqual([s(11, 5)]);
  });

  it('leaves out an empty next set', () => {
    expect(finishedSets([s(11, 5), s(0, 0)])).toEqual([s(11, 5)]);
  });

  it('includes the last set once it is over', () => {
    expect(finishedSets([s(11, 5), s(12, 10)])).toEqual([s(11, 5), s(12, 10)]);
  });

  it('counts an earlier set ended early with End Set', () => {
    expect(finishedSets([s(8, 5), s(0, 0)])).toEqual([s(8, 5)]);
  });
});

describe('isMatchOver', () => {
  it('best of 1 ends after one set', () => {
    expect(isMatchOver([s(11, 7)], 1)).toBe(true);
    expect(isMatchOver([s(7, 11)], 1)).toBe(true);
    expect(isMatchOver([], 1)).toBe(false);
  });

  it('best of 3 ends at 2 sets', () => {
    expect(isMatchOver([s(11, 7)], 3)).toBe(false);
    expect(isMatchOver([s(11, 7), s(7, 11)], 3)).toBe(false);
    expect(isMatchOver([s(11, 7), s(11, 9)], 3)).toBe(true);
    expect(isMatchOver([s(11, 7), s(7, 11), s(9, 11)], 3)).toBe(true);
  });

  it('best of 5 ends at 3 sets', () => {
    expect(isMatchOver([s(11, 7), s(11, 7)], 5)).toBe(false);
    expect(isMatchOver([s(11, 7), s(11, 7), s(11, 7)], 5)).toBe(true);
    expect(isMatchOver([s(11, 7), s(7, 11), s(11, 7), s(7, 11)], 5)).toBe(false);
    expect(isMatchOver([s(11, 7), s(7, 11), s(11, 7), s(7, 11), s(14, 12)], 5)).toBe(true);
  });

  it('best of 7 ends at 4 sets', () => {
    const three = [s(11, 1), s(11, 1), s(11, 1)];
    expect(isMatchOver(three, 7)).toBe(false);
    expect(isMatchOver([...three, s(11, 1)], 7)).toBe(true);
    expect(isMatchOver([s(1, 11), s(1, 11), s(1, 11), s(1, 11)], 7)).toBe(true);
  });

  it('counts a set ended early with End Set towards the result', () => {
    expect(isMatchOver([s(11, 7), s(11, 7), s(8, 5)], 5)).toBe(true);
    expect(isMatchOver([s(8, 5)], 1)).toBe(true);
    expect(isMatchOver([s(11, 7), s(5, 8)], 3)).toBe(false);
  });
});

describe('matchScoreString', () => {
  it('formats sets won as player-opponent', () => {
    expect(matchScoreString([s(11, 7), s(9, 11), s(11, 3)])).toBe('2-1');
    expect(matchScoreString([])).toBe('0-0');
  });

  it('counts a set ended with End Set once, before and after a reload', () => {
    // At the moment End Set is pressed: every set counts, the current one included
    const atEndSet = [s(11, 7), s(8, 5)];
    expect(matchScoreString(atEndSet)).toBe('2-0');

    // After End Set the tracker holds an empty next set, which must not count
    // and must not cause the ended set to be counted twice
    const afterEndSet = [...atEndSet, s(0, 0)];
    expect(matchScoreString(finishedSets(afterEndSet))).toBe('2-0');

    // After the first point of the next set
    expect(matchScoreString(finishedSets([...atEndSet, s(1, 0)]))).toBe('2-0');
  });
});

describe('setScoreString', () => {
  it('formats player-opponent', () => {
    expect(setScoreString(s(11, 9))).toBe('11-9');
    expect(setScoreString(s(0, 0))).toBe('0-0');
  });
});

describe('getServer', () => {
  // The server for each point of a set before deuce, starting from 0-0
  const serversFor = (first: Side, setNumber: number, points: number) =>
    Array.from({ length: points }, (_, i) => getServer(first, setNumber, s(i, 0)));

  it('changes server every 2 points', () => {
    expect(serversFor('player', 1, 8)).toEqual([
      'player', 'player', 'opponent', 'opponent', 'player', 'player', 'opponent', 'opponent',
    ]);
  });

  it('depends only on total points, not who won them', () => {
    expect(getServer('player', 1, s(2, 0))).toBe('opponent');
    expect(getServer('player', 1, s(0, 2))).toBe('opponent');
    expect(getServer('player', 1, s(1, 1))).toBe('opponent');
    expect(getServer('player', 1, s(3, 1))).toBe('player');
  });

  it('gives the 10-10 serve to whoever served first in the set', () => {
    expect(getServer('player', 1, s(10, 10))).toBe('player');
    expect(getServer('opponent', 1, s(10, 10))).toBe('opponent');
  });

  it('changes every point from 10-10', () => {
    expect(getServer('player', 1, s(10, 10))).toBe('player');
    expect(getServer('player', 1, s(11, 10))).toBe('opponent');
    expect(getServer('player', 1, s(11, 11))).toBe('player');
    expect(getServer('player', 1, s(12, 11))).toBe('opponent');
    expect(getServer('player', 1, s(12, 12))).toBe('player');
    expect(getServer('player', 1, s(14, 15))).toBe('opponent');
  });

  it('does not treat 10-9 or 9-10 as deuce', () => {
    // 19 points played: 9 changes, so the second server is serving
    expect(getServer('player', 1, s(10, 9))).toBe('opponent');
    expect(getServer('player', 1, s(9, 10))).toBe('opponent');
  });

  it('gives the first serve of each set to the other player', () => {
    expect(getServer('player', 1, s(0, 0))).toBe('player');
    expect(getServer('player', 2, s(0, 0))).toBe('opponent');
    expect(getServer('player', 3, s(0, 0))).toBe('player');
    expect(getServer('player', 4, s(0, 0))).toBe('opponent');
    expect(getServer('player', 5, s(0, 0))).toBe('player');
  });

  it('gives the player sets 2 and 4 when the opponent served first', () => {
    expect(getServer('opponent', 1, s(0, 0))).toBe('opponent');
    expect(getServer('opponent', 2, s(0, 0))).toBe('player');
    expect(getServer('opponent', 3, s(0, 0))).toBe('opponent');
    expect(getServer('opponent', 4, s(0, 0))).toBe('player');
    expect(serversFor('opponent', 2, 4)).toEqual(['player', 'player', 'opponent', 'opponent']);
  });
});

describe('buildMatchState', () => {
  it('starts set 1 with no set rows', () => {
    const state = buildMatchState([], NO_POINTS, 5, false);
    expect(state).toMatchObject({ currentSet: 1, sets: [s(0, 0)], isMatchComplete: false, currentSetId: null });
  });

  it('carries on the last set when it is in progress', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 4, 6)], NO_POINTS, 5, false);
    expect(state).toMatchObject({ currentSet: 2, sets: [s(11, 5), s(4, 6)], isMatchComplete: false, currentSetId: 'set-2' });
  });

  it('starts the next set when the last set is over and the match is not', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 9, 11)], NO_POINTS, 5, false);
    expect(state).toMatchObject({
      currentSet: 3,
      sets: [s(11, 5), s(9, 11), s(0, 0)],
      isMatchComplete: false,
      currentSetId: null,
    });
  });

  it('sorts set rows by set number', () => {
    const state = buildMatchState([row(2, 3, 1), row(1, 11, 5)], NO_POINTS, 5, false);
    expect(state.sets).toEqual([s(11, 5), s(3, 1)]);
    expect(state.dbSets.map(r => r.set_number)).toEqual([1, 2]);
  });

  it('is complete when a side has won enough sets', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 11, 5), row(3, 11, 5)], NO_POINTS, 5, false);
    expect(state).toMatchObject({ currentSet: 3, isMatchComplete: true, currentSetId: 'set-3' });
    expect(state.sets).toHaveLength(3);
  });

  it('is complete when best of 3 reaches 2 sets', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 11, 5)], NO_POINTS, 3, false);
    expect(state).toMatchObject({ currentSet: 2, isMatchComplete: true });
  });

  it('resumes on the empty set End Set created', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 8, 5), row(3, 0, 0)], NO_POINTS, 5, false);
    expect(state).toMatchObject({ currentSet: 3, isMatchComplete: false, currentSetId: 'set-3' });
    expect(matchScoreString(finishedSets(state.sets))).toBe('2-0');
  });

  it('stays complete when the match was marked complete on an unfinished set', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 11, 5), row(3, 8, 5)], NO_POINTS, 5, true);
    expect(state).toMatchObject({ currentSet: 3, isMatchComplete: true, currentSetId: 'set-3' });
  });

  it('reopens an unfinished last set when not marked complete', () => {
    const state = buildMatchState([row(1, 11, 5), row(2, 11, 5), row(3, 8, 5)], NO_POINTS, 5, false);
    expect(state).toMatchObject({ currentSet: 3, isMatchComplete: false, currentSetId: 'set-3' });
  });
});

describe('lastActionWasEndSet', () => {
  it('is false at the start of a match', () => {
    expect(lastActionWasEndSet([s(0, 0)], false)).toBe(false);
    expect(lastActionWasEndSet([], false)).toBe(false);
  });

  it('is false during a set', () => {
    expect(lastActionWasEndSet([s(11, 5), s(3, 2)], false)).toBe(false);
  });

  it('is false at the start of a set that followed a normal win', () => {
    expect(lastActionWasEndSet([s(11, 5), s(0, 0)], false)).toBe(false);
    expect(lastActionWasEndSet([s(13, 11), s(0, 0)], false)).toBe(false);
  });

  it('is true at the start of a set that followed End Set', () => {
    expect(lastActionWasEndSet([s(11, 5), s(8, 5), s(0, 0)], false)).toBe(true);
    expect(lastActionWasEndSet([s(5, 8), s(0, 0)], false)).toBe(true);
  });

  it('is false once a point has been played in the set after End Set', () => {
    expect(lastActionWasEndSet([s(8, 5), s(1, 0)], false)).toBe(false);
  });

  it('is true when End Set finished the match', () => {
    expect(lastActionWasEndSet([s(11, 5), s(11, 5), s(8, 5)], true)).toBe(true);
  });

  it('is false when the match finished on a normal win', () => {
    expect(lastActionWasEndSet([s(11, 5), s(11, 5), s(11, 5)], true)).toBe(false);
    expect(lastActionWasEndSet([s(8, 5), s(11, 5), s(11, 5)], true)).toBe(false);
  });
});
