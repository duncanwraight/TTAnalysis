import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import type { AnalysisData } from '../lib/api';
import { buildAnalysis, type PointRow } from '../lib/analysis';
import { cleanText } from '../lib/matchDetails';
import {
  SWEEPS, SWEEP_TAGS, answerChanges, isSweepTag, isTicked, scoreBefore, sweepPoints, sweepStatus, tickCount,
  type SweepProgress, type SweepTag,
} from '../lib/sweeps';
import '../styles/sweep.css';

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

// "Loop FH" in a point row reads as "Forehand loop"
const shotText = (shot: string | null) => {
  if (!shot) return 'No shot';
  const m = shot.match(/^(.*) (FH|BH)$/);
  return m ? `${m[2] === 'FH' ? 'Forehand' : 'Backhand'} ${m[1].toLowerCase()}` : shot;
};

/**
 * One sweep: the match one point at a time, with one question. Yes ticks the
 * point, No moves on, and every answer saves straight away along with where
 * the sweep has got to, so it can be finished later.
 */
const Sweep = () => {
  const { id, tag: tagParam } = useParams<{ id: string; tag: string }>();
  const tag: SweepTag | null = isSweepTag(tagParam) ? tagParam : null;
  const api = useApi();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  // On a phone the instructions start folded away, so the point fits above the buttons
  const [isPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  // Saves run one after another, so the last answer is always the last write
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!id) return;
    api.match.getAnalysis(id)
      .then(setData)
      .catch(err => {
        console.error('Failed to load the match:', err);
        setLoadError('This match did not load.');
      });
  }, [id, api]);

  const analysis = useMemo(() => data && buildAnalysis({
    initialServer: data.match.initial_server ?? 'player',
    sets: data.sets,
    points: data.points,
    shots: data.shots,
    confirmed: data.match.confirmed_tags ?? [],
  }), [data]);

  const points = useMemo(() => (analysis && tag ? sweepPoints(tag, analysis.rows) : []), [analysis, tag]);

  // Start where an unfinished sweep stopped, or at the first point
  useEffect(() => {
    if (!data || !tag || index !== null) return;
    const saved = (data.match.sweep_progress as SweepProgress | undefined)?.[tag];
    const at = points.findIndex(r => r.id === saved);
    setIndex(at >= 0 ? at : 0);
  }, [data, tag, points, index]);

  const save = (work: () => Promise<unknown>, undo?: () => void) => {
    setSaving(n => n + 1);
    queue.current = queue.current
      .then(async () => { await work(); })
      .catch(err => {
        console.error('Failed to save the sweep:', err);
        undo?.();
        setSaveError('An answer did not save. Check your connection, then go back and answer that point again.');
      })
      .finally(() => setSaving(n => n - 1));
  };

  const answer = (yes: boolean) => {
    if (!data || !tag || index === null || finished || index >= points.length) return;
    const row = points[index];
    setSaveError(null);

    if (isTicked(tag, row) !== yes) {
      const changes = answerChanges(tag, yes);
      const before = data.points.find(p => p.id === row.id);
      const setPoint = (values: object) => setData(prev => prev && {
        ...prev,
        points: prev.points.map(p => (p.id === row.id ? { ...p, ...values } : p)),
      });
      setPoint(changes);
      save(() => api.point.updatePoint(row.id, changes), () => before && setPoint(before));
    }

    const progress = { ...(data.match.sweep_progress ?? {}) };
    const next = index + 1;
    if (next >= points.length) {
      // The last point: the tag is now complete for this match
      delete progress[tag];
      const confirmed = [...new Set([...(data.match.confirmed_tags ?? []), tag])];
      setData(prev => prev && { ...prev, match: { ...prev.match, confirmed_tags: confirmed, sweep_progress: progress } });
      save(() => api.match.updateMatch(data.match.id, { confirmed_tags: confirmed, sweep_progress: progress }));
      setFinished(true);
    } else {
      progress[tag] = points[next].id;
      setData(prev => prev && { ...prev, match: { ...prev.match, sweep_progress: progress } });
      save(() => api.match.updateMatch(data.match.id, { sweep_progress: progress }));
      setIndex(next);
    }
  };

  const back = () => {
    if (finished) {
      setFinished(false);
      setIndex(Math.max(0, points.length - 1));
    } else if (index !== null && index > 0) {
      setIndex(index - 1);
    }
  };

  // Keyboard: Y for yes, N or Space for no, Backspace to go back
  const keys = useRef({ answer, back });
  keys.current = { answer, back };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const key = e.key.toLowerCase();
      if (key === 'y') keys.current.answer(true);
      else if (key === 'n' || key === ' ') keys.current.answer(false);
      else if (key === 'backspace') keys.current.back();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const editorPath = `/matches/${id}/points`;

  if (!tag || loadError) {
    return (
      <Layout>
        <div className="state">
          <h2>{tag ? 'The match did not load' : 'There is no such sweep'}</h2>
          <p>{loadError ?? 'Pick a sweep from the points editor.'}</p>
          <div className="form-actions"><Link to={id ? editorPath : '/matches'} className="btn primary">Back</Link></div>
        </div>
      </Layout>
    );
  }

  if (!data || !analysis || index === null) {
    return <Layout><div className="state" role="status"><p>Loading the points...</p></div></Layout>;
  }

  const sweep = SWEEPS[tag];
  const { match } = data;
  const opponent = match.opponent_name;
  const title = cleanText(match.player_name) ? `${cleanText(match.player_name)} vs ${opponent}` : `vs ${opponent}`;
  const marked = tickCount(tag, analysis.rows);
  const status = saveError ?? (saving > 0 ? 'Saving...' : 'Saved as you go');

  if (points.length === 0) {
    return (
      <Layout>
        <div className="state">
          <h2>No points for this sweep</h2>
          <p>{sweep.name} only covers {sweep.scope.toLowerCase()}, and this match has none.</p>
          <div className="form-actions"><Link to={editorPath} className="btn primary">Back to the points editor</Link></div>
        </div>
      </Layout>
    );
  }

  if (finished) {
    const others = SWEEP_TAGS.filter(t => t !== tag)
      .map(t => ({ t, status: sweepStatus(t, analysis.rows, match.confirmed_tags ?? [], (match.sweep_progress ?? {}) as SweepProgress) }))
      .filter(o => o.status.kind !== 'done' && o.status.total > 0);
    return (
      <Layout>
        <div className="page narrow">
          <div className="card sw-done">
            <div className="sw-done-head">
              <span className="sw-done-mark" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <div>
                <h1>That's every point</h1>
                <p>{sweep.name}: {marked} of {points.length} points marked. The analysis page and the coach's summary use them from now on.</p>
              </div>
            </div>
            <p className={`status${saveError ? ' error' : ''}`} role="status">{status}</p>
            {others.length > 0 && (
              <div className="sw-others">
                <h2>Other sweeps for this match</h2>
                <ul>
                  {others.map(({ t, status: s }) => (
                    <li key={t}>
                      <div>
                        <strong>{SWEEPS[t].name}</strong>
                        <span>
                          {s.kind === 'stopped' ? `Stopped at set ${s.at.setNumber}, point ${s.at.number}`
                            : s.kind === 'ticked' ? `${s.ticks} ticked, not confirmed`
                              : `Not started · ${s.total} points`}
                        </span>
                      </div>
                      <Link to={`/matches/${id}/sweep/${t}`} className="btn small">{s.kind === 'stopped' ? 'Carry on' : 'Start'}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="form-actions">
              <Link to={`/matches/${id}/analysis`} className="btn primary">View the analysis</Link>
              <Link to={editorPath} className="btn">Back to the points editor</Link>
              <button type="button" className="btn quiet" onClick={back}>Back a point</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const row = points[index];
  const [youBefore, oppBefore] = scoreBefore(row);
  const answered = index;
  const setRows = points.filter(r => r.setNumber === row.setNumber);
  const setCount = analysis.sets.length;
  const ticked = isTicked(tag, row);
  const yes = row.server === 'opponent' && sweep.yesOnTheirServe ? sweep.yesOnTheirServe : sweep.yes;
  const [winnerName, loserName] = row.winner === 'player' ? ['You', opponent] : [opponent, 'You'];

  return (
    <Layout>
      <div className="sw">
        <div className="sw-head">
          <div>
            <Link to={editorPath} className="back-link">Back to the points editor</Link>
            <h1>{sweep.name}</h1>
            <p className="muted sw-meta">{title} · {formatDate(match.date)}</p>
          </div>
          <div className="sw-head-actions">
            <span className={`status${saveError ? ' error' : ' sw-saved'}`} role="status">{status}</span>
            <button type="button" className="btn" onClick={() => navigate(editorPath)}>Finish later</button>
          </div>
        </div>

        <details className="sw-instruction" open={!isPhone}>
          <summary>What counts</summary>
          <p>{sweep.instruction}</p>
        </details>

        <div className="sw-progress">
          <div className="sw-progress-text">
            <span><strong>{answered} of {points.length}</strong> answered · {sweep.scope.toLowerCase()}</span>
            <span>{marked} marked</span>
          </div>
          <div className="sw-bar"><div style={{ width: `${(100 * answered) / points.length}%` }} /></div>
        </div>

        <div className="sw-body">
          <section className="sw-main" aria-label="This point">
            <div className="card sw-point">
              <div className="sw-point-top">
                <span className="eyebrow">Set {row.setNumber} · Point {row.number}</span>
                <span className="muted">{row.server === 'player' ? 'You served' : `${opponent} served`}</span>
              </div>
              <div className="sw-score">
                <span className="sw-score-label">Score before the point</span>
                <div className="sw-score-row">
                  <span className="sw-name you">You</span>
                  <span className="sw-score-value">{youBefore}–{oppBefore}</span>
                  <span className="sw-name opp">{opponent}</span>
                </div>
              </div>
              <dl className="sw-shots">
                <dt>Point to</dt>
                <dd><span className={`chip small ${row.winner === 'player' ? 'you' : 'opp'}`}>{winnerName}</span></dd>
                <dt>Winning shot</dt>
                <dd><span className="muted">{winnerName} ·</span> <strong>{shotText(row.winningShot)}</strong></dd>
                <dt>Losing shot</dt>
                <dd><span className="muted">{loserName} ·</span> <strong>{shotText(row.losingShot)}</strong></dd>
              </dl>
              {ticked && <p className="sw-current">Already marked. Press {yes} to keep it, or No to clear it.</p>}
            </div>

            <div className="sw-actions">
              <button type="button" className={`sw-answer yes${ticked ? ' current' : ''}`} onClick={() => answer(true)}>
                {yes} <kbd>Y</kbd>
              </button>
              <button type="button" className="sw-answer" onClick={() => answer(false)}>
                No, next point <kbd>N</kbd>
              </button>
            </div>
            <div className="sw-foot">
              <button type="button" className="btn quiet small" onClick={back} disabled={index === 0}>Back a point <kbd>Backspace</kbd></button>
              <span className="sw-hint">Space also means no. Pick any point in the list to jump to it.</span>
            </div>
          </section>

          <aside className="card sw-rail" aria-label={`Points in set ${row.setNumber}`}>
            <div className="sw-rail-head">
              <h2>Set {row.setNumber}</h2>
              <span className="faint">of {setCount}</span>
            </div>
            <ol>
              {setRows.map((r: PointRow) => {
                const i = points.indexOf(r);
                const [y, o] = scoreBefore(r);
                const now = i === index;
                const done = i < index;
                return (
                  <li key={r.id}>
                    <button type="button" className={now ? 'now' : undefined} aria-current={now ? 'step' : undefined} onClick={() => setIndex(i)}>
                      <span className="faint">{r.number}</span>
                      <span className="strong">{y}–{o}</span>
                      <span className="sw-rail-shot">{r.winner === 'player' ? 'You' : 'Opp'} · {r.winningShot ? shotText(r.winningShot).toLowerCase() : 'service fault'}</span>
                      <span className="sw-rail-state">
                        {now ? <strong>Now</strong> : isTicked(tag, r) ? <span className="sw-yes">Yes</span> : done ? <span className="faint">No</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="faint sw-rail-note">If the score here doesn't match the video, a point has been missed.</p>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

/**
 * The end of one sweep links to the next, which only changes the URL. Keying on
 * the match and tag starts each sweep fresh, with the data reloaded, instead of
 * carrying over the last one's finished state and position.
 */
const PointSweep = () => {
  const { id, tag } = useParams<{ id: string; tag: string }>();
  return <Sweep key={`${id}/${tag}`} />;
};

export default PointSweep;
