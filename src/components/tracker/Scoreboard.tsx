import type { Point } from '../../types/database.types';
import type { SetScore, Side } from '../../lib/scoring';

type ScoreboardProps = {
  playerName: string;
  opponentName: string;
  currentSet: number;
  bestOf: number;
  score: SetScore;
  // Sets before the current one
  finishedSets: SetScore[];
  server: Side;
  // Points in the current set, oldest first
  setPoints: Point[];
  winner: Side | null;
  onPickWinner: (side: Side) => void;
  disabled?: boolean;
};

/**
 * The score, and the two buttons for who won the point. Each side of the
 * score is the button for that player, so recording starts on the biggest
 * thing on the screen.
 */
const Scoreboard = ({
  playerName, opponentName, currentSet, bestOf, score, finishedSets, server, setPoints, winner, onPickWinner, disabled = false,
}: ScoreboardProps) => {
  const setsWon = finishedSets.filter(s => s.playerScore > s.opponentScore).length;
  const setsLost = finishedSets.length - setsWon;

  const side = (key: Side, name: string, points: number, sets: number) => (
    <button
      type="button"
      className={`score-side ${key === 'player' ? 'you' : 'opp'}`}
      aria-pressed={winner === key}
      onClick={() => onPickWinner(key)}
      disabled={disabled}
    >
      <span className="score-side-top">
        <span className="score-name">{name}</span>
        {server === key && <span className="serve-tag">Serving</span>}
      </span>
      <span className="score-points" aria-label={`${points} points`}>{points}</span>
      <span className="score-side-bottom">
        <span>{sets === 1 ? '1 set' : `${sets} sets`}</span>
        {winner === key && <span className="score-picked">Won the point</span>}
      </span>
    </button>
  );

  return (
    <section className="card scoreboard" aria-label="Score">
      <div className="scoreboard-head">
        <span className="eyebrow">Set {currentSet} · best of {bestOf}</span>
        {finishedSets.length > 0 && (
          <span className="scoreboard-sets">
            {finishedSets.map((s, i) => (
              <span key={i} className={`chip small ${s.playerScore > s.opponentScore ? 'you' : 'opp'}`} title={`Set ${i + 1}`}>
                {s.playerScore}–{s.opponentScore}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="score-sides">
        {side('player', playerName, score.playerScore, setsWon)}
        {side('opponent', opponentName, score.opponentScore, setsLost)}
      </div>
      <div className="point-strip" aria-label={`${setPoints.length} points played in this set`}>
        {setPoints.length === 0 ? (
          <span className="faint">No points yet in this set</span>
        ) : (
          setPoints.map(p => <span key={p.id} className={p.winner === 'player' ? 'you' : 'opp'} />)
        )}
      </div>
    </section>
  );
};

export default Scoreboard;
