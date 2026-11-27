import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import type { AnalysisData, MatchDetails } from '../lib/api';
import { MAX_EVENT, MAX_VIDEO_URL, cleanText, validateDetails } from '../lib/matchDetails';
import MatchStyles from '../components/MatchStyles';
import { kitColumns, opponentKit, playerKit, type Kit, type Player, type PlayStyle } from '../lib/styles';
import { buildAnalysis, type PointRow } from '../lib/analysis';
import { SWEEPS, SWEEP_TAGS, answerChanges, isTicked, scoreBefore, sweepPoints, sweepStatus, type SweepProgress, type SweepTag } from '../lib/sweeps';
import { checkPointEdits, editChanges, editFromPoint, normaliseEdit, type PointEdit } from '../lib/pointEdits';
import PointEditDialog from '../components/PointEditDialog';
import { DEFAULT_BEST_OF } from '../lib/scoring';
import '../styles/components/MatchAnalysis.css';
import '../styles/sweep.css';
import HelpLink from '../components/HelpLink';

type DetailsForm = {
  player_id: string; player_name: string; opponent_name: string; date: string; event: string; video_url: string;
  player: Kit; opponent: Kit;
};

const toForm = (m: AnalysisData['match']): DetailsForm => ({
  player_id: m.player_id ?? '',
  player: playerKit(m),
  opponent: opponentKit(m),
  player_name: m.player_name ?? '',
  opponent_name: m.opponent_name,
  date: m.date,
  event: m.event ?? '',
  video_url: m.video_url ?? '',
});

// Replace edits for the same point, keeping the order they were made in
const mergeEdits = (into: PointEdit[], edits: PointEdit[]) =>
  [...into.filter(e => !edits.some(n => n.id === e.id)), ...edits];

/**
 * Review a recorded match point by point and tick the lucky and unforced
 * flags. Each tick saves straight away. A point's winner and shots are edited
 * in a dialog; a change that leaves the match not adding up is held as pending
 * until another one fixes it, and then they save together.
 */
const PointsEditor = () => {
  const { id } = useParams<{ id: string }>();
  const api = useApi();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setFilter, setSetFilter] = useState(0);
  const [onlyLost, setOnlyLost] = useState(false);
  const [saving, setSaving] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsForm | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ kind: 'idle' });
  const [players, setPlayers] = useState<Player[]>([]);
  // Editing winners and shots
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [pending, setPending] = useState<PointEdit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProblems, setEditProblems] = useState<string[] | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const styles: PlayStyle[] = data?.styles.styles ?? [];

  useEffect(() => {
    if (!id) return;
    api.player.getPlayers()
      .then(setPlayers)
      .catch(err => console.error('Failed to load players:', err));
    api.match.getIsComplete(id)
      .then(setIsComplete)
      .catch(err => console.error('Failed to load the match result:', err));
    api.match.getAnalysis(id)
      .then(loaded => {
        setData(loaded);
        setDetails(toForm(loaded.match));
      })
      .catch(err => {
        console.error('Failed to load points:', err);
        setError('Failed to load this match.');
      });
  }, [id, api]);

  // The points with any pending edits applied, so the table shows them
  const shownPoints = useMemo(() => {
    if (!data) return null;
    const byId = new Map(pending.map(e => [e.id, e]));
    return data.points.map(p => {
      const e = byId.get(p.id);
      return e ? { ...p, ...e } : p;
    });
  }, [data, pending]);

  const analysis = useMemo(() => data && shownPoints && buildAnalysis({
    initialServer: data.match.initial_server ?? 'player',
    sets: data.sets,
    points: shownPoints,
    shots: data.shots,
    confirmed: data.match.confirmed_tags ?? [],
  }), [data, shownPoints]);

  const checkEdits = useCallback((edits: PointEdit[]) => data && isComplete !== null ? checkPointEdits({
    initialServer: data.match.initial_server ?? 'player',
    bestOf: data.match.best_of || DEFAULT_BEST_OF,
    isComplete,
    sets: data.sets,
    points: data.points,
    shots: data.shots,
    edits,
  }) : null, [data, isComplete]);

  const pendingCheck = useMemo(() => (pending.length ? checkEdits(pending) : null), [pending, checkEdits]);

  // Make each edit's flags fit its shots, and drop "attacked straight away"
  // from a point that no longer goes past the receive
  const prepare = (edits: PointEdit[]): PointEdit[] => {
    if (!data) return edits;
    const name = (shotId: string) => data.shots.find(s => s.id === shotId)?.name;
    let ready = edits.map(e => normaliseEdit(e, name));
    const byId = new Map(ready.map(e => [e.id, e]));
    const rows = buildAnalysis({
      initialServer: data.match.initial_server ?? 'player',
      sets: data.sets,
      points: data.points.map(p => (byId.has(p.id) ? { ...p, ...byId.get(p.id) } : p)),
      shots: data.shots,
    }).rows;
    const inScope = new Set(sweepPoints('early_attack', rows).map(r => r.id));
    ready = ready.map(e => (e.is_early_attack && !inScope.has(e.id) ? { ...e, is_early_attack: false } : e));
    // An edit that puts the point back as it was isn't a change
    return ready.filter(e => {
      const original = data.points.find(p => p.id === e.id);
      return original && editChanges(original, e);
    });
  };

  // Save edits with whatever is pending. Returns the problems if the match wouldn't add up.
  const saveEdits = async (edits: PointEdit[]): Promise<string[] | null> => {
    if (!data) return null;
    const all = prepare(mergeEdits(pending, edits));
    if (all.length === 0) {
      setPending([]);
      return null;
    }
    const check = checkEdits(all);
    if (!check) return ['The match is still loading. Try again in a moment.'];
    if (!check.ok) return check.problems;
    await api.point.editPoints(data.match.id, all, check.sets, check.match);
    setData(prev => prev && {
      ...prev,
      points: check.points,
      sets: prev.sets.map(s => {
        const u = check.sets.find(x => x.id === s.id);
        return u ? { ...s, player_score: u.player_score, opponent_score: u.opponent_score } : s;
      }),
    });
    setIsComplete(check.match.is_complete);
    setPending([]);
    return null;
  };

  const saveFromDialog = async (edit: PointEdit) => {
    setEditSaving(true);
    setEditProblems(null);
    try {
      const problems = await saveEdits([edit]);
      if (problems) setEditProblems(problems);
      else setEditingId(null);
    } catch (err) {
      console.error('Failed to save the point:', err);
      setEditProblems(['The change did not save. Check your connection and try again.']);
    } finally {
      setEditSaving(false);
    }
  };

  const keepFromDialog = (edit: PointEdit) => {
    setPending(prev => prepare(mergeEdits(prev, [edit])));
    setEditingId(null);
    setEditProblems(null);
  };

  const savePending = async () => {
    setEditSaving(true);
    setPendingError(null);
    try {
      const problems = await saveEdits([]);
      if (problems) setPendingError('The match still doesn\'t add up, so nothing was saved.');
    } catch (err) {
      console.error('Failed to save the changes:', err);
      setPendingError('The changes did not save. Check your connection and try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const closeDialog = useCallback(() => {
    setEditingId(null);
    setEditProblems(null);
  }, []);
  const clearProblems = useCallback(() => setEditProblems(null), []);

  const toggle = async (row: PointRow, tag: SweepTag) => {
    if (!data) return;
    const point = data.points.find(p => p.id === row.id);
    if (!point) return;
    const changes = answerChanges(tag, !isTicked(tag, row));
    const setValues = (values: object) => setData(prev => prev && {
      ...prev,
      points: prev.points.map(p => (p.id === row.id ? { ...p, ...values } : p)),
    });

    // Show the change at once, and put it back if the save fails
    setValues(changes);
    setSaving(n => n + 1);
    setSaveError(null);
    try {
      await api.point.updatePoint(row.id, changes);
    } catch (err) {
      console.error('Failed to save point:', err);
      setValues(point);
      setSaveError('Could not save that change. Check your connection and try again.');
    } finally {
      setSaving(n => n - 1);
    }
  };

  // "That's all of them": the ticks for a tag are complete without a sweep
  const confirmTag = async (tag: SweepTag) => {
    if (!data) return;
    const before = data.match.confirmed_tags ?? [];
    const confirmed = [...new Set([...before, tag])];
    const setConfirmed = (tags: string[]) => setData(prev => prev && { ...prev, match: { ...prev.match, confirmed_tags: tags } });
    setConfirmed(confirmed);
    setSaving(n => n + 1);
    setSaveError(null);
    try {
      await api.match.updateMatch(data.match.id, { confirmed_tags: confirmed });
    } catch (err) {
      console.error('Failed to confirm the ticks:', err);
      setConfirmed(before);
      setSaveError('Could not save that change. Check your connection and try again.');
    } finally {
      setSaving(n => n - 1);
    }
  };

  const changeDetail = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDetails(prev => prev && { ...prev, [name]: value });
    setDetailsStatus({ kind: 'idle' });
  };

  const changeKit = (side: 'player' | 'opponent') => (kit: Kit) => {
    setDetails(prev => prev && { ...prev, [side]: kit });
    setDetailsStatus({ kind: 'idle' });
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !details) return;
    const problem = validateDetails(details);
    if (problem) {
      setDetailsStatus({ kind: 'error', message: problem });
      return;
    }
    const chosen = players.find(p => p.id === details.player_id);
    const changes: MatchDetails = {
      // A match from before players keeps its name until a player is chosen
      player_id: chosen?.id ?? data.match.player_id ?? null,
      player_name: chosen?.name ?? cleanText(details.player_name),
      ...kitColumns('player', details.player),
      ...kitColumns('opponent', details.opponent),
      opponent_name: details.opponent_name.trim(),
      date: details.date,
      event: cleanText(details.event),
      video_url: cleanText(details.video_url),
    };
    setDetailsStatus({ kind: 'saving' });
    try {
      await api.match.updateMatch(data.match.id, changes);
      setData(prev => prev && { ...prev, match: { ...prev.match, ...changes } });
      setDetails(toForm({ ...data.match, ...changes }));
      setDetailsStatus({ kind: 'saved' });
    } catch (err) {
      console.error('Failed to save match details:', err);
      setDetailsStatus({ kind: 'error', message: 'Could not save the details. Please try again.' });
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="state">
          <h2>The points did not load</h2>
          <p>{error}</p>
          <div className="form-actions"><Link to="/matches" className="btn primary">Back to matches</Link></div>
        </div>
      </Layout>
    );
  }

  if (!data || !analysis || !details) {
    return <Layout><div className="state" role="status"><p>Loading the points...</p></div></Layout>;
  }

  const { match } = data;
  const confirmedTags = match.confirmed_tags ?? [];
  const progress = (match.sweep_progress ?? {}) as SweepProgress;
  const earlyAttackIds = new Set(sweepPoints('early_attack', analysis.rows).map(r => r.id));
  const setNumbers = analysis.sets.map(s => s.setNumber);
  const rows = analysis.rows.filter(r =>
    (setFilter === 0 || r.setNumber === setFilter) && (!onlyLost || r.winner === 'opponent'));
  const result = `${analysis.setsWon.won > analysis.setsWon.lost ? 'Won' : analysis.setsWon.won < analysis.setsWon.lost ? 'Lost' : 'Level'} ${analysis.setsWon.won}–${analysis.setsWon.lost}`;
  const playerName = cleanText(match.player_name) ?? 'You';
  const pendingIds = new Set(pending.map(e => e.id));
  const locked = pending.length > 0;
  const editingRow = editingId ? analysis.rows.find(r => r.id === editingId) : undefined;
  const editingPoint = editingId ? shownPoints?.find(p => p.id === editingId) : undefined;
  const date = new Date(`${match.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div className="ma" style={{ gap: '1.5rem' }}>
        <header className="ma-header">
          <div>
            <Link to={`/matches/${match.id}/analysis`} className="back-link">Back to analysis</Link>
            <h1>Points editor</h1>
            <p className="ma-meta">{cleanText(match.player_name) ? `${match.player_name} vs ${match.opponent_name}` : `vs ${match.opponent_name}`} · {date} · {result}</p>
          </div>
          <div className="card pe-count">
            <span className="ma-tile-label">Your unforced errors</span>
            <span className="ma-tile-value" style={{ fontSize: 22 }}>
              {analysis.unforced.total} <small>of {analysis.points.lost} points lost</small>
            </span>
            <span className={`status${saveError ? ' error' : ''}`} role="status">
              {saveError ?? (saving > 0 ? 'Saving...' : 'Saved as you tick')}
            </span>
          </div>
        </header>

        <section className="card sw-list" aria-labelledby="pe-sweeps-h">
          <div>
            <h2 id="pe-sweeps-h">Sweeps</h2>
            <p className="muted">Go through the match one point at a time and answer one question. <HelpLink page="unforced-errors-and-attacks" /></p>
          </div>
          <ul>
            {SWEEP_TAGS.map(tag => {
              const s = sweepStatus(tag, analysis.rows, confirmedTags, progress);
              const path = `/matches/${match.id}/sweep/${tag}`;
              return (
                <li key={tag}>
                  <div className="sw-list-name">
                    <strong>{SWEEPS[tag].name}</strong>
                    <span>{SWEEPS[tag].scope}, {s.total}</span>
                  </div>
                  <div className="sw-list-status">
                    {s.kind === 'done' && <><span className="sw-badge">Done</span> {s.ticks} marked</>}
                    {s.kind === 'stopped' && <>Stopped at set {s.at.setNumber}, point {s.at.number} · {s.ticks} marked</>}
                    {s.kind === 'ticked' && <>{s.ticks} ticked, not confirmed</>}
                    {s.kind === 'new' && <span className="faint">Not started</span>}
                  </div>
                  <div className="sw-list-actions">
                    {s.kind === 'ticked' && (
                      <button type="button" className="btn quiet small" onClick={() => confirmTag(tag)}>That's all of them</button>
                    )}
                    {s.total > 0 && (
                      <Link to={path} className={`btn small${s.kind === 'done' ? '' : ' primary'}`}>
                        {s.kind === 'done' ? 'Sweep again' : s.kind === 'stopped' ? 'Carry on' : 'Start sweep'}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <form className="card pe-details" onSubmit={saveDetails} aria-labelledby="pe-details-h">
          <h2 id="pe-details-h">Match details</h2>
          <div className="fields">
            <label className="field">
              <span>Player</span>
              <select name="player_id" value={details.player_id} onChange={changeDetail}>
                {!players.some(p => p.id === details.player_id) && (
                  <option value={details.player_id}>{cleanText(details.player_name) ?? 'You'}</option>
                )}
                {players.map(p => <option key={p.id} value={p.id}>{p.is_self ? `${p.name} (you)` : p.name}</option>)}
              </select>
              <span className="field-hint">Add someone new on the <Link to="/players">players page</Link>.</span>
            </label>
            <label className="field">
              <span>Opponent</span>
              <input name="opponent_name" value={details.opponent_name} onChange={changeDetail} required autoComplete="off" />
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" name="date" value={details.date} onChange={changeDetail} required />
            </label>
            <label className="field">
              <span>Event</span>
              <input name="event" value={details.event} onChange={changeDetail} maxLength={MAX_EVENT} placeholder="e.g. Winter 2026/27 league" />
            </label>
            <label className="field wide">
              <span>Video link</span>
              <input type="url" name="video_url" value={details.video_url} onChange={changeDetail} maxLength={MAX_VIDEO_URL} placeholder="https://" />
            </label>
            <fieldset className="field wide match-styles-field">
              <legend>Styles</legend>
              <p className="field-hint">As they were for this match. Changing them here doesn't change the player page.</p>
              <MatchStyles
                playerName={players.find(p => p.id === details.player_id)?.name ?? (cleanText(details.player_name) || 'You')}
                opponentName={cleanText(details.opponent_name) ?? 'Opponent'}
                player={details.player}
                opponent={details.opponent}
                styles={styles}
                onPlayer={changeKit('player')}
                onOpponent={changeKit('opponent')}
              />
            </fieldset>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={detailsStatus.kind === 'saving'}>
              {detailsStatus.kind === 'saving' ? 'Saving...' : 'Save details'}
            </button>
            <span className={`status${detailsStatus.kind === 'error' ? ' error' : ''}`} role="status">
              {detailsStatus.kind === 'saved' ? 'Saved' : detailsStatus.kind === 'error' ? detailsStatus.message : ''}
            </span>
          </div>
        </form>


        <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 860 }}>
          You can also tick any point by hand, which doesn't mark a sweep as done. Edit changes who won or the shots.{' '}
          <HelpLink page="fix-a-point">How this works</HelpLink>
        </p>

        {pending.length > 0 && (
          <section className="notice pe-pending" aria-labelledby="pe-pending-h" role="status">
            <h2 id="pe-pending-h">
              {pending.length === 1 ? '1 change' : `${pending.length} changes`} not saved yet
            </h2>
            {pendingCheck && !pendingCheck.ok ? (
              <>
                <p>The match doesn't add up yet:</p>
                <ul>{pendingCheck.problems.map(p => <li key={p}>{p}</li>)}</ul>
                <p>Edit another point to fix it, or discard the changes. The table shows them as if they were saved.</p>
              </>
            ) : (
              <p>The match adds up now. Save to keep the changes.</p>
            )}
            {pendingError && <p className="pe-pending-error">{pendingError}</p>}
            <div className="form-actions">
              <button type="button" className="btn primary" onClick={savePending} disabled={editSaving || !pendingCheck?.ok}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" className="btn" onClick={() => { setPending([]); setPendingError(null); }} disabled={editSaving}>
                Discard
              </button>
            </div>
          </section>
        )}

        <div className="pe-toolbar" role="toolbar" aria-label="Filter points">
          <div className="segmented compact">
            {[0, ...setNumbers].map(n => (
              <button key={n} type="button" aria-pressed={setFilter === n} onClick={() => setSetFilter(n)}>
                {n === 0 ? 'All sets' : `Set ${n}`}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={onlyLost} onChange={e => setOnlyLost(e.target.checked)} />
            Only points you lost
          </label>
        </div>

        <div className="card table-card">
          <table className="data-table" style={{ minWidth: 960 }}>
            <caption className="sr-only">
              Points in this match
            </caption>
            <thead>
              <tr>
                <th scope="col">Point</th>
                <th scope="col">Score after</th>
                <th scope="col">Server</th>
                <th scope="col">Point to</th>
                <th scope="col">Winning shot</th>
                <th scope="col">Losing shot</th>
                <th scope="col" className="pe-check">Unforced</th>
                <th scope="col" className="pe-check">Attacked first</th>
                <th scope="col" className="pe-check">Straight away</th>
                <th scope="col" className="pe-check">Lucky</th>
                <th scope="col"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const desc = `set ${r.setNumber} point ${r.number}`;
                return (
                  <tr key={r.id} className={pendingIds.has(r.id) ? 'pe-row-pending' : undefined}>
                    <th scope="row" className="muted">{setFilter === 0 ? `Set ${r.setNumber} · ${r.number}` : r.number}</th>
                    <td className="strong">{r.playerScore}-{r.opponentScore}</td>
                    <td className="muted">{r.server === 'player' ? 'You' : 'Opp'}</td>
                    <td><span className={`chip small ${r.winner === 'player' ? 'you' : 'opp'}`}>{r.winner === 'player' ? 'You' : 'Opp'}</span></td>
                    <td>{r.winningShot ?? '–'}</td>
                    <td>{r.losingShot ?? '–'}</td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isUnforced}
                        disabled={r.isServiceFault || locked}
                        onChange={() => toggle(r, 'unforced')}
                        aria-label={`Unforced error, ${desc}`}
                        title={r.isServiceFault ? 'A service fault always counts as unforced' : 'The losing shot was unforced'}
                      />
                    </td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isAttackedFirst}
                        disabled={r.isServiceFault || r.isEarlyAttack || locked}
                        onChange={() => toggle(r, 'attacked_first')}
                        aria-label={`Attacked first, ${desc}`}
                        title={r.isEarlyAttack ? 'Attacking straight away is always an attack first' : 'You played the first attacking shot'}
                      />
                    </td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isEarlyAttack}
                        disabled={!earlyAttackIds.has(r.id) || locked}
                        onChange={() => toggle(r, 'early_attack')}
                        aria-label={`Attacked straight away, ${desc}`}
                        title={!earlyAttackIds.has(r.id) ? 'Only points that went past the receive'
                          : r.server === 'player' ? 'You attacked the ball after their receive' : 'You attacked their serve'}
                      />
                    </td>
                    <td className="pe-check">
                      <input type="checkbox" checked={r.isLucky} disabled={locked} onChange={() => toggle(r, 'lucky')} aria-label={`Lucky, ${desc}`} />
                    </td>
                    <td className="pe-edit-cell">
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => { setEditProblems(null); setEditingId(r.id); }}
                        disabled={isComplete === null || editSaving}
                        aria-label={`Edit ${desc}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="ma-table-note">No points match these filters.</p>}
        </div>
      </div>
      {editingRow && editingPoint && (
        <PointEditDialog
          key={editingRow.id}
          title={`Set ${editingRow.setNumber}, point ${editingRow.number}`}
          scoreBefore={scoreBefore(editingRow).join('-')}
          server={editingRow.server}
          playerName={playerName}
          opponentName={match.opponent_name || 'Opponent'}
          edit={editFromPoint(editingPoint)}
          shots={data.shots}
          problems={editProblems}
          saving={editSaving}
          onSave={saveFromDialog}
          onKeep={keepFromDialog}
          onCancel={closeDialog}
          onDirty={clearProblems}
        />
      )}
    </Layout>
  );
};

export default PointsEditor;
