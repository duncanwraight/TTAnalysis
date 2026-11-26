/**
 * Styles of play, hands and rubbers, and the part of the coach's summary input
 * built from them. Shared by the app and the match-summary Edge Function, so
 * it stays free of React, Supabase and Deno.
 *
 * Styles carry tactical notes (playing as the style, and against it). Technical
 * advice comes from the player's own notes. See docs/NEXT_STEPS.md.
 */

export const HANDS = ['right', 'left'] as const;
export type Hand = typeof HANDS[number];

export const RUBBERS = ['inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti'] as const;
export type Rubber = typeof RUBBERS[number];

export const HAND_LABEL: Record<Hand, string> = { right: 'Right-handed', left: 'Left-handed' };
export const RUBBER_LABEL: Record<Rubber, string> = {
  inverted: 'Inverted',
  short_pips: 'Short pips',
  medium_pips: 'Medium pips',
  long_pips: 'Long pips',
  anti: 'Anti',
};

/** Hands and rubbers with their own notes. Right-handed and inverted are the normal case. */
export const KIT_KEYS = ['left_handed', 'short_pips', 'medium_pips', 'long_pips', 'anti'] as const;
export type KitKey = typeof KIT_KEYS[number];
export const KIT_LABEL: Record<KitKey, string> = {
  left_handed: 'Left-handed',
  short_pips: 'Short pips',
  medium_pips: 'Medium pips',
  long_pips: 'Long pips',
  anti: 'Anti',
};

export const MAX_STYLE_NOTES = 800;
export const MAX_STYLE_DESCRIPTION = 160;
export const MAX_PLAYER_NOTES = 1000;

export type PlayStyle = {
  id: string;
  name: string;
  description: string;
  as_notes: string;
  against_notes: string;
  display_order: number;
};

export type KitNote = { key: KitKey; against_notes: string };

export type StyleMatchup = { id: string; player_style_id: string; opponent_style_id: string; notes: string };

/** One side's style, hand and rubbers. Every part is optional. */
export type Kit = {
  style_id: string | null;
  hand: Hand | null;
  forehand_rubber: Rubber | null;
  backhand_rubber: Rubber | null;
};

export const EMPTY_KIT: Kit = { style_id: null, hand: null, forehand_rubber: null, backhand_rubber: null };

export type Player = Kit & {
  id: string;
  name: string;
  is_self: boolean;
  notes: string;
};

/** The style columns on a match. */
export type MatchKit = {
  player_style_id?: string | null;
  player_hand?: Hand | null;
  player_forehand_rubber?: Rubber | null;
  player_backhand_rubber?: Rubber | null;
  opponent_style_id?: string | null;
  opponent_hand?: Hand | null;
  opponent_forehand_rubber?: Rubber | null;
  opponent_backhand_rubber?: Rubber | null;
};

export const playerKit = (m: MatchKit): Kit => ({
  style_id: m.player_style_id ?? null,
  hand: m.player_hand ?? null,
  forehand_rubber: m.player_forehand_rubber ?? null,
  backhand_rubber: m.player_backhand_rubber ?? null,
});

export const opponentKit = (m: MatchKit): Kit => ({
  style_id: m.opponent_style_id ?? null,
  hand: m.opponent_hand ?? null,
  forehand_rubber: m.opponent_forehand_rubber ?? null,
  backhand_rubber: m.opponent_backhand_rubber ?? null,
});

/** A kit as match columns, for saving. */
export const kitColumns = (side: 'player' | 'opponent', kit: Kit): MatchKit => ({
  [`${side}_style_id`]: kit.style_id,
  [`${side}_hand`]: kit.hand,
  [`${side}_forehand_rubber`]: kit.forehand_rubber,
  [`${side}_backhand_rubber`]: kit.backhand_rubber,
});

export const hasKit = (kit: Kit) => !!(kit.style_id || kit.hand || kit.forehand_rubber || kit.backhand_rubber);

/** "inverted forehand, long pips backhand", or "inverted both sides". Empty when neither is known. */
export const describeRubbers = (kit: Pick<Kit, 'forehand_rubber' | 'backhand_rubber'>): string => {
  const { forehand_rubber: fh, backhand_rubber: bh } = kit;
  if (fh && fh === bh) return `${RUBBER_LABEL[fh].toLowerCase()} both sides`;
  return [fh && `${RUBBER_LABEL[fh].toLowerCase()} forehand`, bh && `${RUBBER_LABEL[bh].toLowerCase()} backhand`].filter(Boolean).join(', ');
};

/** "Left-handed · inverted forehand, short pips backhand". Empty when nothing is known. */
export const describeHandAndRubbers = (kit: Kit): string =>
  [kit.hand && HAND_LABEL[kit.hand], describeRubbers(kit)].filter(Boolean).join(' · ');

const clean = (text: string | null | undefined) => (text ?? '').trim();

/** Everything about styles the coach's summary needs, as loaded from the database. */
export type StyleData = {
  styles: PlayStyle[];
  kitNotes: KitNote[];
  matchups: StyleMatchup[];
};

/**
 * The input section on styles and the player's notes. Empty when there's
 * nothing to say, so a match without them sends the same input as before.
 * The page and the Edge Function both call this, so they hash the same text.
 */
export const buildStyleSection = (match: MatchKit, data: StyleData, playerNotes: string | null | undefined): string[] => {
  const styleById = new Map(data.styles.map(s => [s.id, s]));
  const kitNote = (key: KitKey) => clean(data.kitNotes.find(k => k.key === key)?.against_notes);
  const player = playerKit(match);
  const opponent = opponentKit(match);
  const playerStyle = player.style_id ? styleById.get(player.style_id) : undefined;
  const opponentStyle = opponent.style_id ? styleById.get(opponent.style_id) : undefined;

  const describe = (who: string, style: PlayStyle | undefined, kit: Kit, notesLabel: string, notes: string) => {
    const kitText = describeHandAndRubbers(kit).replace(' · ', ', ');
    if (!style && !kitText) return null;
    const parts = [
      style ? `${who}'s style: ${style.name}${clean(style.description) ? ` (${clean(style.description)})` : ''}.` : `${who}'s style: not given.`,
      kitText && `${kitText.charAt(0).toUpperCase()}${kitText.slice(1)}.`,
      notes && `${notesLabel}: ${notes}`,
    ];
    return parts.filter(Boolean).join(' ');
  };

  const lines: string[] = [];
  const playerLine = describe('Player', playerStyle, player, 'Playing as this style', clean(playerStyle?.as_notes));
  if (playerLine) lines.push(playerLine);
  const opponentLine = describe('Opponent', opponentStyle, opponent, 'Playing against this style', clean(opponentStyle?.against_notes));
  if (opponentLine) lines.push(opponentLine);

  // Notes for the opponent's hand and rubbers, where they aren't the normal case
  if (opponent.hand === 'left' && kitNote('left_handed')) lines.push(`Against a left-hander: ${kitNote('left_handed')}`);
  const rubberSides: [Rubber | null, string][] = [[opponent.forehand_rubber, 'forehand'], [opponent.backhand_rubber, 'backhand']];
  const rubbers = new Map<Rubber, string[]>();
  for (const [rubber, side] of rubberSides) {
    if (rubber && rubber !== 'inverted') rubbers.set(rubber, [...(rubbers.get(rubber) ?? []), side]);
  }
  for (const [rubber, sides] of rubbers) {
    const note = kitNote(rubber as KitKey);
    if (note) lines.push(`Against ${RUBBER_LABEL[rubber].toLowerCase()} (the opponent's ${sides.join(' and ')}): ${note}`);
  }

  if (playerStyle && opponentStyle) {
    const matchup = clean(data.matchups.find(m => m.player_style_id === playerStyle.id && m.opponent_style_id === opponentStyle.id)?.notes);
    if (matchup) lines.push(`Match-up, ${playerStyle.name.toLowerCase()} against ${opponentStyle.name.toLowerCase()}: ${matchup}`);
  }

  const notes = clean(playerNotes);
  if (notes) lines.push(`Notes on the player, written by whoever entered the match: ${notes}`);

  if (!lines.length) return [];
  return [
    '',
    'Styles and the player\'s notes. These shape what to check and suggest. They are not evidence of what happened in this match.',
    ...lines,
  ];
};
