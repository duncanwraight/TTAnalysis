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
