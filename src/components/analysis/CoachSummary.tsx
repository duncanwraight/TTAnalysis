import { useState } from 'react';
import type { StoredSummary } from '../../lib/api';
import { MAX_NOTES_LENGTH } from '../../lib/aiSummary';

type Props = {
  stored: StoredSummary | null;
  // The points or match details have changed since the stored summary was written
  stale: boolean;
  // The viewer owns the match and has AI summaries turned on
  canGenerate: boolean;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  // The owner's saved notes, sent again whenever the summary is rewritten
  savedNotes: string | null;
  // Rewrite with these notes; an empty string clears them
  onRewrite: (notes: string) => Promise<boolean>;
};

const writtenOn = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** The AI coach's summary, with the button to write or update it for owners who have the feature. */
const CoachSummary = ({ stored, stale, canGenerate, generating, error, onGenerate, savedNotes, onRewrite }: Props) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(savedNotes ?? '');

  if (!stored && !canGenerate) return null;

  const openNotes = () => {
    setNotes(savedNotes ?? '');
    setEditing(true);
  };

  const submitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onRewrite(notes.trim())) setEditing(false);
  };

  const button = canGenerate && (!stored || stale) && (
    <button type="button" className="btn primary" onClick={onGenerate} disabled={generating}>
      {generating ? 'Writing the summary...' : stored ? 'Update the summary' : 'Write a summary'}
    </button>
  );

  return (
    <section aria-labelledby="ma-coach" className="section">
      <div className="section-head">
        <h2 id="ma-coach">Coach's summary</h2>
        <p className="ma-note ma-definition">
          <strong>Written by AI from the recorded points.</strong> It only knows the last two shots of each point, so check what it suggests against the video.
        </p>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}

      {!stored ? (
        <div className="card ma-empty" data-html2canvas-ignore="true">
          <div>
            <h3>No summary yet</h3>
            <p>The AI reads every point and this analysis, then writes up the problems it finds and what to work on. It takes up to a minute.</p>
          </div>
          {button}
        </div>
      ) : (
        <>
          <p className="ma-coach-headline">{stored.summary.headline}</p>

          <div className="ma-grid cards">
            {stored.summary.problems.map(p => (
              <article key={p.title} className="card ma-finding">
                <span className="ma-finding-tag">Work on</span>
                <h3>{p.title}</h3>
                <p>{p.detail}</p>
                {p.tactical && <p className="ma-coach-try"><strong>Check:</strong> {p.tactical}</p>}
                {p.technical?.trim() && <p className="ma-coach-try"><strong>If it's technical:</strong> {p.technical}</p>}
                {/* Summaries written before the tactical and technical split */}
                {!p.tactical && p.try && <p className="ma-coach-try"><strong>Try:</strong> {p.try}</p>}
              </article>
            ))}
          </div>

          {stored.summary.mental.length > 0 && (
            <div className="ma-grid cards">
              {stored.summary.mental.map(m => (
                <article key={m.title} className="card ma-finding">
                  <span className="ma-finding-tag">Mental side</span>
                  <h3>{m.title}</h3>
                  <p>{m.detail}</p>
                </article>
              ))}
            </div>
          )}

          <div className="ma-coach-foot">
            <p className="ma-small muted">
              Written {writtenOn(stored.created_at)}.
              {stale && ' The points have changed since then, so it may be out of date.'}
            </p>
            {canGenerate && (
              <span className="ma-coach-actions" data-html2canvas-ignore="true">
                {!editing && (
                  <button type="button" className="btn" onClick={openNotes} disabled={generating}>
                    {savedNotes ? 'Change your notes' : 'Correct this summary'}
                  </button>
                )}
                {button}
              </span>
            )}
          </div>

          {canGenerate && savedNotes && !editing && (
            <p className="ma-note" data-html2canvas-ignore="true">
              <strong>Your notes, used whenever it's rewritten:</strong> {savedNotes}
            </p>
          )}

          {canGenerate && editing && (
            <form className="card ma-coach-notes" onSubmit={submitNotes} data-html2canvas-ignore="true">
              <div className="field">
                <label htmlFor="ma-coach-notes">What should it change?</label>
                <textarea
                  id="ma-coach-notes"
                  rows={4}
                  maxLength={MAX_NOTES_LENGTH}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="For example: the set 2 serve points were mostly short backspin serves that got flicked. Don't suggest pushing long, I'm a chopper."
                />
                <p className="ma-small muted">
                  Corrections are treated as fact. Your notes are kept for later rewrites and aren't shown on shared links. {notes.length}/{MAX_NOTES_LENGTH}
                </p>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={generating || (!notes.trim() && !savedNotes)}>
                  {generating ? 'Rewriting...' : notes.trim() ? 'Rewrite with my notes' : 'Clear notes and rewrite'}
                </button>
                <button type="button" className="btn quiet" onClick={() => setEditing(false)} disabled={generating}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
};

export default CoachSummary;
