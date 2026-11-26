import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { MAX_EVENT, MAX_PLAYER_NAME, MAX_VIDEO_URL, cleanText, validateDetails } from '../lib/matchDetails';
import MatchStyles from '../components/MatchStyles';
import { EMPTY_KIT, kitColumns, type Kit, type Player, type PlayStyle } from '../lib/styles';

const NEW_PLAYER = 'new';

const kitOf = (p: Player): Kit => ({ style_id: p.style_id, hand: p.hand, forehand_rubber: p.forehand_rubber, backhand_rubber: p.backhand_rubber });

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * NewMatch component for creating a new table tennis match
 */
const NewMatch = () => {
  const navigate = useNavigate();
  const { user, displayName, saveDisplayName } = useAuth();
  const api = useApi();
  
  const [formData, setFormData] = useState({
    player_name: displayName ?? '',
    opponent_name: '',
    event: '',
    video_url: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    best_of: 5, // Default to best of 5 sets
    initial_server: 'player' as 'player' | 'opponent', // Default to player serving first
    notes: ''
  });
  
  // Offered when the account has no player for itself yet
  const [newIsSelf, setNewIsSelf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[] | null>(null);
  const [styles, setStyles] = useState<PlayStyle[]>([]);
  // A player id, or NEW_PLAYER to add one with the typed name
  const [choice, setChoice] = useState<string>(NEW_PLAYER);
  const [playerKit, setPlayerKit] = useState<Kit>(EMPTY_KIT);
  const [opponentKit, setOpponentKit] = useState<Kit>(EMPTY_KIT);
  // Set once the opponent's style is changed by hand, so a lookup never overwrites it,
  // even one that was already running
  const opponentTouched = useRef(false);
  const [opponentSource, setOpponentSource] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.player.getPlayers(), api.style.getStyleData()])
      .then(([loaded, styleData]) => {
        setPlayers(loaded);
        setStyles(styleData.styles);
        const self = loaded.find(p => p.is_self);
        if (self) {
          setChoice(self.id);
          setPlayerKit(kitOf(self));
        }
      })
      .catch(err => {
        // Without players the form still works: the player is added from the typed name
        console.error('Failed to load players:', err);
        setPlayers([]);
      });
  }, [api]);

  // The name can arrive after the first render
  useEffect(() => {
    if (displayName) setFormData(prev => (prev.player_name ? prev : { ...prev, player_name: displayName }));
  }, [displayName]);

  const hasSelf = !!players?.some(p => p.is_self);
  const chosen = players?.find(p => p.id === choice) ?? null;

  const choosePlayer = (id: string) => {
    setChoice(id);
    const player = players?.find(p => p.id === id);
    setPlayerKit(player ? kitOf(player) : EMPTY_KIT);
  };

  // Fill in the opponent's style from the last match against the same name
  const lookUpOpponent = async () => {
    if (opponentTouched.current) return;
    try {
      const found = await api.player.getLastOpponentKit(formData.opponent_name);
      if (opponentTouched.current) return;
      setOpponentKit(found?.kit ?? EMPTY_KIT);
      setOpponentSource(found ? `As on ${formatDay(found.date)}` : null);
    } catch (err) {
      console.error('Failed to look up the opponent:', err);
    }
  };

  const changeOpponentKit = (kit: Kit) => {
    setOpponentKit(kit);
    opponentTouched.current = true;
    setOpponentSource(null);
  };
  
  // Error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = () => {
      if (isSubmitting) {
        setIsSubmitting(false);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isSubmitting]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle form submission to create a new match
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('You need to be signed in to create a match');
      }
      
      const typedName = cleanText(formData.player_name);
      if (!chosen && !typedName) throw new Error('Enter the player\'s name');
      const problem = validateDetails(formData);
      if (problem) throw new Error(problem);

      // A new name becomes a player, with the style entered here
      let player = chosen;
      if (!player) {
        const isSelf = !hasSelf && newIsSelf;
        player = await api.player.savePlayer({ name: typedName!, is_self: isSelf, notes: '', ...playerKit });
        if (isSelf && !displayName) {
          // Not worth failing the match over
          await saveDisplayName(player.name).catch(err => console.error('Failed to save your name:', err));
        }
      }

      // Create match data
      const matchData = {
        opponent_name: formData.opponent_name.trim(),
        player_name: player.name,
        player_id: player.id,
        ...kitColumns('player', playerKit),
        ...kitColumns('opponent', opponentKit),
        event: cleanText(formData.event),
        video_url: cleanText(formData.video_url),
        date: formData.date,
        match_score: '0-0',
        notes: formData.notes,
        initial_server: formData.initial_server,
        // <select> values arrive as strings
        best_of: Number(formData.best_of)
      };
      
      // Send API request to create match using our API hook
      // Pass user ID from context to avoid hanging auth call
      const newMatch = await api.match.createMatch(matchData, user.id);
      
      if (!newMatch.id) {
        throw new Error('No match ID returned');
      }
      
      // Navigate to the match tracker with the new match ID
      navigate(`/matches/${newMatch.id}`);
    } catch (err) {
      // Handle error cases
      let errorMessage = 'Failed to create match. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      if (errorMessage.includes('JWT') || errorMessage.includes('token') || errorMessage.includes('auth')) {
        errorMessage = 'Your sign-in has expired. Sign out and sign in again.';
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMe = chosen ? chosen.is_self : !hasSelf && newIsSelf;
  const playerDisplayName = chosen?.name ?? (cleanText(formData.player_name) || 'Player');
  const serverButtonLabel = isMe ? 'You' : playerDisplayName;

  return (
    <Layout>
      <div className="page narrow">
        <div className="page-head">
          <div>
            <h1>New match</h1>
            <p>Check best of and first server carefully. They can't be changed once you start.</p>
          </div>
        </div>

        {!user && (
          <div className="notice error" role="alert">
            You need to be signed in to create a match. <a href="/auth">Sign in</a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card form">
          <div className="fields">
            <div className="field">
              <label htmlFor={players && players.length > 0 ? 'player_choice' : 'player_name'}>Player</label>
              {players && players.length > 0 && (
                <select id="player_choice" value={choice} onChange={e => choosePlayer(e.target.value)} disabled={isSubmitting}>
                  {players.map(p => <option key={p.id} value={p.id}>{p.is_self ? `${p.name} (you)` : p.name}</option>)}
                  <option value={NEW_PLAYER}>Someone new…</option>
                </select>
              )}
              {choice === NEW_PLAYER && (
                <>
                  <input
                    type="text"
                    id="player_name"
                    name="player_name"
                    aria-label={players && players.length > 0 ? 'New player\'s name' : undefined}
                    value={formData.player_name}
                    onChange={handleChange}
                    maxLength={MAX_PLAYER_NAME}
                    placeholder="Your name, or a friend's"
                    autoComplete="off"
                    disabled={isSubmitting || !players}
                  />
                  {players && !hasSelf && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={newIsSelf}
                        onChange={e => setNewIsSelf(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      This is me. Fill it in on new matches.
                    </label>
                  )}
                  {players && (hasSelf || !newIsSelf) && <span className="field-hint">They'll be added to your players.</span>}
                </>
              )}
            </div>

            <div className="field">
              <label htmlFor="opponent_name">Opponent</label>
              <input
                type="text"
                id="opponent_name"
                name="opponent_name"
                value={formData.opponent_name}
                onChange={handleChange}
                onBlur={lookUpOpponent}
                required
                autoComplete="off"
                placeholder="Their name"
                disabled={isSubmitting}
              />
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="field">
              <label htmlFor="event">Event <span className="optional">(optional)</span></label>
              <input
                type="text"
                id="event"
                name="event"
                value={formData.event}
                onChange={handleChange}
                maxLength={MAX_EVENT}
                placeholder="e.g. Winter 2026/27 league"
                disabled={isSubmitting}
              />
            </div>

            <fieldset className="field wide match-styles-field">
              <legend>Styles <span className="optional">(optional)</span></legend>
              <p className="field-hint">The coach's summary uses these for tactics. Leave anything you don't know.</p>
              <MatchStyles
                key={choice}
                playerName={playerDisplayName}
                opponentName={cleanText(formData.opponent_name) ?? 'Opponent'}
                player={playerKit}
                opponent={opponentKit}
                styles={styles}
                onPlayer={setPlayerKit}
                onOpponent={changeOpponentKit}
                playerSource={chosen ? (chosen.is_self ? 'From your player page' : 'From their player page') : null}
                opponentSource={opponentSource}
                collapsePlayer={!!chosen}
                disabled={isSubmitting}
              />
            </fieldset>

            <div className="field wide">
              <span id="best_of_label">Best of</span>
              <div className="segmented" role="group" aria-labelledby="best_of_label">
                {[1, 3, 5, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={Number(formData.best_of) === n}
                    onClick={() => setFormData(prev => ({ ...prev, best_of: n }))}
                    disabled={isSubmitting}
                  >
                    {n === 1 ? '1 set' : `${n} sets`}
                  </button>
                ))}
              </div>
            </div>

            <div className="field wide">
              <span id="initial_server_label">First server</span>
              <div className="segmented" role="group" aria-labelledby="initial_server_label">
                <button
                  type="button"
                  aria-pressed={formData.initial_server === 'player'}
                  onClick={() => setFormData(prev => ({ ...prev, initial_server: 'player' }))}
                  disabled={isSubmitting}
                >
                  {serverButtonLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={formData.initial_server === 'opponent'}
                  onClick={() => setFormData(prev => ({ ...prev, initial_server: 'opponent' }))}
                  disabled={isSubmitting}
                >
                  {cleanText(formData.opponent_name) || 'Opponent'}
                </button>
              </div>
            </div>

            <div className="field wide">
              <label htmlFor="video_url">Video link <span className="optional">(optional)</span></label>
              <input
                type="url"
                id="video_url"
                name="video_url"
                value={formData.video_url}
                onChange={handleChange}
                maxLength={MAX_VIDEO_URL}
                placeholder="https://"
                disabled={isSubmitting}
              />
            </div>

            <div className="field wide">
              <label htmlFor="notes">Notes <span className="optional">(optional)</span></label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}

          <div className="form-actions end">
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/matches')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Start entering points'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewMatch;
