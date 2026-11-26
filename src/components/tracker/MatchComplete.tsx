import { Link } from 'react-router';
import type { SetScore } from '../../lib/scoring';

type MatchCompleteProps = {
  matchId: string;
  playerName: string;
  opponentName: string;
  sets: SetScore[];
  canUndo: boolean;
  undoesEndSet: boolean;
  onUndo: () => void;
  busy: boolean;
};

const MatchComplete = ({ matchId, playerName, opponentName, sets, canUndo, undoesEndSet, onUndo, busy }: MatchCompleteProps) => {
  const won = sets.filter(s => s.playerScore > s.opponentScore).length;
  const lost = sets.filter(s => s.opponentScore > s.playerScore).length;
  const subject = playerName === 'You' ? 'You' : playerName;
  const verb = won > lost ? 'won' : won < lost ? 'lost' : 'drew';

  return (
    <div className="page narrow">
      <div className="card match-complete">
        <span className="eyebrow">Match complete</span>
        <h1>{subject} {verb} {won}–{lost}</h1>
        <p className="muted">against {opponentName}</p>
        <ul className="match-complete-sets" aria-label="Set scores">
          {sets.map((s, i) => (
            <li key={i} className={`chip ${s.playerScore > s.opponentScore ? 'you' : 'opp'}`}>
              <span className="faint">Set {i + 1}</span> {s.playerScore}–{s.opponentScore}
            </li>
          ))}
        </ul>
        <div className="form-actions">
          <Link to={`/matches/${matchId}/analysis`} className="btn primary">See the analysis</Link>
          <Link to={`/matches/${matchId}/points`} className="btn">Edit points and sweeps</Link>
          <Link to="/matches" className="btn quiet">Back to matches</Link>
        </div>
        {canUndo && (
          <p className="match-complete-undo">
            Ended by mistake?{' '}
            <button type="button" className="link-button" onClick={onUndo} disabled={busy}>
              {undoesEndSet ? 'Undo End Set and reopen the match' : 'Undo the last point and reopen the match'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default MatchComplete;
