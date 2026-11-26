import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useApi } from '../lib/useApi';
import {
  KIT_KEYS, KIT_LABEL, MAX_STYLE_DESCRIPTION, MAX_STYLE_NOTES,
  type KitNote, type PlayStyle, type StyleData, type StyleMatchup,
} from '../lib/styles';

type EditingStyle = Omit<PlayStyle, 'id'> & { id?: string };
type EditingMatchup = Omit<StyleMatchup, 'id'> & { id?: string };
type Dialog =
  | { kind: 'style'; value: EditingStyle }
  | { kind: 'kit'; value: KitNote }
  | { kind: 'matchup'; value: EditingMatchup };

const KIT_HINT: Record<string, string> = {
  left_handed: 'What changes against a left-hander: where serves and crosscourt rallies go, and which side is open.',
  short_pips: 'What to expect from short pips: flatter, faster returns with less spin.',
  medium_pips: 'What to expect from medium pips.',
  long_pips: 'What to expect from long pips: your own spin coming back the other way.',
  anti: 'What to expect from anti: most of the spin taken off.',
};

/** A notes box with its character count. */
const NotesField = ({ id, label, hint, value, onChange, rows = 6 }: {
  id: string; label: string; hint: string; value: string; onChange: (v: string) => void; rows?: number;
}) => (
  <section className="shot-dialog-section" aria-labelledby={`${id}-h`}>
    <h3 id={`${id}-h`}>{label}</h3>
    <p className="field-hint" id={`${id}-hint`}>{hint}</p>
    <textarea
      className="shot-dialog-notes"
      aria-labelledby={`${id}-h`}
      aria-describedby={`${id}-hint`}
      rows={rows}
      maxLength={MAX_STYLE_NOTES}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
    <span className="field-hint shot-dialog-count">{value.length} of {MAX_STYLE_NOTES} characters</span>
  </section>
);

const preview = (text: string) => text.trim() || 'Not written yet';

/**
 * Styles of play for /admin/styles, with notes for hands and rubbers and for
 * particular match-ups. Everything here is tactical advice for the coach's summary.
 */
const AdminStyles = () => {
  const api = useApi();
  const [data, setData] = useState<StyleData | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [styleData, styleUsage] = await Promise.all([api.style.getStyleData(), api.style.getStyleUsage()]);
      setData(styleData);
      setUsage(styleUsage);
      setError(null);
    } catch (err) {
      console.error('Failed to load styles:', err);
      setError('The styles did not load. Try again in a moment.');
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openDialog = (next: Dialog) => {
    setDialogError(null);
    setDialog(next);
  };

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setDialogError(null);
    try {
      await action();
      setDialog(null);
      await load();
    } catch (err) {
      console.error('Failed to save:', err);
      const message = err instanceof Error && /duplicate|unique/i.test(err.message)
        ? 'That already exists. Edit the existing one instead.'
        : 'That did not save. Check your connection and try again.';
      setDialogError(message);
    } finally {
      setSaving(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    if (dialog.kind === 'style') {
      const { value } = dialog;
      if (!value.name.trim()) { setDialogError('Give the style a name.'); return; }
      run(() => api.style.saveStyle({
        ...value,
        name: value.name.trim(),
        description: value.description.trim(),
        as_notes: value.as_notes.trim(),
        against_notes: value.against_notes.trim(),
      }));
    } else if (dialog.kind === 'kit') {
      run(() => api.style.saveKitNote({ ...dialog.value, against_notes: dialog.value.against_notes.trim() }));
    } else {
      const { value } = dialog;
      if (!value.player_style_id || !value.opponent_style_id) { setDialogError('Choose both styles.'); return; }
      run(() => api.style.saveMatchup({ ...value, notes: value.notes.trim() }));
    }
  };

  const remove = () => {
    if (!dialog || dialog.kind === 'kit' || !dialog.value.id) return;
    const id = dialog.value.id;
    if (dialog.kind === 'style') {
      const used = usage[id] ?? 0;
      const message = used
        ? `Delete ${dialog.value.name}? ${used} ${used === 1 ? 'match uses' : 'matches use'} it and will show no style, and its match-ups go too.`
        : `Delete ${dialog.value.name}? Its match-ups go too.`;
      if (!window.confirm(message)) return;
      run(() => api.style.deleteStyle(id));
    } else {
      if (!window.confirm('Delete this match-up?')) return;
      run(() => api.style.deleteMatchup(id));
    }
  };

  const styleName = (id: string) => data?.styles.find(s => s.id === id)?.name ?? 'Deleted style';
  const nextOrder = Math.max(0, ...(data?.styles.map(s => s.display_order) ?? [])) + 1;

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Styles of play</h1>
            <p>
              Players pick a style for themselves and their opponent when they enter a match. Everything here is tactical:
              what a style wants to do, and what to look out for against it. Technical advice comes from each player's own notes.
            </p>
          </div>
          <div className="page-head-actions">
            <button
              type="button"
              className="btn primary"
              disabled={!data}
              onClick={() => openDialog({ kind: 'style', value: { name: '', description: '', as_notes: '', against_notes: '', display_order: nextOrder } })}
            >
              Add a style
            </button>
          </div>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}
        {!data && !error && <div className="state" role="status"><p>Loading styles...</p></div>}

        {data && (
          <>
            <section className="card table-card" aria-label="Styles">
              <table className="data-table admin-styles-table">
                <thead>
                  <tr>
                    <th scope="col">Style</th>
                    <th scope="col">Description</th>
                    <th scope="col">Playing as it</th>
                    <th scope="col">Against it</th>
                    <th scope="col">Matches</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.styles.length === 0 && (
                    <tr><td colSpan={6} className="muted">No styles yet.</td></tr>
                  )}
                  {data.styles.map(s => (
                    <tr key={s.id}>
                      <th scope="row">{s.name}</th>
                      <td className="muted">{s.description}</td>
                      <td>{s.as_notes.trim() ? <span className="admin-written">Written</span> : <span className="faint">Not yet</span>}</td>
                      <td>{s.against_notes.trim() ? <span className="admin-written">Written</span> : <span className="faint">Not yet</span>}</td>
                      <td className="muted">{usage[s.id] ?? 0}</td>
                      <td className="admin-actions">
                        <button type="button" className="btn small" onClick={() => openDialog({ kind: 'style', value: { ...s } })}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card admin-notes-card" aria-labelledby="kit-h">
              <div>
                <h2 id="kit-h">Hands and rubbers</h2>
                <p className="muted">
                  Set separately from the style, so a chopper with long pips and a chopper with inverted both sides don't need two styles.
                  Right-handed and inverted are the normal case and have no notes. The summary only reads a note when the opponent has that hand or rubber.
                </p>
              </div>
              <ul className="admin-note-list">
                {KIT_KEYS.map(key => {
                  const note = data.kitNotes.find(k => k.key === key) ?? { key, against_notes: '' };
                  return (
                    <li key={key}>
                      <strong>{KIT_LABEL[key]}</strong>
                      <span className={note.against_notes.trim() ? 'muted' : 'faint'}>{preview(note.against_notes)}</span>
                      <button type="button" className="btn small" onClick={() => openDialog({ kind: 'kit', value: { ...note } })}>Edit</button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card admin-notes-card" aria-labelledby="matchups-h">
              <div className="admin-notes-head">
                <div>
                  <h2 id="matchups-h">Match-ups</h2>
                  <p className="muted">
                    Extra tactics for a pairing that needs its own advice. Each one runs one way: the player's style, then the opponent's.
                    The summary uses it only when both match, on top of each style's own notes.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={data.styles.length === 0}
                  onClick={() => openDialog({ kind: 'matchup', value: { player_style_id: '', opponent_style_id: '', notes: '' } })}
                >
                  Add a match-up
                </button>
              </div>
              {data.matchups.length === 0 ? (
                <p className="faint">No match-ups yet.</p>
              ) : (
                <ul className="admin-note-list matchups">
                  {data.matchups.map(m => (
                    <li key={m.id}>
                      <span className="admin-matchup">
                        <span className="chip you">{styleName(m.player_style_id)}</span>
                        <span className="faint">against</span>
                        <span className="chip opp">{styleName(m.opponent_style_id)}</span>
                      </span>
                      <span className={m.notes.trim() ? 'muted' : 'faint'}>{preview(m.notes)}</span>
                      <button type="button" className="btn small" onClick={() => openDialog({ kind: 'matchup', value: { ...m } })}>Edit</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="muted admin-foot">Editing any of these marks the coach's summaries that used it as out of date, the same as editing a shot's guide.</p>
          </>
        )}
      </div>

      {dialog && (
        <div className="dialog-backdrop">
          <form className="card dialog wide shot-dialog" role="dialog" aria-modal="true" aria-labelledby="style-dialog-title" onSubmit={save}>
            <h2 id="style-dialog-title">
              {dialog.kind === 'style' && (dialog.value.id ? `Edit ${dialog.value.name || 'style'}` : 'Add a style')}
              {dialog.kind === 'kit' && `Against ${KIT_LABEL[dialog.value.key].toLowerCase().replace('left-handed', 'a left-hander')}`}
              {dialog.kind === 'matchup' && (dialog.value.id ? 'Edit match-up' : 'Add a match-up')}
            </h2>
            <div className="shot-dialog-body">
              {dialog.kind === 'style' && (() => {
                const v = dialog.value;
                const set = (changes: Partial<EditingStyle>) => setDialog({ kind: 'style', value: { ...v, ...changes } });
                const label = v.name.trim() ? v.name.trim().toLowerCase() : 'this style';
                return (
                  <>
                    <section className="shot-dialog-section">
                      <div className="shot-dialog-grid">
                        <label className="field" htmlFor="style-name">
                          <span>Name</span>
                          <input id="style-name" value={v.name} onChange={e => set({ name: e.target.value })} maxLength={60} required autoFocus />
                        </label>
                        <label className="field" htmlFor="style-order">
                          <span>Display order</span>
                          <input id="style-order" type="number" value={v.display_order} onChange={e => set({ display_order: parseInt(e.target.value) || 0 })} />
                        </label>
                        <label className="field wide" htmlFor="style-desc">
                          <span>Description</span>
                          <input id="style-desc" value={v.description} onChange={e => set({ description: e.target.value })} maxLength={MAX_STYLE_DESCRIPTION} />
                          <span className="field-hint">One line, shown under the name when players choose a style. The summary sees it too.</span>
                        </label>
                      </div>
                    </section>
                    <NotesField
                      id="style-as"
                      label={`Tactical: playing as ${label === 'this style' ? label : `a ${label}`}`}
                      hint="What this style is trying to do in a point. The summary uses it when the player being reviewed has this style, so it doesn't push them away from their game."
                      value={v.as_notes}
                      onChange={as_notes => set({ as_notes })}
                    />
                    <NotesField
                      id="style-against"
                      label={`Tactical: playing against ${label === 'this style' ? label : `a ${label}`}`}
                      hint="What to look out for, and what usually works. The summary uses it when the opponent has this style."
                      value={v.against_notes}
                      onChange={against_notes => set({ against_notes })}
                    />
                    <p className="field-hint admin-dialog-tip">Write what to check and change during a match. Advice on strokes goes in each player's own notes, because it depends on the player, not the style.</p>
                  </>
                );
              })()}

              {dialog.kind === 'kit' && (
                <NotesField
                  id="kit-notes"
                  label="Tactical"
                  hint={`${KIT_HINT[dialog.value.key]} The summary uses it when the opponent has this ${dialog.value.key === 'left_handed' ? 'hand' : 'rubber on either side'}.`}
                  value={dialog.value.against_notes}
                  onChange={against_notes => setDialog({ kind: 'kit', value: { ...dialog.value, against_notes } })}
                  rows={8}
                />
              )}

              {dialog.kind === 'matchup' && (() => {
                const v = dialog.value;
                const set = (changes: Partial<EditingMatchup>) => setDialog({ kind: 'matchup', value: { ...v, ...changes } });
                return (
                  <>
                    <section className="shot-dialog-section">
                      <div className="shot-dialog-grid">
                        <label className="field" htmlFor="matchup-player">
                          <span>Player's style</span>
                          <select id="matchup-player" value={v.player_style_id} onChange={e => set({ player_style_id: e.target.value })} required>
                            <option value="">Choose a style</option>
                            {data?.styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </label>
                        <label className="field" htmlFor="matchup-opponent">
                          <span>Opponent's style</span>
                          <select id="matchup-opponent" value={v.opponent_style_id} onChange={e => set({ opponent_style_id: e.target.value })} required>
                            <option value="">Choose a style</option>
                            {data?.styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </label>
                      </div>
                    </section>
                    <NotesField
                      id="matchup-notes"
                      label="Tactical"
                      hint="What the player should do in this pairing, beyond each style's own notes."
                      value={v.notes}
                      onChange={notes => set({ notes })}
                      rows={8}
                    />
                  </>
                );
              })()}

              {dialogError && <div className="notice error" role="alert">{dialogError}</div>}
            </div>
            <div className="form-actions shot-dialog-foot player-dialog-foot">
              {dialog.kind !== 'kit' && dialog.value.id ? (
                <button type="button" className="btn quiet danger-text" onClick={remove} disabled={saving}>
                  {dialog.kind === 'style' ? 'Delete style' : 'Delete match-up'}
                </button>
              ) : <span />}
              <div className="page-head-actions">
                <button type="button" className="btn" onClick={() => setDialog(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default AdminStyles;
