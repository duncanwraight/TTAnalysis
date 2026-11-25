import { useState } from 'react';
import type { StoredSummary } from '../../lib/api';
import { MAX_NOTES_LENGTH } from '../../lib/aiSummary';
import { TACTICAL_DEFINITION, TECHNICAL_DEFINITION } from '../../lib/shotGuide';

type Props = {
  stored: StoredSummary | null;
  // The points, match details or shot guide have changed since the summary was written
  stale: boolean;
  // The viewer owns the match and has AI summaries turned on
  canGenerate: boolean;
  // The viewer owns the match; false on a shared link
  isOwner: boolean;
  totalPoints: number;
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

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
  </svg>
);

const TechnicalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />
  </svg>
);

const SummaryIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" />
  </svg>
);

/** The Coach's summary tab: the summary itself, or the prompt to write one. */
const CoachSummary = ({
  stored, stale, canGenerate, isOwner, totalPoints, generating, error, onGenerate, savedNotes, onRewrite,
}: Props) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(savedNotes ?? '');

  const openNotes = () => {
    setNotes(savedNotes ?? '');
    setEditing(true);
  };

  const submitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onRewrite(notes.trim())) setEditing(false);
  };

  const errorNotice = error && <div className="notice error" role="alert">{error}</div>;

  if (!stored) {
    return (
      <section className="cs-empty" aria-labelledby="cs-empty-title">
        <span className="cs-empty-icon"><SummaryIcon /></span>
        <h2 id="cs-empty-title">No coach's summary yet</h2>
        <p>
          The AI coach reads all {totalPoints} points and the shot guide, then writes up the problems that cost you points,
          what to check on the video, and anything on the mental side.
        </p>
        {errorNotice}
        {canGenerate && totalPoints > 0 && (
          <button type="button" className="btn primary cs-empty-button" onClick={onGenerate} disabled={generating}>
            {generating ? 'Writing the summary...' : 'Write a summary'}
          </button>
        )}
        {canGenerate && totalPoints === 0 && <p className="muted">Enter some points first.</p>}
        {canGenerate && totalPoints > 0 && <p className="cs-small muted">Takes up to a minute.</p>}
      </section>
    );
  }

  const { summary } = stored;

  return (
    <div className="cs">
      <article className="cs-main">
        {/* Only the owner can act on it, so share links and PDFs never say a summary is out of date */}
        {stale && isOwner && (
          <div className="cs-stale" role="status" data-html2canvas-ignore="true">
            <p>The points, the shot guide or the coach's instructions have changed since this was written, so it may be out of date.</p>
            {canGenerate && (
              <button type="button" className="btn primary" onClick={onGenerate} disabled={generating} data-html2canvas-ignore="true">
                {generating ? 'Writing the summary...' : 'Update the summary'}
              </button>
            )}
          </div>
        )}
        {errorNotice}

        <p className="cs-headline">{summary.headline}</p>

        <section aria-labelledby="cs-work-on">
          <h2 id="cs-work-on" className="cs-label">Work on · {summary.problems.length}</h2>
          <p className="cs-terms muted">{TACTICAL_DEFINITION} {TECHNICAL_DEFINITION}</p>
          <ol className="cs-problems">
            {summary.problems.map((p, i) => {
              const panels = [
                p.tactical?.trim() && { kind: 'check', label: 'Tactical', text: p.tactical },
                p.technical?.trim() && { kind: 'technical', label: 'Technical', text: p.technical },
                // Summaries written before the tactical and technical split
                !p.tactical?.trim() && !p.technical?.trim() && p.try && { kind: 'check', label: 'Try', text: p.try },
              ].filter((x): x is { kind: string; label: string; text: string } => !!x);
              return (
                <li key={p.title} className="cs-problem">
                  <span className="cs-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div className="cs-problem-body">
                    <h3>{p.title}</h3>
                    <p className="cs-detail">{p.detail}</p>
                    {panels.length > 0 && (
                      <div className={`cs-panels${panels.length === 1 ? ' single' : ''}`}>
                        {panels.map(panel => (
                          <div key={panel.kind} className={`cs-panel cs-panel-${panel.kind}`}>
                            <span className="cs-panel-label">
                              {panel.kind === 'technical' ? <TechnicalIcon /> : <CheckIcon />}
                              {panel.label}
                            </span>
                            <p>{panel.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {summary.mental.length > 0 && (
          <section aria-labelledby="cs-mental">
            <h2 id="cs-mental" className="cs-label">The mental side</h2>
            <div className="cs-mental">
              {summary.mental.map(m => (
                <div key={m.title} className="card cs-mental-card">
                  <h3>{m.title}</h3>
                  <p>{m.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      <aside className="cs-rail" aria-label="About this summary">
        <div className="card cs-rail-card">
          <div className="cs-fact">
            <span>Written</span>
            <strong>{writtenOn(stored.created_at)}</strong>
          </div>
          <div className="cs-fact">
            <span>Based on</span>
            <strong>{totalPoints} points and the shot guide</strong>
          </div>
          {canGenerate && !editing && (
            <button type="button" className="btn" onClick={openNotes} disabled={generating} data-html2canvas-ignore="true">
              {savedNotes ? 'Change your notes' : 'Correct this summary'}
            </button>
          )}
        </div>

        {canGenerate && editing && (
          <form className="card cs-rail-card" onSubmit={submitNotes} data-html2canvas-ignore="true">
            <div className="field">
              <label htmlFor="cs-notes">What should it change?</label>
              <textarea
                id="cs-notes"
                rows={6}
                maxLength={MAX_NOTES_LENGTH}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="For example: most of my lost backhand loops were against heavy backspin pushes, not his serve."
              />
              <p className="cs-small muted">
                Corrections are treated as fact. Kept for later rewrites, never shown on shared links. {notes.length}/{MAX_NOTES_LENGTH}
              </p>
            </div>
            <div className="cs-form-actions">
              <button type="submit" className="btn primary" disabled={generating || (!notes.trim() && !savedNotes)}>
                {generating ? 'Rewriting...' : notes.trim() ? 'Rewrite with my notes' : 'Clear notes and rewrite'}
              </button>
              <button type="button" className="btn quiet" onClick={() => setEditing(false)} disabled={generating}>Cancel</button>
            </div>
          </form>
        )}

        {isOwner && savedNotes && !editing && (
          <div className="card cs-rail-card" data-html2canvas-ignore="true">
            <span className="cs-rail-title">Your notes</span>
            <p className="cs-notes">{savedNotes}</p>
            <span className="cs-small muted">Used every time it's rewritten. Not shown on shared links.</span>
          </div>
        )}

        <p className="cs-small muted cs-disclaimer">
          Written by AI from the points entered for this match. It only knows the last two shots of each point, so check what it suggests against the video.
        </p>
      </aside>
    </div>
  );
};

export default CoachSummary;
