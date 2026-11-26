import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StyleFields from '../components/StyleFields';
import { useConfirm } from '../components/ui/useConfirm';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import { EMPTY_KIT, MAX_PLAYER_NOTES, describeHandAndRubbers, type Player, type PlayStyle } from '../lib/styles';
import { MAX_PLAYER_NAME } from '../lib/matchDetails';

type Editing = Omit<Player, 'id'> & { id?: string };

const blankPlayer = (isSelf: boolean, name = ''): Editing => ({ ...EMPTY_KIT, name, is_self: isSelf, notes: '' });

/**
 * The owner's players: themselves and the people whose matches they enter.
 * A player's style fills in new matches, and their notes feed the technical
 * advice in the coach's summary. Notes are owner only.
 */
const Players = () => {
  const api = useApi();
  const { displayName, saveDisplayName } = useAuth();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [styles, setStyles] = useState<PlayStyle[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  // Tick "This is me" on someone who isn't the self player yet
  const [makeSelf, setMakeSelf] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    Promise.all([api.player.getPlayers(), api.style.getStyleData(), api.player.getMatchCounts()])
      .then(([loadedPlayers, styleData, matchCounts]) => {
        setPlayers(loadedPlayers);
        setStyles(styleData.styles);
        setCounts(matchCounts);
      })
      .catch(err => {
        console.error('Failed to load players:', err);
        setError('The players did not load. Try again in a moment.');
      });
  }, [api]);

  const self = players?.find(p => p.is_self) ?? null;
  const hasSelf = !!self;

  const open = (player?: Player) => {
    setDialogError(null);
    setMakeSelf(false);
    setEditing(player ? { ...player } : blankPlayer(!hasSelf, hasSelf ? '' : displayName ?? ''));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      setDialogError('Give the player a name.');
      return;
    }
    const switching = makeSelf && !editing.is_self;
    if (switching && self) {
      const ok = await confirm({
        title: `Make ${name} you?`,
        message: `${self.name} stops being you and becomes one of your other players, keeping the matches entered under their name. Older matches entered with no player name are your own, so they move to ${name}.`,
        confirmLabel: `Yes, I'm ${name}`,
      });
      if (!ok) return;
    }
    setSaving(true);
    setDialogError(null);
    let playerSaved = false;
    try {
      let saved = await api.player.savePlayer({ ...editing, name, notes: editing.notes.trim() });
      playerSaved = true;
      if (switching) {
        // If the next step fails, a retry must update this player rather than add them again
        if (!editing.id) {
          const id = saved.id;
          setEditing(prev => (prev ? { ...prev, id } : prev));
          setPlayers(prev => [...(prev ?? []), saved]);
        }
        await api.player.setSelfPlayer(saved.id);
        saved = { ...saved, is_self: true };
      }
      if (saved.is_self && name !== displayName) {
        // The account's name fills in "you" around the app; not worth failing over
        await saveDisplayName(name).catch(err => console.error('Failed to save your name:', err));
      }
      if (switching) {
        // The old self player changed and matches may have moved, so load both again
        const [loadedPlayers, matchCounts] = await Promise.all([api.player.getPlayers(), api.player.getMatchCounts()]);
        setPlayers(loadedPlayers);
        setCounts(matchCounts);
      } else {
        setPlayers(prev => {
          const rest = (prev ?? []).filter(p => p.id !== saved.id);
          return [...rest, saved].sort((a, b) => Number(b.is_self) - Number(a.is_self) || a.name.localeCompare(b.name));
        });
      }
      setEditing(null);
    } catch (err) {
      console.error('Failed to save player:', err);
      setDialogError(playerSaved
        ? 'The player saved, but they were not made you. Check your connection and try again.'
        : 'The player did not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing?.id || editing.is_self) return;
    const matches = counts[editing.id] ?? 0;
    const message = matches
      ? matches === 1
        ? 'Their match stays, but loses the link to this player and their notes.'
        : `Their ${matches} matches stay, but lose the link to this player and their notes.`
      : undefined;
    if (!(await confirm({ title: `Delete ${editing.name}?`, message, confirmLabel: 'Delete player', danger: true }))) return;
    setSaving(true);
    try {
      await api.player.deletePlayer(editing.id);
      setPlayers(prev => (prev ?? []).filter(p => p.id !== editing.id));
      setEditing(null);
    } catch (err) {
      console.error('Failed to delete player:', err);
      setDialogError('The player was not deleted. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const styleName = (id: string | null) => styles.find(s => s.id === id)?.name;

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Players</h1>
            <p>
              You and the people whose matches you enter. A player's style fills in each new match, and their notes shape the
              technical advice in the coach's summary. Only you see the notes: share links never show them.
            </p>
          </div>
          <div className="page-head-actions">
            <button type="button" className="btn primary" onClick={() => open()} disabled={!players}>Add a player</button>
          </div>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}
        {!players && !error && <div className="state" role="status"><p>Loading players...</p></div>}
        {players && players.length === 0 && (
          <div className="state">
            <h2>No players yet</h2>
            <p>Add yourself first, then anyone else whose matches you enter. New matches also add their player here.</p>
          </div>
        )}

        {players && players.length > 0 && (
          <div className="players-grid">
            {players.map(p => {
              const style = styleName(p.style_id);
              const kit = describeHandAndRubbers(p);
              const matches = counts[p.id] ?? 0;
              return (
                <article key={p.id} className="card player-card">
                  <div className="player-card-head">
                    <div>
                      <h2>{p.name} {p.is_self && <span className="chip small">You</span>}</h2>
                      <span className="muted player-card-count">{matches} {matches === 1 ? 'match' : 'matches'}</span>
                    </div>
                    <button type="button" className="btn small" onClick={() => open(p)}>Edit</button>
                  </div>
                  {style || kit ? (
                    <div className="player-card-style">
                      <strong>{style ?? 'No style set'}</strong>
                      {kit && <span className="muted">{kit}</span>}
                    </div>
                  ) : (
                    <span className="faint">No style set yet</span>
                  )}
                  <div className="player-card-notes">
                    <span className="player-card-label">Notes</span>
                    <p className={p.notes ? '' : 'faint'}>{p.notes || 'No notes yet'}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="muted player-foot">
          Opponents aren't listed here. Their style is set on each match, and the next match against the same name starts with it filled in.
        </p>
      </div>

      {editing && (
        <div className="dialog-backdrop">
          <form className="card dialog wide shot-dialog player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-dialog-title" onSubmit={save}>
            <h2 id="player-dialog-title">{editing.id ? `Edit ${editing.name || 'player'}` : 'Add a player'}</h2>
            <div className="shot-dialog-body">
              <section className="shot-dialog-section">
                <label className="field" htmlFor="player-name">
                  <span>Name</span>
                  <input
                    id="player-name"
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    maxLength={MAX_PLAYER_NAME}
                    required
                    autoFocus
                    autoComplete="off"
                  />
                  {editing.is_self && (
                    <span className="field-hint">
                      This is you. New matches fill in your name, and your own matches are linked here. If this isn't you, open your own player and tick "This is me".
                    </span>
                  )}
                </label>
                {!editing.is_self && (
                  <>
                    <label className="check">
                      <input type="checkbox" checked={makeSelf} onChange={e => setMakeSelf(e.target.checked)} disabled={saving} />
                      This is me
                    </label>
                    {makeSelf && self && (
                      <span className="field-hint">{self.name} is you at the moment. Saving makes {editing.name.trim() || 'this player'} you instead.</span>
                    )}
                  </>
                )}
              </section>
              <section className="shot-dialog-section" aria-labelledby="player-style-h">
                <h3 id="player-style-h">Style</h3>
                <StyleFields
                  id="player"
                  kit={editing}
                  styles={styles}
                  emptyLabel="Not set"
                  onChange={kit => setEditing({ ...editing, ...kit })}
                  disabled={saving}
                />
                <span className="field-hint">New matches start with this. Matches already entered keep the style they were entered with.</span>
              </section>
              <section className="shot-dialog-section" aria-labelledby="player-notes-h">
                <h3 id="player-notes-h">Notes</h3>
                <p className="field-hint" id="player-notes-hint">
                  What {editing.is_self ? 'you are' : 'they are'} working on, what tends to go wrong, anything a coach would want in mind.
                  The coach's summary takes its technical advice from here and checks it against the counts, such as how often a shot you mention was played.
                </p>
                <textarea
                  className="shot-dialog-notes"
                  aria-labelledby="player-notes-h"
                  aria-describedby="player-notes-hint"
                  rows={7}
                  maxLength={MAX_PLAYER_NOTES}
                  value={editing.notes}
                  onChange={e => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="For example: struggling with the backhand loop at the moment, so check how often it's played. Footwork to the wide forehand is slow."
                />
                <div className="player-dialog-meta">
                  <span className="field-hint">Only you see these. Share links never show them.</span>
                  <span className="field-hint">{editing.notes.length} of {MAX_PLAYER_NOTES} characters</span>
                </div>
              </section>
              {dialogError && <div className="notice error" role="alert">{dialogError}</div>}
            </div>
            <div className="form-actions shot-dialog-foot player-dialog-foot">
              {editing.id && !editing.is_self ? (
                <button type="button" className="btn quiet danger-text" onClick={remove} disabled={saving}>Delete player</button>
              ) : <span className="field-hint">{editing.id ? "Changing the notes marks this player's coach's summaries as out of date." : ''}</span>}
              <div className="page-head-actions">
                <button type="button" className="btn" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {confirmDialog}
    </Layout>
  );
};

export default Players;
