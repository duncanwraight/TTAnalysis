import { useState } from 'react';
import { Link } from 'react-router';
import { pct, type GroupBy, type History, type HistoryRow, type OpponentGroup, type Totals } from '../../lib/history';
import type { Tally } from '../../lib/analysis';
import { ResultLabel } from './HistoryOverview';
import { longDate } from './format';
import HelpLink from '../HelpLink';

const total = (t: Tally) => t.won + t.lost;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** A group is this far off the player's overall figure before it's bold. */
const BIG_DIFF = 8;
/** Sets v points this far from level is bold. */
const BIG_GAP = 10;

const GROUP_BY: { by: GroupBy; label: string; head: string }[] = [
  { by: 'rubber', label: 'Rubbers', head: 'Their rubbers' },
  { by: 'style', label: 'Style of play', head: 'Their style' },
  { by: 'hand', label: 'Hand', head: 'Their hand' },
];

type Row = Pick<Totals, 'sets' | 'points' | 'onServe' | 'onReceive' | 'close'>;

const Figure = ({ t, overall, quiet, noDiff }: { t: Tally; overall: Tally; quiet: boolean; noDiff?: boolean }) => {
  if (total(t) === 0) return <span className="faint">None</span>;
  if (noDiff) return <>{pct(t)}% <span className="ph-diff" /></>;
  const d = pct(t) - pct(overall);
  const big = !quiet && Math.abs(d) >= BIG_DIFF;
  return <><span className={big ? 'ph-big' : undefined}>{pct(t)}%</span> <span className={`ph-diff${big ? ' big' : ''}`}>{signed(d)}</span></>;
};

const Cells = ({ row, overall, quiet, noDiff }: { row: Row; overall: Totals; quiet: boolean; noDiff?: boolean }) => {
  const gap = pct(row.sets) - pct(row.points);
  return (
    <>
      <td className="num">{row.sets.won}–{row.sets.lost} · <Figure t={row.sets} overall={overall.sets} quiet={quiet} noDiff={noDiff} /></td>
      <td className="num"><Figure t={row.points} overall={overall.points} quiet={quiet} noDiff={noDiff} /></td>
      <td className={`num${!quiet && Math.abs(gap) >= BIG_GAP ? ' ph-big' : ''}`}>{total(row.sets) > 0 ? signed(gap) : ''}</td>
      <td className="num"><Figure t={row.onServe} overall={overall.onServe} quiet={quiet} noDiff={noDiff} /></td>
      <td className="num"><Figure t={row.onReceive} overall={overall.onReceive} quiet={quiet} noDiff={noDiff} /></td>
      <td className="num"><Figure t={row.close} overall={overall.close} quiet={quiet} noDiff={noDiff} /></td>
    </>
  );
};

type Props = {
  history: History;
  playerName: string;
  styleName: (row: HistoryRow) => string;
  matchPath: (id: string) => string;
};

const HistoryOpponents = ({ history, playerName, styleName, matchPath }: Props) => {
  const [by, setBy] = useState<GroupBy>('rubber');
  const [selected, setSelected] = useState<string | null>(null);
  const groups = history.opponents[by];
  const head = GROUP_BY.find(g => g.by === by)!.head;
  const open: OpponentGroup | undefined = groups.find(g => g.key === selected);
  const openRows = open ? history.rows.filter(r => open.matchIds.includes(r.id)).reverse() : [];
  const you = playerName === 'You' ? 'you' : playerName;
  const overall = history.totals;

  return (
    <section className="ph-section">
      <h2>Against different opponents</h2>
      <p className="ph-section-note">
        Sets come first, because sets win matches. The small number is the difference from {playerName === 'You' ? 'your' : `${playerName}'s`} figure across all matches. Sets v points well below zero means {you} won points but not sets.{' '}
        <HelpLink page="player-history" heading="Opponents" />
      </p>
      <div className="segmented compact" role="group" aria-label="Group by">
        {GROUP_BY.map(g => (
          <button key={g.by} type="button" aria-pressed={by === g.by} onClick={() => { setBy(g.by); setSelected(null); }}>{g.label}</button>
        ))}
      </div>
      <div className="card table-card">
        <table className="data-table ph-table">
          <thead>
            <tr>
              <th scope="col">{head}</th>
              <th scope="col" className="num">Matches</th>
              <th scope="col">Won–lost</th>
              <th scope="col" className="num">Sets won</th>
              <th scope="col" className="num">Points won</th>
              <th scope="col" className="num">Sets v points</th>
              <th scope="col" className="num">On serve</th>
              <th scope="col" className="num">On receive</th>
              <th scope="col" className="num">Close finishes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="overall">
              <th scope="row">All matches</th>
              <td className="num">{history.rows.length}</td>
              <td>{overall.results.won}–{overall.results.lost}</td>
              <Cells row={overall} overall={overall} quiet noDiff />
            </tr>
            {groups.map(g => {
              const quiet = g.few || g.unset;
              return (
                <tr key={g.key} className={`${quiet ? 'quiet' : ''}${selected === g.key ? ' selected' : ''}`}>
                  <th scope="row">
                    <button type="button" className="ph-row-button" aria-expanded={selected === g.key} onClick={() => setSelected(selected === g.key ? null : g.key)}>
                      {g.label}
                    </button>
                    {g.few && !g.unset && <span className="chip small">Too few</span>}
                  </th>
                  <td className="num">{g.matchIds.length}</td>
                  <td>{g.results.won}–{g.results.lost}</td>
                  <Cells row={g} overall={overall} quiet={quiet} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {by === 'rubber' && <p className="ph-section-note">A match against two kinds of rubber, such as long pips and anti, counts in both.</p>}

      {open && (
        <div className="ph-section">
          <h3>{open.label}: {open.matchIds.length} {open.matchIds.length === 1 ? 'match' : 'matches'}</h3>
          <div className="card table-card">
            <table className="data-table ph-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Opponent</th>
                  <th scope="col">Their style</th>
                  <th scope="col">Result</th>
                  <th scope="col" className="num">Points won</th>
                  <th scope="col"><span className="sr-only">Analysis</span></th>
                </tr>
              </thead>
              <tbody>
                {openRows.map(r => (
                  <tr key={r.id}>
                    <td>{longDate(r.date)}</td>
                    <th scope="row">{r.opponentName}</th>
                    <td className="muted">{styleName(r)}</td>
                    <td><ResultLabel row={r} /></td>
                    <td className="num">{pct(r.points)}%</td>
                    <td><Link to={matchPath(r.id)}>Analysis</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default HistoryOpponents;
