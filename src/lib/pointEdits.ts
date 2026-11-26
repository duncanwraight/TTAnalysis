/**
 * Editing a point's winner and shots after the match was entered.
 *
 * Changing a winner moves the set score, which can move the end of the set,
 * who served the later points, and the match result. `checkPointEdits` replays
 * the match with the edits applied and says whether it still adds up. In a set
 * that reached 11, changing one winner never does on its own (the set would
 * have ended earlier, or not at all), so the points editor holds such edits
 * until another one makes the set add up again, then saves them together.
 */

import type { AnalysisPoint, AnalysisSet, AnalysisShot } from './analysis.ts';
import { SERVICE_FAULT } from './analysis.ts';
import {
  type SetScore, type Side,
  finishedSets, getServer, isMatchOver, isSetOver, matchScoreString, setLeader, setScoreString,
} from './scoring.ts';

export type Hand = 'fh' | 'bh';

/** Everything about a point the editor can change. */
export type PointEdit = {
  id: string;
  winner: Side;
  winning_shot_id: string;
  winning_hand: Hand;
  other_shot_id: string;
  other_hand: Hand;
  is_unforced_error: boolean;
  is_lucky_shot: boolean;
  is_attacked_first: boolean;
  is_early_attack: boolean;
};

export type EditInput = {
  initialServer: Side;
  bestOf: number;
  // Whether the match is marked complete now
  isComplete: boolean;
  sets: AnalysisSet[];
  // In the order they were entered
  points: AnalysisPoint[];
  shots: Pick<AnalysisShot, 'id' | 'name'>[];
  edits: PointEdit[];
};

export type SetUpdate = { id: string; player_score: number; opponent_score: number; score: string };

export type EditResult =
  | {
      ok: true;
      points: AnalysisPoint[];
      // Sets whose stored score changes
      sets: SetUpdate[];
      match: { match_score: string; is_complete: boolean };
    }
  | { ok: false; problems: string[] };

const sideName = (side: Side) => (side === 'player' ? 'you' : 'your opponent');

/** The edit as it stands for a point, with the flags made consistent with its shots. */
export const normaliseEdit = (edit: PointEdit, shotName: (id: string) => string | undefined): PointEdit => {
  const fault = shotName(edit.winning_shot_id) === SERVICE_FAULT;
  const next = { ...edit };
  if (fault) {
    // A service fault is always unforced, and nobody attacked
    next.is_unforced_error = true;
    next.is_attacked_first = false;
    next.is_early_attack = false;
  }
  if (next.is_early_attack) next.is_attacked_first = true;
  return next;
};

/**
 * Apply edits to a match and check it still adds up: no set finishes before
 * its last point, sets that were finished stay finished with the same winner,
 * the match doesn't end before its last set, and every serve and service fault
 * belongs to whoever served it.
 */
export const checkPointEdits = ({ initialServer, bestOf, isComplete, sets, points, shots, edits }: EditInput): EditResult => {
  const shotName = new Map(shots.map(s => [s.id, s.name]));
  const byId = new Map(edits.map(e => [e.id, e]));
  const edited: AnalysisPoint[] = points.map(p => {
    const e = byId.get(p.id);
    return e ? { ...p, ...e } : p;
  });

  const problems: string[] = [];
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  const lastSetNumber = ordered.length ? ordered[ordered.length - 1].set_number : 0;
  const editedSetIds = new Set(edited.filter(p => byId.has(p.id)).map(p => p.set_id));
  const newScores: SetScore[] = [];
  const setUpdates: SetUpdate[] = [];

  for (const set of ordered) {
    const before = points.filter(p => p.set_id === set.id);
    const after = edited.filter(p => p.set_id === set.id);
    const count = (list: AnalysisPoint[]): SetScore => ({
      playerScore: list.filter(p => p.winner === 'player').length,
      opponentScore: list.filter(p => p.winner === 'opponent').length,
    });
    const oldScore = count(before);
    const newScore = count(after);
    newScores.push(newScore);
    const label = `Set ${set.set_number}`;

    // Who served each point as entered, to spot points whose server moves
    const oldServers: Side[] = [];
    const oldRunning: SetScore = { playerScore: 0, opponentScore: 0 };
    for (const p of before) {
      oldServers.push(getServer(initialServer, set.set_number, oldRunning));
      if (p.winner === 'player') oldRunning.playerScore += 1;
      else oldRunning.opponentScore += 1;
    }

    // Replay the set point by point. Shots are only checked on points that
    // changed or whose server moved, so an odd old point doesn't block an edit.
    const running: SetScore = { playerScore: 0, opponentScore: 0 };
    after.forEach((p, i) => {
      const server = getServer(initialServer, set.set_number, running);
      const check = byId.has(p.id) || oldServers[i] !== server;
      const where = `${label}, point ${i + 1}`;
      const winning = shotName.get(p.winning_shot_id);
      const losing = shotName.get(p.other_shot_id);
      if (check && winning === 'serve' && p.winner !== server) {
        problems.push(`${where}: the winning shot is a serve, but ${sideName(server)} served that point.`);
      }
      if (check && losing === 'serve' && p.winner === server) {
        problems.push(`${where}: the losing shot is a serve, but ${sideName(server)} served that point and won it.`);
      }
      if (check && winning === SERVICE_FAULT && p.winner === server) {
        problems.push(`${where}: a service fault wins the point for the receiver, but ${sideName(server)} served it.`);
      }
      if (p.winner === 'player') running.playerScore += 1;
      else running.opponentScore += 1;
      if (i < after.length - 1 && isSetOver(running)) {
        problems.push(`${label} would be over at ${setScoreString(running)} after point ${i + 1}, but it has ${after.length - i - 1} more after that.`);
      }
    });

    if (after.length > 0) {
      const isLast = set.set_number === lastSetNumber;
      const wasFinished = !isLast || isComplete || isSetOver(oldScore);
      if (wasFinished) {
        if (isSetOver(oldScore) && !isSetOver(newScore)) {
          problems.push(`${label} would end ${setScoreString(newScore)}, which isn't a finished set. It finished ${setScoreString(oldScore)} before.`);
        } else if (setLeader(newScore) === null) {
          problems.push(`${label} would end level at ${setScoreString(newScore)}.`);
        } else if (setLeader(newScore) !== setLeader(oldScore)) {
          problems.push(`${label} would go to ${sideName(setLeader(newScore)!)} instead of ${sideName(setLeader(oldScore)!)}. Changing who won a set isn't possible here.`);
        }
      }
    }

    if (editedSetIds.has(set.id) && (newScore.playerScore !== set.player_score || newScore.opponentScore !== set.opponent_score)) {
      setUpdates.push({ id: set.id, player_score: newScore.playerScore, opponent_score: newScore.opponentScore, score: setScoreString(newScore) });
    }
  }

  // The match can't be decided before its last set
  for (let k = 1; k < newScores.length; k++) {
    const laterHasPoints = ordered.slice(k).some(s => edited.some(p => p.set_id === s.id));
    if (laterHasPoints && isMatchOver(newScores.slice(0, k), bestOf)) {
      problems.push(`The match would be over after set ${k}, but there are points after it.`);
      break;
    }
  }

  if (problems.length > 0) return { ok: false, problems: [...new Set(problems)] };

  const finished = isComplete ? newScores : finishedSets(newScores);
  return {
    ok: true,
    points: edited,
    sets: setUpdates,
    match: { match_score: matchScoreString(finished), is_complete: isComplete || isMatchOver(finished, bestOf) },
  };
};

/** Start an edit from a point as it's stored. */
export const editFromPoint = (p: AnalysisPoint): PointEdit => ({
  id: p.id,
  winner: p.winner,
  winning_shot_id: p.winning_shot_id,
  winning_hand: p.winning_hand ?? 'fh',
  other_shot_id: p.other_shot_id,
  other_hand: p.other_hand ?? 'fh',
  is_unforced_error: !!p.is_unforced_error,
  is_lucky_shot: !!p.is_lucky_shot,
  is_attacked_first: !!p.is_attacked_first,
  is_early_attack: !!p.is_early_attack,
});

/** Whether an edit changes anything about the point. */
export const editChanges = (p: AnalysisPoint, e: PointEdit) => {
  const from = editFromPoint(p);
  return (Object.keys(e) as (keyof PointEdit)[]).some(k => from[k] !== e[k]);
};
