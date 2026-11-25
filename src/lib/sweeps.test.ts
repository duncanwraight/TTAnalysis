import { describe, expect, it } from 'vitest';
import type { PointRow } from './analysis';
import { answerChanges, sweepPoints, tickCount, unconfirmedTags } from './sweeps';

let nextId = 0;
const row = (r: Partial<PointRow>): PointRow => ({
  id: `p${nextId++}`, setNumber: 1, number: 1, server: 'player', winner: 'player',
  playerScore: 1, opponentScore: 0, winningShot: 'Loop FH', losingShot: 'Push BH',
  isServiceFault: false, isLucky: false, isUnforced: false, isAttackedFirst: false, isEarlyAttack: false,
  decidedBy: null, ...r,
});

describe('sweep points', () => {
  const fault = row({ winner: 'opponent', isServiceFault: true, isUnforced: true, winningShot: null, losingShot: 'Service fault' });
  const lost = row({ winner: 'opponent' });
  const ace = row({ winner: 'player', losingShot: null, decidedBy: 'serve' });
  const notTouched = row({ winner: 'opponent', server: 'opponent', losingShot: null, decidedBy: 'serve' });
  const theirServe = row({ server: 'opponent' });
  const earlyAttack = row({ isAttackedFirst: true, isEarlyAttack: true });
  const rows = [fault, lost, ace, notTouched, theirServe, earlyAttack];

  it('leaves service faults out of every sweep', () => {
    for (const tag of ['unforced', 'attacked_first', 'early_attack', 'lucky'] as const) {
      expect(sweepPoints(tag, rows)).not.toContain(fault);
    }
  });

  it('only asks about unforced errors on points the player lost with a shot', () => {
    expect(sweepPoints('unforced', rows)).toEqual([lost]);
  });

  it('only asks about attacking straight away on points past the receive, on either serve', () => {
    expect(sweepPoints('early_attack', rows)).toEqual([lost, theirServe, earlyAttack]);
  });

  it('skips attacks straight away in the attacked-first sweep', () => {
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

  it('ticks attacked first along with attacking straight away', () => {
    expect(answerChanges('early_attack', true)).toEqual({ is_early_attack: true, is_attacked_first: true });
    expect(answerChanges('early_attack', false)).toEqual({ is_early_attack: false });
    expect(answerChanges('attacked_first', false)).toEqual({ is_attacked_first: false });
  });
});
