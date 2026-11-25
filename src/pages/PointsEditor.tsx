import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import type { AnalysisData, MatchDetails } from '../lib/api';
import { MAX_EVENT, MAX_PLAYER_NAME, MAX_VIDEO_URL, cleanText, validateDetails } from '../lib/matchDetails';
import { UNFORCED_ERROR_DEFINITION, buildAnalysis, type PointRow } from '../lib/analysis';
import { ATTACK_DEFINITION, SWEEPS, SWEEP_TAGS, answerChanges, isTicked, sweepPoints, sweepStatus, type SweepProgress, type SweepTag } from '../lib/sweeps';
import '../styles/components/MatchAnalysis.css';
import '../styles/sweep.css';

type DetailsForm = { player_name: string; opponent_name: string; date: string; event: string; video_url: string };

const toForm = (m: AnalysisData['match']): DetailsForm => ({
  player_name: m.player_name ?? '',
  opponent_name: m.opponent_name,
  date: m.date,
  event: m.event ?? '',
  video_url: m.video_url ?? '',
});

/**
 * Review a recorded match point by point and tick the lucky and unforced
 * flags. Each tick saves straight away.
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

  useEffect(() => {
    if (!id) return;
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

  const analysis = useMemo(() => data && buildAnalysis({
    initialServer: data.match.initial_server ?? 'player',
    sets: data.sets,
    points: data.points,
    shots: data.shots,
    confirmed: data.match.confirmed_tags ?? [],
  }), [data]);

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

  const changeDetail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetails(prev => prev && { ...prev, [name]: value });
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
    const changes: MatchDetails = {
      player_name: cleanText(details.player_name),
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
            <p className="muted">Go through the match one point at a time and answer one question. Next means no, so you only tap for the points that count. Sweeps you don't use stay off the analysis page.</p>
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
              <input name="player_name" value={details.player_name} onChange={changeDetail} maxLength={MAX_PLAYER_NAME} placeholder="Your name, or a friend's" autoComplete="off" />
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
          You can also tick any point by hand, which doesn't mark a sweep as done. Tick <strong>Unforced</strong> when the losing shot was an unforced error. {UNFORCED_ERROR_DEFINITION} It applies to whoever lost the point, but only your own count towards the analysis. A service fault always counts as unforced. Tick <strong>Attacked first</strong> when you played the first attacking shot. {ATTACK_DEFINITION} Tick <strong>Straight away</strong> when you attacked at your first chance: the third ball on your serve, or their serve itself. It only applies to points that went past the receive, and ticks Attacked first too.
        </p>

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
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const desc = `set ${r.setNumber} point ${r.number}`;
                return (
                  <tr key={r.id}>
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
                        disabled={r.isServiceFault}
                        onChange={() => toggle(r, 'unforced')}
                        aria-label={`Unforced error, ${desc}`}
                        title={r.isServiceFault ? 'A service fault always counts as unforced' : 'The losing shot was unforced'}
                      />
                    </td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isAttackedFirst}
                        disabled={r.isServiceFault || r.isEarlyAttack}
                        onChange={() => toggle(r, 'attacked_first')}
                        aria-label={`Attacked first, ${desc}`}
                        title={r.isEarlyAttack ? 'Attacking straight away is always an attack first' : 'You played the first attacking shot'}
                      />
                    </td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isEarlyAttack}
                        disabled={!earlyAttackIds.has(r.id)}
                        onChange={() => toggle(r, 'early_attack')}
                        aria-label={`Attacked straight away, ${desc}`}
                        title={!earlyAttackIds.has(r.id) ? 'Only points that went past the receive'
                          : r.server === 'player' ? 'You attacked the ball after their receive' : 'You attacked their serve'}
                      />
                    </td>
                    <td className="pe-check">
                      <input type="checkbox" checked={r.isLucky} onChange={() => toggle(r, 'lucky')} aria-label={`Lucky, ${desc}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="ma-table-note">No points match these filters.</p>}
        </div>
      </div>
    </Layout>
  );
};

export default PointsEditor;
