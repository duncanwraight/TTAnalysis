import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import type { AnalysisData } from '../lib/api';
import { Analysis, CategoryRow, ShotRow, Tally, buildAnalysis } from '../lib/analysis';
import '../styles/components/MatchAnalysis.css';

const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const handLabel = (hand: string | null) => (hand ? hand.toUpperCase() : '');
const categoryLabel = (name: string) => {
  const words = name.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** Two bars from a shared centre line: losing shots to the left, winning shots to the right. */
const Diverge = ({ left, right, max, leftClass, rightClass, title }: {
  left: number; right: number; max: number; leftClass: string; rightClass: string; title: string;
}) => (
  <div className="ma-diverge" title={title}>
    <div><div className={`left ${leftClass}`} style={{ width: `${(100 * left) / max}%` }} /></div>
    <div><div className={`right ${rightClass}`} style={{ width: `${(100 * right) / max}%` }} /></div>
  </div>
);

const SetChart = ({ gaps, scale }: { gaps: number[]; scale: number }) => {
  const step = 320 / Math.max(gaps.length - 1, 1);
  const pts = (f: (g: number) => number) => gaps.map((g, i) => `${(i * step).toFixed(1)},${60 - f(g) * scale}`).join(' ');
  const end = ((gaps.length - 1) * step).toFixed(1);
  return (
    <svg viewBox="0 0 320 120" aria-hidden="true">
      <line x1="0" y1="60" x2="320" y2="60" stroke="var(--ma-line)" strokeWidth="1" />
      <polygon points={`0,60 ${pts(g => Math.max(g, 0))} ${end},60`} fill="var(--ma-you)" fillOpacity="0.22" />
      <polygon points={`0,60 ${pts(g => Math.min(g, 0))} ${end},60`} fill="var(--ma-opp)" fillOpacity="0.22" />
      <polyline points={pts(g => g)} fill="none" stroke="var(--ma-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const Tile = ({ label, value, of, note, empty }: { label: string; value: string; of?: string; note: React.ReactNode; empty?: boolean }) => (
  <div className={`ma-card ma-tile${empty ? ' dashed' : ''}`}>
    <span className="ma-tile-label">{label}</span>
    <span className={`ma-tile-value${empty ? ' empty' : ''}`}>{value}{of && <> <small>{of}</small></>}</span>
    <span className="ma-tile-note">{note}</span>
  </div>
);

const CategoryTable = ({ title, rows, yours }: { title: string; rows: CategoryRow[]; yours: boolean }) => {
  const max = Math.max(1, ...rows.map(r => Math.max(r.won, r.lost)));
  return (
    <div className="ma-card ma-table-card">
      <table className="ma-table" style={{ minWidth: 380 }}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col" className="bar-col"><span className="ma-split-head"><span>Losing shot</span><span>Winning shot</span></span></th>
            <th scope="col" className="num">Won · Lost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.category}>
              <th scope="row">{categoryLabel(r.category)}</th>
              <td>
                <Diverge
                  left={r.lost} right={r.won} max={max}
                  leftClass={yours ? 'ma-fill-opp' : 'ma-fill-you'} rightClass={yours ? 'ma-fill-you' : 'ma-fill-opp'}
                  title={`${categoryLabel(r.category)}: winning shot ${r.won}, losing shot ${r.lost}`}
                />
              </td>
              <td className="num">{r.won} · {r.lost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const shotName = (s: ShotRow) => `${s.shot} ${handLabel(s.hand)}`.trim();
const listShots = (rows: ShotRow[], count: (s: ShotRow) => number) =>
  rows.map(s => `${s.shot.toLowerCase()}${s.hand ? ` ${handLabel(s.hand)}` : ''} ${count(s)}`).join(', ');

const MatchAnalysis = () => {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useApi();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Shown when the link can't be copied automatically
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);

  const isSharedView = location.pathname.startsWith('/shared/');
  const isOwnerView = !!user && !isSharedView;

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        if (isSharedView) {
          if (!token) throw new Error('Missing share token');
          setData(await api.match.getSharedAnalysis(token));
        } else {
          if (!id) throw new Error('Missing match ID');
          setData(await api.match.getAnalysis(id));
        }
      } catch (err) {
        console.error('Failed to load analysis:', err);
        setError(isSharedView
          ? 'This shared link is invalid or sharing has been turned off.'
          : 'Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, token, isSharedView, api]);

  const analysis: Analysis | null = useMemo(() => data && buildAnalysis({
    initialServer: data.match.initial_server ?? 'player',
    sets: data.sets,
    points: data.points,
    shots: data.shots,
  }), [data]);

  const exportToPDF = async () => {
    if (!contentRef.current || !data) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const date = new Date(`${data.match.date}T00:00:00`).toLocaleDateString().replace(/\//g, '-');
      const options = {
        margin: 0.4,
        filename: `match-analysis-${data.match.opponent_name}-${date}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
        // Not in html2pdf's types, but supported: keep cards and table rows whole
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.ma-card', 'tr'] },
      };
      await html2pdf().from(contentRef.current).set(options).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    setShareError(null);

    let shareToken: string;
    try {
      shareToken = await api.match.enableSharing(id);
      setData(prev => (prev ? { ...prev, match: { ...prev.match, share_token: shareToken } } : prev));
    } catch (err) {
      console.error('Failed to enable sharing:', err);
      setShareError('Could not enable sharing for this match. Please try again.');
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setManualShareUrl(null);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch {
      // Clipboard access can be blocked, so show the link to copy by hand
      setManualShareUrl(shareUrl);
    }
  };

  const handleStopSharing = async () => {
    if (!id) return;
    setShareError(null);
    try {
      await api.match.disableSharing(id);
      setManualShareUrl(null);
      setData(prev => (prev ? { ...prev, match: { ...prev.match, share_token: null } } : prev));
    } catch (err) {
      console.error('Failed to stop sharing:', err);
      setShareError('Could not stop sharing this match. Please try again.');
    }
  };

  const wrap = (content: React.ReactNode) =>
    isSharedView ? <div className="shared-analysis-container">{content}</div> : <Layout>{content}</Layout>;

  if (loading) {
    return wrap(<div className="loading-container"><p>Loading analysis...</p></div>);
  }

  if (error || !data || !analysis) {
    return wrap(
      <div className="error-container">
        <h2>Error</h2>
        <p>{error ?? 'Failed to load analysis data'}</p>
        <button className="btn secondary-btn" onClick={() => navigate(isSharedView ? '/' : '/matches')}>
          {isSharedView ? 'Go to Home' : 'Back to Matches'}
        </button>
      </div>
    );
  }

  const { match } = data;
  const a = analysis;
  const editorPath = `/matches/${match.id}/points`;
  const totalPoints = a.points.won + a.points.lost;
  const setsResult = a.setsWon.won > a.setsWon.lost ? 'Won' : a.setsWon.won < a.setsWon.lost ? 'Lost' : 'Level';
  const nineAllTotal = a.fromNineAll.won + a.fromNineAll.lost;
  const chartScale = 48 / Math.max(4, ...a.sets.flatMap(s => s.gaps.map(Math.abs)));

  const yourLosing = a.shots.player.filter(s => s.lost > 0);
  const yourWinningOnly = a.shots.player.filter(s => s.lost === 0).sort((x, y) => y.won - x.won);
  const yourMax = Math.max(1, ...a.shots.player.map(s => Math.max(s.won, s.lost)));
  const theirMain = a.shots.opponent.filter(s => s.won + s.lost >= 2);
  const theirOther = a.shots.opponent.filter(s => s.won + s.lost < 2);
  const theirMax = Math.max(1, ...a.shots.opponent.map(s => Math.max(s.won, s.lost)));
  const theirServeWins = a.shots.opponent.filter(s => s.category === 'serve' && s.shot !== 'Service fault').reduce((n, s) => n + s.won, 0);
  const theirFaults = a.shots.opponent.filter(s => s.shot === 'Service fault').reduce((n, s) => n + s.lost, 0);

  const ueRows = a.shots.player.filter(s => s.lost > 0).sort((x, y) => y.unforced - x.unforced || y.lost - x.lost);
  const ueMax = Math.max(1, ...ueRows.map(s => s.lost));
  const [, , lateStage] = a.stages;

  const handRow = (label: string, t: Tally) => (
    <div className="ma-pair-row"><span className="ma-muted">{label}</span><strong>Won {t.won} · Lost {t.lost}</strong></div>
  );

  const analysisContent = (
    <div className="ma" ref={contentRef}>
      <header className="ma-header">
        <div>
          <p className="ma-eyebrow">Match analysis</p>
          <h1>vs {match.opponent_name}</h1>
          <p className="ma-meta">{formatDate(match.date)} · Best of {match.best_of}</p>
          {isSharedView && <span className="ma-shared-badge">Shared analysis</span>}
        </div>
        <div className="ma-result">
          <p className="ma-result-text">{setsResult} {a.setsWon.won}–{a.setsWon.lost}</p>
          <div className="ma-chips">
            {a.sets.map(s => (
              <span key={s.setNumber} className={`ma-chip ${s.playerScore > s.opponentScore ? 'won' : 'lost'}`}>
                {s.playerScore}–{s.opponentScore}
              </span>
            ))}
          </div>
        </div>
      </header>

      <aside className="ma-note" aria-label="How points are recorded">
        <strong>How to read this page.</strong> Each point records two shots: the winning shot, and the losing shot of the player who lost the point. The losing shot is either the one that set up the winner (they push, you loop past them) or the one that missed (you loop, they miss the block). Shots in the middle of a rally aren't recorded, so every number here is about how points ended.
      </aside>

      {totalPoints === 0 ? (
        <p className="ma-muted">No points have been recorded for this match yet.</p>
      ) : (
        <>
          <section aria-label="Headline numbers" className="ma-grid tiles">
            <Tile label="Points won" value={`${a.points.won}`} of={`of ${totalPoints}`}
              note={a.points.won === a.points.lost ? 'Level on points' : `${pct(a.points.won, totalPoints)}% of points`} />
            <Tile label="On your serve" value={`${pct(a.onServe.won, a.onServe.won + a.onServe.lost)}%`}
              of={`${a.onServe.won} of ${a.onServe.won + a.onServe.lost}`} note="Points won while serving" />
            <Tile label="On their serve" value={`${pct(a.onReceive.won, a.onReceive.won + a.onReceive.lost)}%`}
              of={`${a.onReceive.won} of ${a.onReceive.won + a.onReceive.lost}`} note="Points won while receiving" />
            <Tile label="From 9-all" value={`${a.fromNineAll.won}`} of={`of ${nineAllTotal}`} note="Points won at 9-9 or later" />
            {a.unforced.recorded ? (
              <Tile label="Your unforced errors" value={`${a.unforced.total}`} of={`of ${a.points.lost} lost`}
                note={`${pct(a.unforced.total, a.points.lost)}% of the points you lost`} />
            ) : (
              <Tile label="Your unforced errors" value="–" empty
                note={isOwnerView ? <Link to={editorPath}>Tick them in the points editor</Link> : 'Not recorded for this match'} />
            )}
          </section>

          {a.cards.length > 0 && (
            <section aria-labelledby="ma-cards" className="ma-section">
              <h2 id="ma-cards">What decided it</h2>
              <div className="ma-grid cards">
                {a.cards.map(card => (
                  <article key={card.title} className="ma-card ma-finding">
                    <span className="ma-finding-tag">{card.tag}</span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="ma-ue" className="ma-section">
            <div className="ma-section-head">
              <h2 id="ma-ue">Unforced errors</h2>
              <p>Points you gave away, by losing shot. This is where practice pays off fastest.</p>
            </div>
            {a.unforced.recorded ? (
              <>
                <div className="ma-grid tiles">
                  <Tile label="Unforced errors" value={`${a.unforced.total}`} of={`of ${a.points.lost} lost`}
                    note={`${pct(a.unforced.total, a.points.lost)}% of the points you lost`} />
                  <Tile label="Forced" value={`${a.points.lost - a.unforced.total}`} of={`of ${a.points.lost} lost`}
                    note="The opponent won the point" />
                  <Tile label="From the 16th point on" value={`${lateStage.unforced}`} of={`of ${lateStage.lost} lost`}
                    note="Unforced, late in sets" />
                </div>
                <div className="ma-card ma-table-card">
                  <table className="ma-table" style={{ minWidth: 560 }}>
                    <caption>By losing shot</caption>
                    <thead>
                      <tr>
                        <th scope="col">Shot</th>
                        <th scope="col" className="bar-col">
                          <span className="ma-legend">
                            <span><span className="ma-swatch opp" />Unforced</span>
                            <span><span className="ma-swatch opp-soft" />Forced</span>
                          </span>
                        </th>
                        <th scope="col" className="num">Unforced</th>
                        <th scope="col" className="num">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ueRows.map(s => (
                        <tr key={s.key}>
                          <th scope="row">{s.shot} <span className="ma-hand">{handLabel(s.hand)}</span></th>
                          <td>
                            <div className="ma-stack" title={`${shotName(s)}: ${s.unforced} unforced, ${s.lost - s.unforced} forced`}>
                              {s.unforced > 0 && <div className="ma-fill-opp" style={{ width: `${(100 * s.unforced) / ueMax}%` }} />}
                              {s.lost - s.unforced > 0 && <div className="ma-fill-opp-soft" style={{ width: `${(100 * (s.lost - s.unforced)) / ueMax}%` }} />}
                            </div>
                          </td>
                          <td className="num strong">{s.unforced} of {s.lost}</td>
                          <td className="num ma-muted">{pct(s.unforced, s.lost)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="ma-grid pairs">
                  <div className="ma-card ma-list">
                    <h3>By stage of the set</h3>
                    {a.stages.map(st => (
                      <div key={st.label} className="ma-pair-row"><span className="ma-muted">{st.label}</span><strong>{st.unforced} of {st.lost} lost</strong></div>
                    ))}
                  </div>
                  <div className="ma-card ma-list">
                    <h3>Serving and receiving</h3>
                    <div className="ma-pair-row"><span className="ma-muted">On your serve</span><strong>{a.unforced.onServe} of {a.onServe.lost} lost</strong></div>
                    <div className="ma-pair-row"><span className="ma-muted">On their serve</span><strong>{a.unforced.onReceive} of {a.onReceive.lost} lost</strong></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="ma-card dashed ma-empty">
                <div>
                  <h3>Not recorded for this match yet</h3>
                  <p>
                    {isOwnerView
                      ? `Go through your ${a.points.lost} lost points and tick the ones where your losing shot was unforced. This section then shows which shots let you down and when.`
                      : 'Unforced errors haven\'t been ticked for this match.'}
                  </p>
                </div>
                {isOwnerView && <Link to={editorPath} className="ma-button primary">Open the points editor</Link>}
              </div>
            )}
          </section>

          <section aria-labelledby="ma-story" className="ma-section">
            <div className="ma-story-head">
              <h2 id="ma-story">How the match went</h2>
              <div className="ma-legend">
                <span><span className="ma-swatch you" />Point to you</span>
                <span><span className="ma-swatch opp" />Point to opponent</span>
              </div>
            </div>
            <p className="ma-muted" style={{ fontSize: 14 }}>The score gap through each set, point by point. Above the middle line, you were ahead.</p>
            <div className="ma-grid sets">
              {a.sets.map(s => (
                <figure key={s.setNumber} className="ma-card ma-set">
                  <figcaption>
                    <span>Set {s.setNumber}</span>
                    <span>{s.playerScore}–{s.opponentScore} <span className="ma-muted" style={{ fontWeight: 500 }}>{s.playerScore > s.opponentScore ? 'won' : 'lost'}</span></span>
                  </figcaption>
                  <SetChart gaps={s.gaps} scale={chartScale} />
                  <div className="ma-set-serve">
                    <span>Your serve {s.playerServe.won} of {s.playerServe.won + s.playerServe.lost}</span>
                    <span>Their serve {s.opponentServe.won} of {s.opponentServe.won + s.opponentServe.lost}</span>
                  </div>
                </figure>
              ))}
            </div>
            <div className="ma-grid pairs">
              <div className="ma-card ma-list">
                <h3>Points by stage of the set</h3>
                {[...a.stages.map(st => ({ label: st.label, won: st.won, lost: st.lost })), { label: 'From 9-all', ...a.fromNineAll }]
                  .filter(st => st.won + st.lost > 0)
                  .map(st => (
                    <div key={st.label} className="ma-stage">
                      <span className="ma-muted">{st.label}</span>
                      <div className="ma-stage-bar" title={`You ${st.won}, opponent ${st.lost}`}>
                        {st.won > 0 && <div style={{ flex: `${st.won} 1 0` }} />}
                        {st.lost > 0 && <div style={{ flex: `${st.lost} 1 0` }} className={st.won === 0 ? 'ma-fill-opp' : undefined} />}
                      </div>
                      <span className="ma-right">{st.won} of {st.won + st.lost}</span>
                    </div>
                  ))}
                <p className="ma-small ma-faint">Stages count both players' points: "points 1–6" covers 3-3, 5-1 and 6-0 alike.</p>
              </div>
              <div className="ma-card ma-list">
                <h3>Longest runs</h3>
                {a.runs.length === 0 && <p className="ma-small ma-muted">No runs of 3 or more.</p>}
                {a.runs.map((r, i) => (
                  <div key={i} className="ma-run">
                    <span className={`ma-run-badge ${r.side === 'player' ? 'you' : 'opp'}`}>{r.length}</span>
                    <span>{r.side === 'player' ? 'You' : 'Opponent'}, from {r.fromPlayer}-{r.fromOpponent}</span>
                    <span className="ma-small ma-muted">Set {r.setNumber}</span>
                  </div>
                ))}
                <p className="ma-small ma-faint">
                  Lucky points (net or edge): {a.lucky.player === a.lucky.opponent ? `${a.lucky.player} each` : `you ${a.lucky.player}, opponent ${a.lucky.opponent}`}.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="ma-cat" className="ma-section">
            <div className="ma-section-head">
              <h2 id="ma-cat">Categories</h2>
              <p>Winning and losing shots grouped by type, for both players. Shows who was attacking and whose defence held.</p>
            </div>
            <div className="ma-grid halves">
              <CategoryTable title="You" rows={a.categories.player} yours />
              <CategoryTable title="Opponent" rows={a.categories.opponent} yours={false} />
            </div>
          </section>

          <section aria-labelledby="ma-you" className="ma-section">
            <div className="ma-section-head">
              <h2 id="ma-you">Your winning and losing shots</h2>
              <p>Most costly first. A service fault counts as your losing shot.</p>
            </div>
            <div className="ma-card ma-table-card">
              <table className="ma-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th scope="col">Shot</th>
                    <th scope="col" className="bar-col"><span className="ma-split-head"><span>Losing shot</span><span>Winning shot</span></span></th>
                    <th scope="col" className="num">Won</th>
                    <th scope="col" className="num">Lost</th>
                    <th scope="col" className="num">Net</th>
                    <th scope="col" className="num">Unforced</th>
                  </tr>
                </thead>
                <tbody>
                  {yourLosing.map(s => (
                    <tr key={s.key}>
                      <th scope="row">{s.shot} <span className="ma-hand">{handLabel(s.hand)}</span></th>
                      <td>
                        <Diverge left={s.lost} right={s.won} max={yourMax} leftClass="ma-fill-opp" rightClass="ma-fill-you"
                          title={`${shotName(s)}: winning shot ${s.won}, losing shot ${s.lost}`} />
                      </td>
                      <td className="num">{s.won}</td>
                      <td className="num">{s.lost}</td>
                      <td className="num strong">{signed(s.won - s.lost)}</td>
                      <td className={`num${a.unforced.recorded ? '' : ' ma-faint'}`}>{a.unforced.recorded ? s.unforced : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {yourWinningOnly.length > 0 && (
                <p className="ma-table-note">Also winning shots only: {listShots(yourWinningOnly, s => s.won)}.</p>
              )}
            </div>
            <div className="ma-grid pairs">
              <div className="ma-card">{handRow('Backhand, excluding serves', a.hands.player.bh)}</div>
              <div className="ma-card">{handRow('Forehand, excluding serves', a.hands.player.fh)}</div>
            </div>
          </section>

          <section aria-labelledby="ma-opp" className="ma-section">
            <div className="ma-section-head">
              <h2 id="ma-opp">Scouting the opponent</h2>
              <p>Their winning and losing shots. A losing shot here is a point to you.</p>
            </div>
            <div className="ma-grid halves">
              <div className="ma-card ma-table-card">
                <table className="ma-table" style={{ minWidth: 380 }}>
                  <caption>Their shots</caption>
                  <thead>
                    <tr>
                      <th scope="col">Shot</th>
                      <th scope="col" className="bar-col"><span className="ma-split-head"><span>Losing shot</span><span>Winning shot</span></span></th>
                      <th scope="col" className="num">Won · Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theirMain.map(s => (
                      <tr key={s.key}>
                        <th scope="row">{s.shot} <span className="ma-hand">{handLabel(s.hand)}</span></th>
                        <td>
                          <Diverge left={s.lost} right={s.won} max={theirMax} leftClass="ma-fill-you" rightClass="ma-fill-opp"
                            title={`${shotName(s)}: their winning shot ${s.won}, their losing shot ${s.lost}`} />
                        </td>
                        <td className="num">{s.won} · {s.lost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {theirOther.length > 0 && (
                  <p className="ma-table-note">Also once each: {theirOther.map(s => `${s.shot.toLowerCase()}${s.hand ? ` ${handLabel(s.hand)}` : ''} (${s.won ? 'winning' : 'losing'})`).join(', ')}.</p>
                )}
              </div>
              <div className="ma-list">
                <div className="ma-card ma-list">
                  <h3>Their forehand and backhand</h3>
                  {handRow('Forehand, excluding serves', a.hands.opponent.fh)}
                  {handRow('Backhand, excluding serves', a.hands.opponent.bh)}
                </div>
                <div className="ma-card ma-list">
                  <h3>Their serve</h3>
                  <p className="ma-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    You won {a.onReceive.won} of {a.onReceive.won + a.onReceive.lost} points on their serve.
                    {' '}The serve was their winning shot {theirServeWins === 1 ? 'once' : `${theirServeWins} times`}, and they made {theirFaults === 0 ? 'no service faults' : theirFaults === 1 ? 'one service fault' : `${theirFaults} service faults`}.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="ma-footer" data-html2canvas-ignore="true">
        <button type="button" className="ma-button primary" onClick={exportToPDF} disabled={isExporting}>
          {isExporting ? 'Exporting PDF...' : 'Export to PDF'}
        </button>
        {isOwnerView && (
          <button type="button" className="ma-button" onClick={handleShare} disabled={shareSuccess}>
            {shareSuccess ? 'Link copied' : 'Share analysis'}
          </button>
        )}
        {isOwnerView && match.share_token && (
          <button type="button" className="ma-button" onClick={handleStopSharing}>Stop sharing</button>
        )}
        {isOwnerView && <Link to={editorPath} className="ma-link">Edit points</Link>}
        {isSharedView
          ? <Link to="/" className="ma-link">Go to home</Link>
          : <Link to="/matches" className="ma-link">Back to matches</Link>}
      </footer>
      {shareError && <div className="error-message">{shareError}</div>}
      {manualShareUrl && (
        <div className="share-link-manual">
          <label htmlFor="share-link">Copy this link to share:</label>
          <input id="share-link" type="text" readOnly value={manualShareUrl} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );

  return wrap(analysisContent);
};

export default MatchAnalysis;
