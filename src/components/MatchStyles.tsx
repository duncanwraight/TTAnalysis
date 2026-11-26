import { useState } from 'react';
import StyleFields from './StyleFields';
import { describeHandAndRubbers, hasKit, type Kit, type PlayStyle } from '../lib/styles';

type Props = {
  playerName: string;
  opponentName: string;
  player: Kit;
  opponent: Kit;
  styles: PlayStyle[];
  onPlayer: (kit: Kit) => void;
  onOpponent: (kit: Kit) => void;
  // Where each side's values came from, e.g. "From their player page"
  playerSource?: string | null;
  opponentSource?: string | null;
  // Show the player's side as a summary with a button to change it, when it came from their player page
  collapsePlayer?: boolean;
  disabled?: boolean;
};

/** Both sides' style, hand and rubbers for one match. */
const MatchStyles = ({
  playerName, opponentName, player, opponent, styles, onPlayer, onOpponent, playerSource, opponentSource, collapsePlayer, disabled,
}: Props) => {
  const [editingPlayer, setEditingPlayer] = useState(!collapsePlayer);
  const styleName = styles.find(s => s.id === player.style_id)?.name;
  const playerKitText = describeHandAndRubbers(player);

  return (
    <div className="match-styles">
      <div className="match-style-side">
        <div className="match-style-side-head">
          <strong className="you">{playerName}</strong>
          {playerSource && <span className="field-hint">{playerSource}</span>}
        </div>
        {editingPlayer ? (
          <StyleFields id="match-player" kit={player} styles={styles} onChange={onPlayer} disabled={disabled} emptyLabel="Not set" />
        ) : (
          <>
            {hasKit(player) ? (
              <div className="match-style-summary">
                <strong>{styleName ?? 'No style set'}</strong>
                {playerKitText && <span className="muted">{playerKitText}</span>}
              </div>
            ) : (
              <span className="faint">No style set yet</span>
            )}
            <button type="button" className="btn small match-style-change" onClick={() => setEditingPlayer(true)} disabled={disabled}>
              Change for this match
            </button>
          </>
        )}
      </div>
      <div className="match-style-side">
        <div className="match-style-side-head">
          <strong className="opp">{opponentName || 'Opponent'}</strong>
          {opponentSource && <span className="field-hint">{opponentSource}</span>}
        </div>
        <StyleFields id="match-opponent" kit={opponent} styles={styles} onChange={onOpponent} disabled={disabled} />
      </div>
    </div>
  );
};

export default MatchStyles;
