/**
 * The qualities an admin can tick against a shot for the AI summary, and what
 * each one means to the model. The keys must match the check constraint on
 * shots.check_qualities in the shot guide migration.
 */

export const QUALITIES = [
  { key: 'placement', label: 'Placement', meaning: 'where the ball lands: wide to the forehand, wide to the backhand, or at the crossover' },
  { key: 'length', label: 'Length', meaning: 'short (would bounce twice), half-long, or long' },
  { key: 'height', label: 'Height', meaning: 'how far over the net it travels' },
  { key: 'spin', label: 'Spin', meaning: 'how much spin is on it' },
  { key: 'variation', label: 'Spin variation', meaning: 'mixing the type and amount of spin so it is hard to read' },
  { key: 'speed', label: 'Speed', meaning: 'the pace of the ball' },
  { key: 'selection', label: 'Shot selection', meaning: 'whether it was the right ball to play that shot on' },
] as const;

export type QualityKey = typeof QUALITIES[number]['key'];

export const MAX_TECHNICAL_NOTES = 600;

export const qualityLabel = (key: string): string =>
  QUALITIES.find(q => q.key === key)?.label ?? key;

/** Keys in the list's order, with anything unknown dropped. */
export const sortQualities = (keys: readonly string[]): QualityKey[] =>
  QUALITIES.filter(q => keys.includes(q.key)).map(q => q.key);

/**
 * The technical side of receiving serve, whatever shot the receive was. A
 * missed receive is nearly always a misread serve rather than a fault in the
 * stroke, so the coach's summary uses this instead of the stroke's own notes.
 */
export const RECEIVE_GUIDANCE = 'Receiving is mostly about reading the serve. Watch the ball, not just the server\'s arm: from the toss, through contact, to the first bounce. Be balanced and ready to move before the serve is struck. Above all, read the spin, and use the bat\'s angle and the contact to cope with it. A missed receive is nearly always a misread serve, not a fault in the stroke used to return it.';

/** What tactical and technical mean on the shot guide and in the coach's summary. */
export const TACTICAL_DEFINITION = 'Tactical: something you can change during a match to influence it, such as where you place the ball, how you vary it or which shot you choose.';
export const TECHNICAL_DEFINITION = 'Technical: something in the stroke itself, or in reading spin, that you work on in practice.';
