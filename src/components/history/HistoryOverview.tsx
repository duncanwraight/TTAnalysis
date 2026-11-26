import { Link } from 'react-router';
import { formatRatio, pct, ratioValue, type History, type HistoryRow, type Trend } from '../../lib/history';
import type { Tally } from '../../lib/analysis';
import { longDate } from './format';

const total = (t: Tally) => t.won + t.lost;
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 'es'}`;

export const ResultLabel = ({ row }: { row: Pick<HistoryRow, 'result' | 'sets'> }) => (
  <span className={`ph-result ${row.result ?? ''}`}>
    {row.result === 'won' ? 'Won' : row.result === 'lost' ? 'Lost' : 'Unfinished'} {row.sets.won}–{row.sets.lost}
  </span>
);

/** The chart's range: points, serve and receive rarely leave 20–80%, so they get room to show a move. */
const range = (t: Trend): [number, number] => {
  if (t.unit === 'per10') {
    const top = Math.max(2, ...t.values.flatMap(v => (v ? [Math.ceil(ratioValue(v, 'per10'))] : [])));
    return [0, top];
  }
  return ['points', 'serve', 'receive'].includes(t.key) ? [20, 80] : [0, 100];
};

const EMPTY_NOTE: Partial<Record<Trend['key'], string>> = {
  close: 'No set has reached 8-all yet.',
  unforced: "Confirm a match's unforced errors in its points editor to see this.",
  attackFirst: 'Finish the attacked first sweep on a match to see this.',
};

const TrendTile = ({ trend, rows }: { trend: Trend; rows: HistoryRow[] }) => {
  const n = rows.length;
  const [lo, hi] = range(trend);
  const x = (i: number) => (n === 1 ? 50 : 3 + (i * 94) / (n - 1));
  const y = (v: number) => (1 - Math.max(0, Math.min(1, (v - lo) / (hi - lo)))) * 100;
  const unit = trend.unit === 'per10' ? ' per 10 points' : '';
  const basis = trend.counted === n
    ? `All ${n} ${n === 1 ? 'match' : 'matches'}`
    : `${trend.countedWord ? trend.countedWord[0].toUpperCase() + trend.countedWord.slice(1) : 'Counted'} in ${trend.counted} of ${n}`;
  const segment = (idx: number[], r: Trend['recent'], earlier: boolean) => {
    if (!r || idx.length === 0) return null;
    const left = x(idx[0]) - 2;
    const right = x(idx[idx.length - 1]) + 2;
    return (
      <div
        className={`ph-chart-avg${earlier ? ' earlier' : ''}`}
        style={{ left: `${left}%`, width: `${right - left}%`, top: `${y(ratioValue(r, trend.unit))}%` }}
      />
    );
  };
  const mid = trend.unit === 'per10' ? 1 : 50;
  const k = trend.recentIdx.length;

  return (
    <div className="card ph-trend" id={`trend-${trend.key}`}>
      <div className="ph-trend-head">
        <h3>{trend.label}</h3>
        <span className="ph-trend-basis">{basis}</span>
      </div>
      {trend.recent ? (
        <>
          <div className="ph-trend-value">
            <strong>{formatRatio(trend.recent, trend.unit)}</strong>
            <span>{unit ? 'per 10 points, ' : ''}{trend.earlier ? `last ${plural(k, 'match')}` : trend.counted === n ? `across all ${plural(n, 'match')}` : `across ${plural(trend.counted, 'match')}`}</span>
          </div>
          <div className="ph-trend-compare">
            {trend.earlier ? `${formatRatio(trend.earlier, trend.unit)}${unit} in the ${k} before` : 'Too few matches to compare yet'}
          </div>
          <div className="ph-chart" role="img" aria-label={`${trend.label}, one dot per match, oldest first`}>
            <div className="ph-chart-mid" style={{ top: `${y(mid)}%` }} />
            {/* The lines only mean something when there are two halves to compare */}
            {trend.earlier && segment(trend.earlierIdx, trend.earlier, true)}
            {trend.earlier && segment(trend.recentIdx, trend.recent, false)}
            {trend.values.map((v, i) => {
              const row = rows[i];
              if (!v) return <span key={row.id} className="ph-dot gap" style={{ left: `${x(i)}%`, top: '100%' }} title={`${shortDate(row.date)}: not counted`} />;
              const value = ratioValue(v, trend.unit);
              return (
                <span
                  key={row.id}
                  className={`ph-dot ${row.result === 'won' ? 'won' : row.result === null ? 'open' : ''}`}
                  style={{ left: `${x(i)}%`, top: `${y(value)}%` }}
                  title={`${shortDate(row.date)} v ${row.opponentName}: ${formatRatio(v, trend.unit)}`}
                />
              );
            })}
          </div>
          <div className="ph-chart-axis" aria-hidden="true">
            <span>{shortDate(rows[0].date)}</span>
            {n > 1 && <span>{shortDate(rows[n - 1].date)}</span>}
          </div>
        </>
      ) : (
        <p className="ph-trend-empty">{EMPTY_NOTE[trend.key] ?? 'Nothing to show yet.'}</p>
      )}
    </div>
  );
};

type Props = {
  history: History;
  styleName: (row: HistoryRow) => string;
  matchPath: (id: string) => string;
  tabPath: (tab: 'overview' | 'shots' | 'opponents') => string;
};

const HistoryOverview = ({ history, styleName, matchPath, tabPath }: Props) => {
  const { totals, rows } = history;
  const finished = total(totals.results);
  return (
    <>
      <section className="ph-totals" aria-label="Totals">
        <div className="card ph-total">
          <span className="ph-total-label">Matches</span>
          <span className="ph-total-value">{totals.results.won}–{totals.results.lost}</span>
          <span className="ph-total-note">{finished === rows.length ? 'won and lost' : `won and lost, ${rows.length - finished} unfinished`}</span>
        </div>
        <div className="card ph-total">
          <span className="ph-total-label">Sets</span>
          <span className="ph-total-value">{totals.sets.won}–{totals.sets.lost}</span>
          <span className="ph-total-note">{pct(totals.sets)}% won</span>
        </div>
        <div className="card ph-total">
          <span className="ph-total-label">Points won</span>
          <span className="ph-total-value">{pct(totals.points)}%</span>
          <span className="ph-total-note">{totals.points.won} of {total(totals.points)}</span>
        </div>
        <div className="card ph-total">
          <span className="ph-total-label">On serve</span>
          <span className="ph-total-value">{pct(totals.onServe)}%</span>
          <span className="ph-total-note">{totals.onServe.won} of {total(totals.onServe)}</span>
        </div>
        <div className="card ph-total">
          <span className="ph-total-label">On receive</span>
          <span className="ph-total-value">{pct(totals.onReceive)}%</span>
          <span className="ph-total-note">{totals.onReceive.won} of {total(totals.onReceive)}</span>
        </div>
      </section>

      {history.standouts.length > 0 && (
        <section className="ph-section">
          <h2>What stands out</h2>
          <div className="ph-standouts">
            {history.standouts.map(s => (
              <div key={s.title} className="card ph-standout">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {s.tab === 'overview'
                  ? <a href={`#trend-${s.metric}`}>See the trend</a>
                  : <Link to={tabPath(s.tab)}>{s.tab === 'shots' ? 'See shots' : 'See opponents'}</Link>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ph-section">
        <h2>Over time</h2>
        <p className="ph-section-note">
          One dot per match, oldest on the left. The lines are the last 5 matches and the 5 before them (half and half with fewer than 10), with their points counted together rather than averaged. A match that wasn't tagged or confirmed shows as a grey dot on the bottom line.
        </p>
        <div className="ph-trends">
          {history.trends.map(t => <TrendTile key={t.key} trend={t} rows={rows} />)}
        </div>
        <div className="ph-legend">
          <span><span className="ph-key dot" />Match won</span>
          <span><span className="ph-key dot lost" />Match lost</span>
          <span><span className="ph-key dot gap" />Not counted</span>
          <span><span className="ph-key line" />Recent matches</span>
          <span><span className="ph-key line earlier" />The ones before</span>
          <span><span className="ph-key line mid" />50%, or 1 per 10 points</span>
        </div>
      </section>

      <section className="ph-section">
        <h2>Matches</h2>
        <div className="card table-card">
          <table className="data-table ph-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Opponent</th>
                <th scope="col">Their style</th>
                <th scope="col">Result</th>
                <th scope="col" className="num">Points won</th>
                <th scope="col" className="num">On receive</th>
                <th scope="col"><span className="sr-only">Analysis</span></th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map(r => (
                <tr key={r.id}>
                  <td>{longDate(r.date)}</td>
                  <th scope="row">{r.opponentName}</th>
                  <td className="muted">{styleName(r)}</td>
                  <td><ResultLabel row={r} /></td>
                  <td className="num">{pct(r.points)}%</td>
                  <td className="num">{pct(r.onReceive)}%</td>
                  <td><Link to={matchPath(r.id)}>Analysis</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default HistoryOverview;
