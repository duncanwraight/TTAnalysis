import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import Layout from '../components/Layout';
import HistoryOverview from '../components/history/HistoryOverview';
import HistoryShots from '../components/history/HistoryShots';
import HistoryOpponents from '../components/history/HistoryOpponents';
import { useApi } from '../lib/useApi';
import type { HistoryData } from '../lib/api';
import { buildAnalysis } from '../lib/analysis';
import { DEFAULT_FILTERS, buildHistory, filterMatches, type HistoryFilters, type HistoryMatch, type HistoryRow } from '../lib/history';
import { describeHandAndRubbers, opponentKit } from '../lib/styles';
import { cleanText } from '../lib/matchDetails';
import '../styles/components/PlayerHistory.css';

type Tab = 'overview' | 'shots' | 'opponents';

const RANGES: { months: number | null; label: string }[] = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
  { months: null, label: 'All' },
];

const longDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** Sharing a player's history: the link, Copy and Stop sharing. Owner only. */
const ShareDialog = ({ name, token, busy, error, onShare, onStop, onClose }: {
  name: string; token: string | null; busy: boolean; error: string | null;
  onShare: () => void; onStop: () => void; onClose: () => void;
}) => {
  const url = token ? `${window.location.origin}/shared/history/${token}` : '';
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is in the box to copy by hand
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card dialog ph-share-dialog" role="dialog" aria-modal="true" aria-labelledby="ph-share-title">
        <h2 id="ph-share-title">Share {name}'s history</h2>
        <p className="muted">Anyone with the link can see the history and each match's analysis, as they are now and as new matches are added.</p>
        <ul>
          <li>They won't see the player's notes or your corrections to any coach's summary.</li>
          <li>Coach's summaries are shown where a match has one.</li>
          <li>Stop sharing and the link stops working straight away.</li>
        </ul>
        {error && <div className="notice error">{error}</div>}
        {token ? (
          <label className="field" htmlFor="ph-share-url">
            <span>Link</span>
            <span className="ph-share-link">
              <input id="ph-share-url" type="text" readOnly value={url} onFocus={e => e.target.select()} />
              <button type="button" className="btn primary" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            </span>
          </label>
        ) : null}
        <div className="ph-share-actions">
          {token
            ? <button type="button" className="btn danger" onClick={onStop} disabled={busy}>Stop sharing</button>
            : <button type="button" className="btn primary" onClick={onShare} disabled={busy}>{busy ? 'Creating the link...' : 'Create a link'}</button>}
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

const PlayerHistory = () => {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const location = useLocation();
  const api = useApi();
  const isShared = location.pathname.startsWith('/shared/history/');
  const base = isShared ? `/shared/history/${token}` : `/players/${id}/history`;
  const tab: Tab = location.pathname.endsWith('/shots') ? 'shots' : location.pathname.endsWith('/opponents') ? 'opponents' : 'overview';
  const tabPath = (t: Tab) => (t === 'overview' ? base : `${base}/${t}`);
  const matchPath = (matchId: string) => (isShared ? `${base}/matches/${matchId}` : `/matches/${matchId}/analysis`);

  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [sharing, setSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    const load = isShared ? api.history.getSharedHistory(token ?? '') : api.history.getHistory(id ?? '');
    load
      .then(d => { if (live) setData(d); })
      .catch(err => {
        console.error('Failed to load the history:', err);
        if (live) setError(isShared ? 'This shared link is invalid or sharing has been turned off.' : 'The history did not load. Try again later.');
      });
    return () => { live = false; };
  }, [api, id, token, isShared]);

  // Each match's analysis, built once; the filters only choose between them
  const matches: HistoryMatch[] = useMemo(() => (data?.matches ?? []).map(({ match, sets, points }) => ({
    id: match.id,
    date: match.date,
    opponentName: match.opponent_name,
    event: cleanText(match.event),
    isComplete: !!match.is_complete,
    opponentKit: opponentKit(match),
    analysis: buildAnalysis({
      initialServer: match.initial_server ?? 'player',
      sets,
      points,
      shots: data!.shots,
      confirmed: match.confirmed_tags ?? [],
    }),
  })), [data]);

  const events = useMemo(() => [...new Set(matches.flatMap(m => (m.event ? [m.event] : [])))].sort(), [matches]);
  const filtered = useMemo(() => filterMatches(matches, filters, new Date()), [matches, filters]);
  const history = useMemo(() => (data ? buildHistory(filtered, data.styles.styles) : null), [filtered, data]);

  const wrap = (content: React.ReactNode) => <Layout>{content}</Layout>;

  if (error) {
    return wrap(
      <div className="state">
        <h2>{isShared ? 'This link no longer works' : 'The history did not load'}</h2>
        <p>{error}</p>
        <div className="form-actions">
          <Link className="btn primary" to={isShared ? '/' : '/players'}>{isShared ? 'Go to home' : 'Back to players'}</Link>
        </div>
      </div>
    );
  }
  if (!data || !history) return wrap(<div className="state" role="status"><p>Loading the history...</p></div>);

  const { player } = data;
  const name = player.name;
  const style = data.styles.styles.find(s => s.id === player.style_id)?.name;
  const kit = describeHandAndRubbers(player);
  const styleName = (row: HistoryRow) => {
    const m = matches.find(x => x.id === row.id);
    const s = m && data.styles.styles.find(x => x.id === m.opponentKit.style_id)?.name;
    const rest = m ? describeHandAndRubbers(m.opponentKit) : '';
    return [s, rest].filter(Boolean).join(', ') || 'Not set';
  };
  const rows = history.rows;
  const span = rows.length > 0
    ? `${rows.length} ${rows.length === 1 ? 'match' : 'matches'}${rows.length > 1 ? ` from ${longDate(rows[0].date)} to ${longDate(rows[rows.length - 1].date)}` : ` on ${longDate(rows[0].date)}`}.`
    : 'No matches with these filters.';

  const share = async () => {
    setShareBusy(true);
    setShareError(null);
    try {
      const t = await api.history.enableSharing(player.id);
      setData(d => (d ? { ...d, player: { ...d.player, share_token: t } } : d));
    } catch (err) {
      console.error('Failed to share the history:', err);
      setShareError('The link could not be created. Try again.');
    } finally {
      setShareBusy(false);
    }
  };
  const stopSharing = async () => {
    setShareBusy(true);
    setShareError(null);
    try {
      await api.history.disableSharing(player.id);
      setData(d => (d ? { ...d, player: { ...d.player, share_token: null } } : d));
    } catch (err) {
      console.error('Failed to stop sharing the history:', err);
      setShareError('Sharing could not be stopped. Try again.');
    } finally {
      setShareBusy(false);
    }
  };

  return wrap(
    <div className="ph">
      <div className="page-head">
        <div>
          {!isShared && <Link to="/players" className="back-link">Players</Link>}
          <h1>{name}'s matches</h1>
          <p className="ph-sub">{span}{(style || kit) && ` ${[style, kit].filter(Boolean).join(', ')}.`}{isShared && ' Read-only.'}</p>
        </div>
        {!isShared && (
          <div className="page-head-actions">
            <button type="button" className="btn" onClick={() => setSharing(true)}>{player.share_token ? 'Shared' : 'Share'}</button>
          </div>
        )}
      </div>

      {data.matches.length === 0 ? (
        <div className="state">
          <h2>No matches yet</h2>
          <p>Once {name}'s matches are entered, their history shows here.</p>
        </div>
      ) : (
        <>
          <div className="ph-filters">
            <div className="segmented compact" role="group" aria-label="Date range">
              {RANGES.map(r => (
                <button key={r.label} type="button" aria-pressed={filters.months === r.months} onClick={() => setFilters(f => ({ ...f, months: r.months }))}>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={filters.finishedOnly} onChange={e => setFilters(f => ({ ...f, finishedOnly: e.target.checked }))} />
              Finished matches only
            </label>
            {events.length > 0 && (
              <label className="field" htmlFor="ph-event">
                <span>Event</span>
                <select id="ph-event" value={filters.event ?? ''} onChange={e => setFilters(f => ({ ...f, event: e.target.value || null }))}>
                  <option value="">All events</option>
                  {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </label>
            )}
          </div>

          <nav className="ph-tabs" aria-label="History sections">
            <Link to={tabPath('overview')} className="ph-tab" aria-current={tab === 'overview' ? 'page' : undefined}>Overview</Link>
            <Link to={tabPath('shots')} className="ph-tab" aria-current={tab === 'shots' ? 'page' : undefined}>Shots</Link>
            <Link to={tabPath('opponents')} className="ph-tab" aria-current={tab === 'opponents' ? 'page' : undefined}>Opponents</Link>
          </nav>

          {rows.length === 0 ? (
            <div className="state">
              <h2>No matches with these filters</h2>
              <p>Try a longer date range, or include unfinished matches.</p>
            </div>
          ) : tab === 'shots' ? (
            <HistoryShots history={history} playerName={name} />
          ) : tab === 'opponents' ? (
            <HistoryOpponents history={history} playerName={name} styleName={styleName} matchPath={matchPath} />
          ) : (
            <HistoryOverview history={history} styleName={styleName} matchPath={matchPath} tabPath={tabPath} />
          )}
        </>
      )}

      {sharing && (
        <ShareDialog
          name={name}
          token={player.share_token ?? null}
          busy={shareBusy}
          error={shareError}
          onShare={share}
          onStop={stopSharing}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
};

export default PlayerHistory;
