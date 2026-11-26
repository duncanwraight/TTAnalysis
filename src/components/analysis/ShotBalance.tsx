import { ROLES, ROLE_LABEL, type Balance, type BalanceSide, type Role } from '../../lib/analysis';

const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);

const RoleCard = ({ title, side, yours, shown }: { title: string; side: BalanceSide; yours: boolean; shown: Set<Role> }) => (
  <div className="card sb-side">
    <div className="sb-side-head">
      <h3>{title}</h3>
      <span className="ma-small muted">{side.total} winning and losing shots</span>
    </div>
    {side.roles.filter(r => shown.has(r.role)).map(r => {
      const count = r.won + r.lost;
      const share = pct(count, side.total);
      return (
        <div key={r.role} className="sb-role">
          <div className="sb-role-head">
            <span className="sb-role-name">{ROLE_LABEL[r.role]}</span>
            <span><strong>{count}</strong> <span className="muted">({share}%)</span></span>
          </div>
          <div className="sb-track" aria-hidden="true">
            <div className={yours ? 'ma-fill-you' : 'ma-fill-opp'} style={{ width: `${share}%` }} />
          </div>
          <span className="ma-small muted">Won {r.won}, lost {r.lost}</span>
        </div>
      );
    })}
  </div>
);

/** Shot balance: each side's winning and losing shots by role, and by shot. */
const ShotBalance = ({ balance }: { balance: Balance }) => {
  const max = Math.max(1, ...balance.shots.map(s => Math.max(s.player, s.opponent)));
  const width = (n: number) => (n === 0 ? '0' : `${Math.max(2, (100 * n) / max)}%`);
  // A role neither side had (often defence) is left out of both cards, so they stay lined up
  const shown = new Set(ROLES.filter((_, i) =>
    [balance.player, balance.opponent].some(side => side.roles[i].won + side.roles[i].lost > 0)));
  return (
    <>
      <div className="ma-grid halves">
        <RoleCard title="You" side={balance.player} yours shown={shown} />
        <RoleCard title="Opponent" side={balance.opponent} yours={false} shown={shown} />
      </div>

      {balance.standouts.length > 0 && (
        <div className="card sb-standouts">
          <h3>What stands out</h3>
          <ul>
            {balance.standouts.map(text => <li key={text}>{text}</li>)}
          </ul>
        </div>
      )}

      <div className="card sb-shots">
        <div className="sb-side-head">
          <h3>By shot</h3>
          <span className="ma-small muted">Winning and losing shots together, serves left out</span>
        </div>
        <table className="sb-table">
          <thead>
            <tr>
              <th scope="col" className="sb-you">You</th>
              <th scope="col" className="sb-shot"><span className="sr-only">Shot</span></th>
              <th scope="col" className="sb-opp">Opponent</th>
            </tr>
          </thead>
          {ROLES.map(role => {
            const rows = balance.shots.filter(s => s.role === role);
            if (rows.length === 0) return null;
            return (
              <tbody key={role}>
                  <tr className="sb-group">
                    <th scope="rowgroup" colSpan={3}>{ROLE_LABEL[role]}</th>
                  </tr>
                  {rows.map(s => (
                    <tr key={s.key} className="sb-row">
                      <td className="sb-you">
                        <div className="sb-cell">
                          <span className={`sb-num${s.player === 0 ? ' sb-zero' : ''}`}>{s.player}</span>
                          <span className="sb-lane"><span className="sb-bar ma-fill-you" style={{ width: width(s.player) }} /></span>
                        </div>
                      </td>
                      <th scope="row" className="sb-shot">{s.shot}</th>
                      <td className="sb-opp">
                        <div className="sb-cell">
                          <span className="sb-lane"><span className="sb-bar ma-fill-opp" style={{ width: width(s.opponent) }} /></span>
                          <span className={`sb-num${s.opponent === 0 ? ' sb-zero' : ''}`}>{s.opponent}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </>
  );
};

export default ShotBalance;
