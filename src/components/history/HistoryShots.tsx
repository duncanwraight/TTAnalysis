import { useState } from 'react';
import { shotWithHand } from '../../lib/analysis';
import { MIN_SHOT_USES, type History, type HistoryRow, type HistoryShot } from '../../lib/history';
import { longDate } from './format';
import HelpLink from '../HelpLink';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

const ShotTable = ({ shots, rows, theirs, unforcedMatches }: { shots: HistoryShot[]; rows: HistoryRow[]; theirs: boolean; unforcedMatches: number }) => {
  const maxNet = Math.max(1, ...shots.map(s => Math.abs(s.won - s.lost)));
  return (
    <div className="card table-card">
      <table className="data-table ph-table">
        <thead>
          <tr>
            <th scope="col">Shot</th>
            <th scope="col" className="num">Won</th>
            <th scope="col" className="num">Lost</th>
            <th scope="col">Net</th>
            {!theirs && <th scope="col" className="num">Unforced<small>{unforcedMatches} {unforcedMatches === 1 ? 'match' : 'matches'}</small></th>}
            <th scope="col">Each match, oldest first</th>
            <th scope="col" className="num">Lost more in</th>
          </tr>
        </thead>
        <tbody>
          {shots.map(s => {
            const net = s.won - s.lost;
            const width = (Math.abs(net) / maxNet) * 50;
            return (
              <tr key={s.key}>
                <th scope="row">{shotWithHand(s.shot, s.hand)}</th>
                <td className="num">{s.won}</td>
                <td className="num">{s.lost}</td>
                <td>
                  <div className="ph-net" aria-hidden="true">
                    <div className={net < 0 ? 'lost' : ''} style={{ left: `${net < 0 ? 50 - width : 50}%`, width: `${width}%` }} />
                  </div>
                  <div className="ph-net-label">{signed(net)}</div>
                </td>
                {!theirs && <td className="num">{s.unforced}</td>}
                <td>
                  <div className="ph-strip">
                    {s.nets.map((n, i) => {
                      const when = `${longDate(rows[i].date)} v ${rows[i].opponentName}`;
                      if (n === null) return <span key={rows[i].id} className="ph-cell unused" title={`${when}: not used`} />;
                      return (
                        <span key={rows[i].id} className={`ph-cell ${n > 0 ? '' : n < 0 ? 'lost' : 'level'}`} title={`${when}: ${signed(n)}`}>
                          {signed(n)}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className={`num${s.used >= 4 && s.losingIn / s.used >= 0.6 ? ' ph-big' : ''}`}>{s.losingIn} of {s.used}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const HistoryShots = ({ history, playerName }: { history: History; playerName: string }) => {
  const [theirs, setTheirs] = useState(false);
  const all = theirs ? history.shots.opponent : history.shots.player;
  const main = all.filter(s => s.won + s.lost >= MIN_SHOT_USES);
  const other = all.filter(s => s.won + s.lost < MIN_SHOT_USES);
  const otherWon = other.reduce((n, s) => n + s.won, 0);
  const otherLost = other.reduce((n, s) => n + s.lost, 0);
  // With only a match or two, nothing reaches the cut-off, so show everything
  const shown = main.length > 0 ? main : all;
  const folded = main.length > 0 ? other : [];

  return (
    <section className="ph-section">
      <h2>Shots across every match</h2>
      <p className="ph-section-note">
        Won and lost count the points {theirs ? 'opponents' : playerName} won and lost with each shot. The strip shows the net in each match.{' '}
        <HelpLink page="player-history" heading="Shots" />
      </p>
      <div className="segmented compact" role="group" aria-label="Whose shots">
        <button type="button" aria-pressed={!theirs} onClick={() => setTheirs(false)}>{playerName === 'You' ? 'Your shots' : `${playerName}'s shots`}</button>
        <button type="button" aria-pressed={theirs} onClick={() => setTheirs(true)}>Opponents' shots</button>
      </div>
      {all.length === 0 ? (
        <p className="state">No shots entered yet.</p>
      ) : (
        <>
          <ShotTable shots={shown} rows={history.rows} theirs={theirs} unforcedMatches={history.unforcedMatches} />
          {folded.length > 0 && (
            <details className="ph-other">
              <summary>Other shots: won {otherWon}, lost {otherLost}, across {folded.length} shots used fewer than {MIN_SHOT_USES} times each</summary>
              <ShotTable shots={folded} rows={history.rows} theirs={theirs} unforcedMatches={history.unforcedMatches} />
            </details>
          )}
          <div className="ph-legend">
            <span><span className="ph-key cell" />Won more than lost in that match</span>
            <span><span className="ph-key cell lost" />Lost more than won</span>
            <span><span className="ph-key cell level" />Level</span>
            <span><span className="ph-key cell unused" />Not used</span>
          </div>
          {!theirs && (
            <p className="ph-section-note">Unforced errors only count matches where they're confirmed ({history.unforcedMatches} of {history.rows.length}).</p>
          )}
        </>
      )}
    </section>
  );
};

export default HistoryShots;
