import { useEffect, useRef, useState } from 'react';
import ShotPicker from './tracker/ShotPicker';
import { NO_SHOT, SERVICE_FAULT, UNFORCED_ERROR_DEFINITION, type AnalysisShot } from '../lib/analysis';
import type { PointEdit } from '../lib/pointEdits';
import type { Side } from '../lib/scoring';
import type { ShotInfo } from '../types/database.types';
import '../styles/components/Tracker.css';

type PointEditDialogProps = {
  // "Set 2, point 7"
  title: string;
  // Score before the point, player first
  scoreBefore: string;
  server: Side;
  playerName: string;
  opponentName: string;
  edit: PointEdit;
  shots: AnalysisShot[];
  // Problems with the last save, so the owner can keep the change anyway or cancel
  problems: string[] | null;
  saving: boolean;
  onSave: (edit: PointEdit) => void;
  // Hold the change until another one makes the set add up
  onKeep: (edit: PointEdit) => void;
  onCancel: () => void;
  // Anything changed, so the last problems no longer apply
  onDirty: () => void;
};

/**
 * Change who won a point and its two shots, the same way the tracker enters
 * them. Changing the winner clears the shots, because which serve shots are
 * allowed depends on who won.
 */
const PointEditDialog = ({
  title, scoreBefore, server, playerName, opponentName, edit: initial, shots, problems, saving, onSave, onKeep, onCancel, onDirty,
}: PointEditDialogProps) => {
  const [winner, setWinner] = useState<Side>(initial.winner);
  const [winning, setWinning] = useState<ShotInfo | null>({ shotId: initial.winning_shot_id, hand: initial.winning_hand });
  const [losing, setLosing] = useState<ShotInfo | null>({ shotId: initial.other_shot_id, hand: initial.other_hand });
  const [unforced, setUnforced] = useState(initial.is_unforced_error);
  const [lucky, setLucky] = useState(initial.is_lucky_shot);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  // Clear the problems once the owner changes something, but not on the first render
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onDirty();
  }, [winner, winning, losing, unforced, lucky, onDirty]);

  // Problems arrive under the shot pickers, so bring them into view
  const problemsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (problems) problemsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [problems]);

  const shotName = (id: string | undefined) => shots.find(s => s.id === id)?.name;
  const isFault = shotName(winning?.shotId) === SERVICE_FAULT;
  const noShotId = shots.find(s => s.name === NO_SHOT)?.id;
  const winnerName = winner === 'player' ? playerName : opponentName;
  const loserName = winner === 'player' ? opponentName : playerName;
  const possessive = (name: string) => (name === 'You' ? 'Your' : `${name}'s`);

  const pickWinner = (side: Side) => {
    if (side === winner) return;
    setWinner(side);
    setWinning(null);
    setLosing(null);
    // The unforced tick was about the other player's shot
    setUnforced(false);
  };

  const pickWinning = (shot: ShotInfo) => {
    setWinning(shot);
    if (shotName(shot.shotId) === SERVICE_FAULT && noShotId) {
      setLosing({ shotId: noShotId, hand: 'fh' });
      setUnforced(true);
    } else if (shotName(losing?.shotId) === NO_SHOT) {
      setLosing(null);
    }
  };

  const ready = !!winning && !!losing;
  const current = (): PointEdit | null => winning && losing ? {
    ...initial,
    winner,
    winning_shot_id: winning.shotId,
    winning_hand: winning.hand,
    other_shot_id: losing.shotId,
    other_hand: losing.hand,
    is_unforced_error: unforced,
    is_lucky_shot: lucky,
  } : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const edit = current();
    if (edit) onSave(edit);
  };

  return (
    <div className="dialog-backdrop">
      <form className="card dialog wide pe-edit" role="dialog" aria-modal="true" aria-labelledby="pe-edit-title" onSubmit={submit}>
        <div>
          <h2 id="pe-edit-title">Edit {title.toLowerCase()}</h2>
          <p className="muted">
            {scoreBefore} before the point, {server === 'player' ? (playerName === 'You' ? 'you' : playerName) : opponentName} serving.
          </p>
        </div>

        <fieldset className="pe-edit-winner">
          <legend>Who won the point</legend>
          <div className="segmented">
            <button type="button" aria-pressed={winner === 'player'} onClick={() => pickWinner('player')} disabled={saving}>{playerName}</button>
            <button type="button" aria-pressed={winner === 'opponent'} onClick={() => pickWinner('opponent')} disabled={saving}>{opponentName}</button>
          </div>
          {winner !== initial.winner && (
            <span className="field-hint">Changing the winner changes the score of every point after this one in the set.</span>
          )}
        </fieldset>

        <div className="point-flags">
          <button type="button" className="toggle" aria-pressed={lucky} onClick={() => setLucky(v => !v)} disabled={saving}>
            Lucky <span className="faint">net or edge</span>
          </button>
          <button type="button" className="toggle" aria-pressed={unforced} onClick={() => setUnforced(v => !v)} disabled={saving || isFault} title={UNFORCED_ERROR_DEFINITION}>
            Unforced error <span className="faint">losing shot</span>
          </button>
        </div>

        <div className="shot-columns">
          <div className="shot-column">
            <h3>{possessive(winnerName)} winning shot</h3>
            <ShotPicker
              id="edit-winning-shot"
              title={`${possessive(winnerName)} winning shot`}
              selected={winning}
              onSelect={pickWinning}
              sideServed={winner === server}
              disabled={saving}
              rememberCategory={false}
            />
          </div>
          <div className={`shot-column${isFault ? ' is-waiting' : ''}`}>
            <h3>{possessive(loserName)} losing shot</h3>
            {isFault ? (
              <p className="muted">A service fault has no losing shot.</p>
            ) : (
              <ShotPicker
                id="edit-losing-shot"
                title={`${possessive(loserName)} losing shot`}
                selected={losing}
                onSelect={setLosing}
                sideServed={winner !== server}
                disabled={saving}
                rememberCategory={false}
              />
            )}
          </div>
        </div>

        {problems && (
          <div className="notice error" role="alert" ref={problemsRef}>
            <p><strong>The match wouldn't add up with this change:</strong></p>
            <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
            <p>
              If another point was entered wrongly too, keep this change and edit that point next. Nothing is saved until the
              match adds up again.
            </p>
          </div>
        )}

        <div className="form-actions pe-edit-foot">
          <span className="field-hint">{ready ? '' : 'Pick both shots to save.'}</span>
          <div className="page-head-actions">
            <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
            {problems && (
              <button type="button" className="btn" onClick={() => { const e = current(); if (e) onKeep(e); }} disabled={saving || !ready}>
                Keep and edit another point
              </button>
            )}
            <button type="submit" className="btn primary" disabled={saving || !ready}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PointEditDialog;
