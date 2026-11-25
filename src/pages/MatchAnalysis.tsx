import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import type { AnalysisData } from '../lib/api';
import { Analysis, Pattern, ServeStats, ShotCount, ShotRow, Tally, UNFORCED_ERROR_DEFINITION, buildAnalysis, shotWithHand } from '../lib/analysis';
import { ATTACK_DEFINITION, SWEEPS, unconfirmedTags, type SweepTag } from '../lib/sweeps';
import { cleanText, isSafeVideoUrl } from '../lib/matchDetails';
import { buildSummaryInput, hashInput } from '../lib/aiSummary';
import CoachSummary from '../components/analysis/CoachSummary';
import ShotBalance from '../components/analysis/ShotBalance';
import '../styles/components/MatchAnalysis.css';

const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const handLabel = (hand: string | null) => (hand ? hand.toUpperCase() : '');
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
  <div className={`card ma-tile${empty ? ' dashed' : ''}`}>
    <span className="ma-tile-label">{label}</span>
    <span className={`ma-tile-value${empty ? ' empty' : ''}`}>{value}{of && <> <small>{of}</small></>}</span>
    <span className="ma-tile-note">{note}</span>
  </div>
);

const PatternList = ({ title, patterns, yours }: { title: string; patterns: Pattern[]; yours: boolean }) => (
  <div className="card ma-list">
    <h3>{title}</h3>
    {patterns.length === 0 && <p className="ma-small muted">No pair happened three times or more.</p>}
    {patterns.map(p => (
      <div key={p.key} className="ma-run">
        <span className={`ma-run-badge ${yours ? 'you' : 'opp'}`} aria-label={`${p.count} times`}>{p.count}</span>
        <span>
          {shotWithHand(p.winningShot, p.winningHand)} against {yours ? 'their' : 'your'} {shotWithHand(p.losingShot, p.losingHand).toLowerCase()}
        </span>
        <span />
      </div>
    ))}
  </div>
);

const countList = (counts: ShotCount[]) => counts.map(c => `${c.shot.toLowerCase()} ${c.count}`).join(', ');

/** One side's serve: what the serve and the receive decided, and the rest. */
const ServeCard = ({ title, stats, yours }: { title: string; stats: ServeStats; yours: boolean }) => {
  const total = stats.points.won + stats.points.lost;
  const youWon = yours ? stats.points.won : stats.points.lost;
  const rallies = stats.rally.won + stats.rally.lost;
  const ralliesYouWon = yours ? stats.rally.won : stats.rally.lost;
  const [server, receiver] = yours ? ['Your', 'Their'] : ['Their', 'Your'];
  const receiveWon = stats.receiveWon.reduce((n, c) => n + c.count, 0);
  const missed = [
    stats.receiveMissed.length > 0 && `${receiver} missed receives: ${countList(stats.receiveMissed)}.`,
    stats.notReturned > 0 && `Not returned: ${stats.notReturned}.`,
  ].filter(Boolean).join(' ');
  return (
    <div className="card ma-list">
      <h3>{title}</h3>
      <p className="ma-small muted">You won {youWon} of {total} points.</p>
      <div className="ma-pair-row"><span className="muted">{server} serve won the point</span><strong>{stats.serveWon}</strong></div>
      {missed && <p className="ma-small muted">{missed}</p>}
      <div className="ma-pair-row"><span className="muted">{receiver} receive won the point</span><strong>{receiveWon}</strong></div>
      {receiveWon > 0 && <p className="ma-small muted">With: {countList(stats.receiveWon)}.</p>}
      <div className="ma-pair-row"><span className="muted">{server} service faults</span><strong>{stats.faults}</strong></div>
      <div className="ma-pair-row"><span className="muted">Longer rallies</span><strong>You won {ralliesYouWon} of {rallies}</strong></div>
    </div>
  );
};

const count = (t: Tally) => t.won + t.lost;

/** Points won and lost as one full-width bar, like the stage bars. Won is blue, lost orange. */
const SplitRow = ({ label, tally, quiet }: { label: string; tally: Tally; quiet?: boolean }) => {
  const total = tally.won + tally.lost;
  return (
    <div className={`ma-split-row${quiet ? ' quiet' : ''}`}>
      <span className="ma-split-label">{label}</span>
      {total > 0 ? (
        <div className="ma-stage-bar" title={`Won ${tally.won}, lost ${tally.lost}`}>
          {tally.won > 0 && <div style={{ flex: `${tally.won} 1 0` }} />}
          {tally.lost > 0 && <div style={{ flex: `${tally.lost} 1 0` }} className={tally.won === 0 ? 'ma-fill-opp' : undefined} />}
        </div>
      ) : <div className="ma-split-empty" />}
      <span className="ma-split-count">{total > 0 ? <>Won <strong>{tally.won}</strong> of {total}</> : <span className="faint">None</span>}</span>
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
  const { user, aiSummariesEnabled, adminLoading } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Shown when the link can't be copied automatically
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);
  // Hash of the summary input for the match as it is now, to spot a stale summary
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isSharedView = location.pathname.startsWith('/shared/');
  const isOwnerView = !!user && !isSharedView;
  // The coach's summary is its own tab, at /matches/:id/summary or /shared/:token/summary
  const view: 'analysis' | 'summary' = location.pathname.endsWith('/summary') ? 'summary' : 'analysis';
  const analysisPath = isSharedView ? `/shared/${token}` : `/matches/${id}/analysis`;
  const summaryPath = isSharedView ? `/shared/${token}/summary` : `/matches/${id}/summary`;

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
    confirmed: data.match.confirmed_tags ?? [],
  }), [data]);

  const [confirmError, setConfirmError] = useState<string | null>(null);
  // "That's all of them": the owner says every point for a tag is ticked
  const confirmTag = async (tag: SweepTag) => {
    if (!data) return;
    setConfirmError(null);
    const confirmed = [...new Set([...(data.match.confirmed_tags ?? []), tag])];
    try {
      await api.match.updateMatch(data.match.id, { confirmed_tags: confirmed });
      setData(prev => prev && { ...prev, match: { ...prev.match, confirmed_tags: confirmed } });
    } catch (err) {
      console.error('Failed to confirm the ticks:', err);
      setConfirmError('That did not save. Check your connection and try again.');
    }
  };

  useEffect(() => {
    if (!data || !analysis) return;
    let cancelled = false;
    hashInput(buildSummaryInput(data.match, analysis, data.shots))
      .then(hash => { if (!cancelled) setCurrentHash(hash); })
      .catch(() => { /* Without the hash the summary just never shows as out of date */ });
    return () => { cancelled = true; };
  }, [data, analysis]);

  // notes undefined keeps the saved notes; returns whether it worked
  const generateSummary = async (notes?: string) => {
    if (!id) return false;
    setSummaryError(null);
    setGenerating(true);
    try {
      const { notes: savedNotes, ...summary } = await api.match.generateSummary(id, notes);
      setData(prev => (prev ? { ...prev, summary, summaryNotes: savedNotes } : prev));
      return true;
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'The summary could not be written. Try again later.');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  const exportToPDF = async () => {
    if (!contentRef.current || !data) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const date = new Date(`${data.match.date}T00:00:00`).toLocaleDateString().replace(/\//g, '-');
      const options = {
        margin: 0.4,
        filename: `${view === 'summary' ? 'coach-summary' : 'match-analysis'}-${cleanText(data.match.player_name) ? `${cleanText(data.match.player_name)}-` : ''}${data.match.opponent_name}-${date}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
        // Not in html2pdf's types, but supported: keep cards and table rows whole
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.card', 'tr'] },
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

  const wrap = (content: React.ReactNode) => <Layout>{content}</Layout>;

  if (loading) {
    return wrap(<div className="state" role="status"><p>Loading the analysis...</p></div>);
  }

  if (error || !data || !analysis) {
    return wrap(
      <div className="state">
        <h2>{isSharedView ? 'This link no longer works' : 'The analysis did not load'}</h2>
        <p>{error ?? 'Failed to load analysis data'}</p>
        <div className="form-actions">
          <button className="btn primary" onClick={() => navigate(isSharedView ? '/' : '/matches')}>
            {isSharedView ? 'Go to home' : 'Back to matches'}
          </button>
        </div>
      </div>
    );
  }

  const { match } = data;
  const a = analysis;
  const editorPath = `/matches/${match.id}/points`;
  const totalPoints = a.points.won + a.points.lost;
  const setsResult = a.setsWon.won > a.setsWon.lost ? 'Won' : a.setsWon.won < a.setsWon.lost ? 'Lost' : 'Level';
  const eightAllTotal = a.fromEightAll.won + a.fromEightAll.lost;
  const chartScale = 48 / Math.max(4, ...a.sets.flatMap(s => s.gaps.map(Math.abs)));

  const yourLosing = a.shots.player.filter(s => s.lost > 0);
  const yourWinningOnly = a.shots.player.filter(s => s.lost === 0).sort((x, y) => y.won - x.won);
  const yourMax = Math.max(1, ...a.shots.player.map(s => Math.max(s.won, s.lost)));
  const theirMain = a.shots.opponent.filter(s => s.won + s.lost >= 2);
  const theirOther = a.shots.opponent.filter(s => s.won + s.lost < 2);
  const theirMax = Math.max(1, ...a.shots.opponent.map(s => Math.max(s.won, s.lost)));

  const handRow = (label: string, t: Tally) => (
    <div className="ma-pair-row"><span className="muted">{label}</span><strong>Won {t.won} · Lost {t.lost}</strong></div>
  );

  // Owners see the tab once AI summaries are on for them or a summary exists;
  // a shared link only when there's a summary to show
  const showSummaryTab = isSharedView ? !!data.summary : (aiSummariesEnabled || !!data.summary);
  const summaryStale = !!data.summary && !!currentHash && data.summary.input_hash !== currentHash;
  if (view === 'summary' && !showSummaryTab && !(isOwnerView && adminLoading)) {
    return <Navigate to={analysisPath} replace />;
  }

  const analysisContent = (
    <div className="ma" ref={contentRef}>
      <header className="ma-header">
        <div>
          <p className="eyebrow">Match analysis</p>
          <h1>{cleanText(match.player_name) ? `${cleanText(match.player_name)} vs ${match.opponent_name}` : `vs ${match.opponent_name}`}</h1>
          <p className="ma-meta">
            {[formatDate(match.date), cleanText(match.event), `Best of ${match.best_of}`].filter(Boolean).join(' · ')}
            {isSafeVideoUrl(match.video_url) && (
              <> · <a href={match.video_url} target="_blank" rel="noopener noreferrer">Watch the video</a></>
            )}
          </p>
        </div>
        <div className="ma-result">
          <p className="ma-result-text">{setsResult} {a.setsWon.won}–{a.setsWon.lost}</p>
          <div className="ma-chips">
            {a.sets.map(s => (
              <span key={s.setNumber} className={`chip ${s.playerScore > s.opponentScore ? 'you' : 'opp'}`}>
                {s.playerScore}–{s.opponentScore}
              </span>
            ))}
          </div>
        </div>
      </header>

      {showSummaryTab && (
        <nav className="ma-tabs" aria-label="Match views" data-html2canvas-ignore="true">
          <Link to={analysisPath} className="ma-tab" aria-current={view === 'analysis' ? 'page' : undefined}>Analysis</Link>
          <Link to={summaryPath} className="ma-tab" aria-current={view === 'summary' ? 'page' : undefined}>
            Coach's summary
            {summaryStale && isOwnerView && <span className="ma-tab-dot" role="img" aria-label="out of date" />}
          </Link>
        </nav>
      )}

      {view === 'summary' ? (
        <CoachSummary
          stored={data.summary}
          stale={summaryStale}
          canGenerate={isOwnerView && aiSummariesEnabled}
          isOwner={isOwnerView}
          totalPoints={totalPoints}
          generating={generating}
          error={summaryError}
          onGenerate={() => generateSummary()}
          savedNotes={data.summaryNotes}
          onRewrite={generateSummary}
        />
      ) : (<>
      <aside className="ma-note" aria-label="How points are entered">
        <strong>How to read this page.</strong> Each point has two shots: the winning shot, and the losing shot of the player who lost the point. The losing shot is either the one that set up the winner (they push, you loop past them) or the one that missed (you loop, they miss the block). Rally shots aren't entered, so the numbers only cover the last two shots of each point.
      </aside>

      {isOwnerView && unconfirmedTags(a.rows, match.confirmed_tags ?? []).map(({ tag, ticks }) => (
        <div key={tag} className="card ma-confirm" role="note" data-html2canvas-ignore="true">
          <div>
            <strong>
              {tag === 'unforced' ? `${ticks} unforced ${ticks === 1 ? 'error is' : 'errors are'} ticked`
                : `${SWEEPS[tag].name} is ticked on ${ticks} ${ticks === 1 ? 'point' : 'points'}`}. Is that all of them?
            </strong>
            <span>No sweep has been done for these, so some could be missing. Only you see this.</span>
            {confirmError && <span className="status error">{confirmError}</span>}
          </div>
          <div className="ma-confirm-actions">
            <button type="button" className="btn small" onClick={() => confirmTag(tag)}>That's all of them</button>
            <Link to={`/matches/${match.id}/sweep/${tag}`} className="btn small primary">Do a sweep</Link>
          </div>
        </div>
      ))}

      {totalPoints === 0 ? (
        <p className="muted">No points have been entered for this match yet.</p>
      ) : (
        <>
          <section aria-label="Headline numbers" className="ma-grid tiles">
            <Tile label="Points won" value={`${a.points.won}`} of={`of ${totalPoints}`}
              note={a.points.won === a.points.lost ? 'Equal points won' : `${pct(a.points.won, totalPoints)}% of points`} />
            <Tile label="On your serve" value={`${pct(a.onServe.won, a.onServe.won + a.onServe.lost)}%`}
              of={`${a.onServe.won} of ${a.onServe.won + a.onServe.lost}`} note="Points won while serving" />
            <Tile label="On their serve" value={`${pct(a.onReceive.won, a.onReceive.won + a.onReceive.lost)}%`}
              of={`${a.onReceive.won} of ${a.onReceive.won + a.onReceive.lost}`} note="Points won while receiving" />
            {eightAllTotal > 0 ? (
              <Tile label="From 8-all" value={`${a.fromEightAll.won}`} of={`of ${eightAllTotal}`} note="Points won with both players on 8 or more" />
            ) : (
              <Tile label="From 8-all" value="–" empty note="No set reached 8-all" />
            )}
            {a.unforced.recorded ? (
              <Tile label="Your unforced errors" value={`${a.unforced.total}`} of={`of ${a.points.lost} lost`}
                note={`${pct(a.unforced.total, a.points.lost)}% of the points you lost`} />
            ) : (
              <Tile label="Your unforced errors" value="–" empty
                note={isOwnerView ? <Link to={editorPath}>Tick them in the points editor</Link> : 'Not ticked for this match'} />
            )}
          </section>

          {a.cards.length > 0 && (
            <section aria-labelledby="cards" className="section">
              <h2 id="cards">Main findings</h2>
              <div className="ma-grid cards">
                {a.cards.map(card => (
                  <article key={card.title} className="card ma-finding">
                    <span className="ma-finding-tag">{card.tag}</span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="ma-serve" className="section">
            <div className="section-head">
              <h2 id="ma-serve">Serve and receive</h2>
              <p>The serve and the receive are the only shots in a rally that can be picked out. When the serve is the winning shot, the receive missed or wasn't returned. When the serve is the losing shot, the receive won the point.</p>
            </div>
            <div className="ma-grid halves">
              <ServeCard title="Your serve" stats={a.serveReceive.player} yours />
              <ServeCard title="Their serve" stats={a.serveReceive.opponent} yours={false} />
            </div>
            {a.earlyAttack && (() => {
              const ea = a.earlyAttack;
              return (
                <>
                  <div className="section-head">
                    <h3 className="ma-subhead">Attacking straight away</h3>
                    <p>
                      Includes third-ball attacks from your own serves, and whether or not you attacked your opponent's serves.
                      {!ea.confirmed && ' Not every point has been checked, so some may be missing.'}
                    </p>
                  </div>
                  <div className="ma-grid halves">
                    <div className="card ma-list">
                      <h3>After your serve</h3>
                      <p className="ma-small muted">Your serves that went past the receive.</p>
                      <SplitRow label="Third-ball attack" tally={ea.onServe.attacked} />
                      <SplitRow label="No third-ball attack" tally={ea.onServe.other} quiet />
                    </div>
                    <div className="card ma-list">
                      <h3>Receiving their serve</h3>
                      <p className="ma-small muted">Includes receives that won or lost the point, which the entered shots already show.</p>
                      <SplitRow label="Attacked their serve" tally={ea.onReceive.attacked} />
                      <SplitRow label="Didn't attack it" tally={ea.onReceive.other} quiet />
                    </div>
                  </div>
                </>
              );
            })()}
          </section>

          <section aria-labelledby="ma-you" className="section">
            <div className="section-head">
              <h2 id="ma-you">Your winning and losing shots</h2>
              <p>Most costly first. A service fault counts as your losing shot. Unforced counts the losing shots ticked as unforced.</p>
            </div>
            <div className="card table-card">
              <table className="data-table" style={{ minWidth: 640 }}>
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
                      <td className={`num${a.unforced.recorded ? '' : ' faint'}`}>{a.unforced.recorded ? s.unforced : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {yourWinningOnly.length > 0 && (
                <p className="ma-table-note">Also winning shots only: {listShots(yourWinningOnly, s => s.won)}.</p>
              )}
            </div>
            <div className="ma-grid pairs">
              <div className="card">{handRow('Backhand, excluding serves', a.hands.player.bh)}</div>
              <div className="card">{handRow('Forehand, excluding serves', a.hands.player.fh)}</div>
            </div>
          </section>

          <section aria-labelledby="ma-ue" className="section">
            <div className="section-head">
              <h2 id="ma-ue">Unforced errors</h2>
              <p className="ma-note ma-definition"><strong>What counts as unforced.</strong> {UNFORCED_ERROR_DEFINITION} If the other player made it hard to play your shot with spin, placement or speed, it is not an unforced error.</p>
            </div>
            {a.unforced.recorded ? (
              <>
                <div className="ma-grid tiles">
                  <Tile label="Unforced errors" value={`${a.unforced.total}`} of={`of ${a.points.lost} lost`}
                    note={`${pct(a.unforced.total, a.points.lost)}% of the points you lost`} />
                  <Tile label="Forced" value={`${a.points.lost - a.unforced.total}`} of={`of ${a.points.lost} lost`}
                    note="The opponent won the point" />
                  {a.fromEightAll.lost > 0 ? (
                    <Tile label="From 8-all" value={`${a.fromEightAll.unforced}`} of={`of ${a.fromEightAll.lost} lost`}
                      note="Unforced, at the close of sets" />
                  ) : (
                    <Tile label="From 8-all" value="–" empty note="No points lost from 8-all" />
                  )}
                </div>
                <div className="ma-grid pairs">
                  <div className="card ma-list">
                    <h3>By stage of the set</h3>
                    {[...a.stages, { label: 'From 8-all', ...a.fromEightAll }].filter(st => st.lost > 0 || st.label !== 'From 8-all').map(st => (
                      <div key={st.label} className="ma-pair-row"><span className="muted">{st.label}</span><strong>{st.unforced} of {st.lost} lost</strong></div>
                    ))}
                  </div>
                  <div className="card ma-list">
                    <h3>Serving and receiving</h3>
                    <div className="ma-pair-row"><span className="muted">On your serve</span><strong>{a.unforced.onServe} of {a.onServe.lost} lost</strong></div>
                    <div className="ma-pair-row"><span className="muted">On their serve</span><strong>{a.unforced.onReceive} of {a.onReceive.lost} lost</strong></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card dashed ma-empty">
                <div>
                  <h3>Not ticked for this match yet</h3>
                  <p>
                    {isOwnerView
                      ? `Go through your ${a.points.lost} lost points and tick the ones where your losing shot was unforced. This section then shows which shots let you down and when.`
                      : 'Unforced errors haven\'t been ticked for this match.'}
                  </p>
                </div>
                {isOwnerView && <Link to={editorPath} className="btn primary">Open the points editor</Link>}
              </div>
            )}
          </section>

          <section aria-labelledby="ma-patterns" className="section">
            <div className="section-head">
              <h2 id="ma-patterns">Patterns</h2>
              <p>A winning shot and the losing shot it was played against, when the same pair happened three times or more. Unforced errors are excluded.</p>
            </div>
            <div className="ma-grid halves">
              <PatternList title="How you won points" patterns={a.patterns.player} yours />
              <PatternList title="How they won points" patterns={a.patterns.opponent} yours={false} />
            </div>
          </section>

          {a.attackFirst && (() => {
            const af = a.attackFirst;
            const total = count(af.player) + count(af.opponent) + count(af.unclear);
            return (
              <section aria-labelledby="ma-first" className="section">
                <div className="section-head">
                  <h2 id="ma-first">Who attacked first</h2>
                  <p>
                    You attacked first in {count(af.player)} of {total} points and won {af.player.won} of them. {ATTACK_DEFINITION} Points you won are blue, points you lost orange.
                    {!af.confirmed && ' Not every point has been checked, so some may be missing.'}
                  </p>
                </div>
                <div className="ma-grid halves">
                  {(['player', 'opponent'] as const).map(server => (
                    <div key={server} className="card ma-list">
                      <h3>{server === 'player' ? 'On your serve' : 'On their serve'}</h3>
                      <SplitRow label="You attacked first" tally={af.byServer[server].player} />
                      <SplitRow label="They attacked first" tally={af.byServer[server].opponent} />
                      <SplitRow label="No attack in the last two shots" tally={af.byServer[server].unclear} quiet />
                    </div>
                  ))}
                </div>
                <p className="ma-small muted">Only the last two shots of each point are entered. In the last group, nobody attacked, or they attacked earlier in the rally and it ended with a push or a block.</p>
              </section>
            );
          })()}

          {(a.balance.player.total > 0 || a.balance.opponent.total > 0) && (
            <section aria-labelledby="ma-balance" className="section">
              <div className="section-head">
                <h2 id="ma-balance">Shot balance</h2>
                <p>Your winning and losing shots against theirs, by role: attack (loops, flicks), control at the table (pushes, blocks) and defence with backspin or from distance (chops, chop blocks, lobs).</p>
              </div>
              <ShotBalance balance={a.balance} />
            </section>
          )}

          <section aria-labelledby="ma-story" className="section">
            <div className="ma-story-head">
              <h2 id="ma-story">Match progression</h2>
              <div className="ma-legend">
                <span><span className="ma-swatch you" />Point to you</span>
                <span><span className="ma-swatch opp" />Point to opponent</span>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>Each chart shows the difference in score after every point. Above the line, you were ahead.</p>
            <div className="ma-grid sets">
              {a.sets.map(s => (
                <figure key={s.setNumber} className="card ma-set">
                  <figcaption>
                    <span>Set {s.setNumber}</span>
                    <span>{s.playerScore}–{s.opponentScore} <span className="muted" style={{ fontWeight: 500 }}>{s.playerScore > s.opponentScore ? 'won' : 'lost'}</span></span>
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
              <div className="card ma-list">
                <h3>Points by stage of the set</h3>
                {[...a.stages.map(st => ({ label: st.label, won: st.won, lost: st.lost })), { label: 'From 8-all', ...a.fromEightAll }]
                  .filter(st => st.won + st.lost > 0)
                  .map(st => (
                    <div key={st.label} className="ma-stage">
                      <span className="muted">{st.label}</span>
                      <div className="ma-stage-bar" title={`You ${st.won}, opponent ${st.lost}`}>
                        {st.won > 0 && <div style={{ flex: `${st.won} 1 0` }} />}
                        {st.lost > 0 && <div style={{ flex: `${st.lost} 1 0` }} className={st.won === 0 ? 'ma-fill-opp' : undefined} />}
                      </div>
                      <span className="ma-right">{st.won} of {st.won + st.lost}</span>
                    </div>
                  ))}
                <p className="ma-small faint">Stages count both players' points: "points 1–6" covers 3-3, 5-1 and 6-0 alike.</p>
              </div>
              <div className="card ma-list">
                <h3>Longest runs</h3>
                {a.runs.length === 0 && <p className="ma-small muted">No runs of 3 or more.</p>}
                {a.runs.slice(0, 4).map((r, i) => (
                  <div key={i} className="ma-run">
                    <span className={`ma-run-badge ${r.side === 'player' ? 'you' : 'opp'}`}>{r.length}</span>
                    <span>{r.side === 'player' ? 'You' : 'Opponent'}, from {r.fromPlayer}-{r.fromOpponent}</span>
                    <span className="ma-small muted">Set {r.setNumber}</span>
                  </div>
                ))}
                <p className="ma-small faint">
                  Lucky points (net or edge): {a.lucky.player === a.lucky.opponent ? `${a.lucky.player} each` : `you ${a.lucky.player}, opponent ${a.lucky.opponent}`}.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="ma-opp" className="section">
            <div className="section-head">
              <h2 id="ma-opp">Scouting the opponent</h2>
              <p>Their winning and losing shots. A losing shot here is a point to you.</p>
            </div>
            <div className="ma-grid halves">
              <div className="card table-card">
                <table className="data-table" style={{ minWidth: 380 }}>
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
                <div className="card ma-list">
                  <h3>Their forehand and backhand</h3>
                  {handRow('Forehand, excluding serves', a.hands.opponent.fh)}
                  {handRow('Backhand, excluding serves', a.hands.opponent.bh)}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      </>)}

      <footer className="ma-footer" data-html2canvas-ignore="true">
        <button type="button" className="btn primary" onClick={exportToPDF} disabled={isExporting}>
          {isExporting ? 'Exporting PDF...' : 'Export to PDF'}
        </button>
        {isOwnerView && (
          <button type="button" className="btn" onClick={handleShare} disabled={shareSuccess}>
            {shareSuccess ? 'Link copied' : 'Share analysis'}
          </button>
        )}
        {isOwnerView && match.share_token && (
          <button type="button" className="btn" onClick={handleStopSharing}>Stop sharing</button>
        )}
        {isOwnerView && <Link to={editorPath} className="btn quiet">Edit points</Link>}
        {isSharedView
          ? <Link to="/" className="btn quiet">Go to home</Link>
          : <Link to="/matches" className="btn quiet">Back to matches</Link>}
      </footer>
      {shareError && <div className="notice error">{shareError}</div>}
      {manualShareUrl && (
        <div className="field share-link-manual">
          <label htmlFor="share-link">Copy this link to share:</label>
          <input id="share-link" type="text" readOnly value={manualShareUrl} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );

  return wrap(analysisContent);
};

export default MatchAnalysis;
