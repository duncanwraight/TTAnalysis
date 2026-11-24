import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import type { AnalysisData, MatchDetails } from '../lib/api';
import { MAX_EVENT, MAX_PLAYER_NAME, MAX_VIDEO_URL, cleanText, validateDetails } from '../lib/matchDetails';
import { UNFORCED_ERROR_DEFINITION, buildAnalysis } from '../lib/analysis';
import '../styles/components/MatchAnalysis.css';

type Flag = 'is_lucky_shot' | 'is_unforced_error';

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
  }), [data]);

  const toggle = async (pointId: string, flag: Flag) => {
    if (!data) return;
    const point = data.points.find(p => p.id === pointId);
    if (!point) return;
    const value = !point[flag];
    const setFlag = (v: boolean) => setData(prev => prev && {
      ...prev,
      points: prev.points.map(p => (p.id === pointId ? { ...p, [flag]: v } : p)),
    });

    // Show the change at once, and put it back if the save fails
    setFlag(value);
    setSaving(n => n + 1);
    setSaveError(null);
    try {
      await api.point.updatePoint(pointId, { [flag]: value });
    } catch (err) {
      console.error('Failed to save point:', err);
      setFlag(!value);
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
          Tick <strong>Unforced</strong> when the losing shot was an unforced error. {UNFORCED_ERROR_DEFINITION} It applies to whoever lost the point, but only your own count towards the analysis. A service fault always counts as unforced. Lucky is the same tickbox as in the tracker.
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
          <table className="data-table" style={{ minWidth: 760 }}>
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
                <th scope="col" className="pe-check">Lucky</th>
                <th scope="col" className="pe-check">Unforced</th>
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
                      <input type="checkbox" checked={r.isLucky} onChange={() => toggle(r.id, 'is_lucky_shot')} aria-label={`Lucky, ${desc}`} />
                    </td>
                    <td className="pe-check">
                      <input
                        type="checkbox"
                        checked={r.isUnforced}
                        disabled={r.isServiceFault}
                        onChange={() => toggle(r.id, 'is_unforced_error')}
                        aria-label={`Unforced error, ${desc}`}
                        title={r.isServiceFault ? 'A service fault always counts as unforced' : 'The losing shot was unforced'}
                      />
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
