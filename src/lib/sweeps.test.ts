import { describe, expect, it } from 'vitest';
import type { PointRow } from './analysis';
import { answerChanges, sweepPoints, tickCount, unconfirmedTags } from './sweeps';

let nextId = 0;
const row = (r: Partial<PointRow>): PointRow => ({
  id: `p${nextId++}`, setNumber: 1, number: 1, server: 'player', winner: 'player',
  playerScore: 1, opponentScore: 0, winningShot: 'Loop FH', losingShot: 'Push BH',
  isServiceFault: false, isLucky: false, isUnforced: false, isAttackedFirst: false, isThirdBall: false,
  decidedBy: null, ...r,
});

describe('sweep points', () => {
  const fault = row({ winner: 'opponent', isServiceFault: true, isUnforced: true, winningShot: null, losingShot: 'Service fault' });
  const lost = row({ winner: 'opponent' });
  const ace = row({ winner: 'player', losingShot: null, decidedBy: 'serve' });
  const notTouched = row({ winner: 'opponent', server: 'opponent', losingShot: null, decidedBy: 'serve' });
  const theirServe = row({ server: 'opponent' });
  const thirdBall = row({ isAttackedFirst: true, isThirdBall: true });
  const rows = [fault, lost, ace, notTouched, theirServe, thirdBall];

  it('leaves service faults out of every sweep', () => {
    for (const tag of ['unforced', 'attacked_first', 'third_ball', 'lucky'] as const) {
      expect(sweepPoints(tag, rows)).not.toContain(fault);
    }
  });

  it('only asks about unforced errors on points the player lost with a shot', () => {
    expect(sweepPoints('unforced', rows)).toEqual([lost]);
  });

  it('only asks about the third ball on the player\'s serves past the receive', () => {
    expect(sweepPoints('third_ball', rows)).toEqual([lost, thirdBall]);
  });

  it('skips third-ball attacks in the attacked-first sweep', () => {
    expect(sweepPoints('attacked_first', rows)).toEqual([lost, ace, notTouched, theirServe]);
  });
});

describe('ticks', () => {
  it('counts only the player\'s own unforced errors, not service faults', () => {
    const rows = [
      row({ winner: 'opponent', isUnforced: true }),
      row({ winner: 'player', isUnforced: true }),
      row({ winner: 'opponent', isServiceFault: true, isUnforced: true }),
    ];
    expect(tickCount('unforced', rows)).toBe(1);
  });

  it('asks about ticked tags that are not confirmed, and never about lucky shots', () => {
    const rows = [row({ isAttackedFirst: true, isLucky: true }), row({ winner: 'opponent', isUnforced: true })];
    expect(unconfirmedTags(rows, ['unforced'])).toEqual([{ tag: 'attacked_first', ticks: 1 }]);
  });

  it('ticks attacked first along with a third-ball attack', () => {
    expect(answerChanges('third_ball', true)).toEqual({ is_third_ball_attack: true, is_attacked_first: true });
    expect(answerChanges('third_ball', false)).toEqual({ is_third_ball_attack: false });
    expect(answerChanges('attacked_first', false)).toEqual({ is_attacked_first: false });
  });
});
