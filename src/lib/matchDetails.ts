/**
 * Rules for a match's descriptive details: who the player is, the event and
 * the video link.
 */

export const MAX_PLAYER_NAME = 100;
export const MAX_EVENT = 200;
export const MAX_VIDEO_URL = 2000;

/** A video link we're willing to render: http or https only, no spaces. */
export const isSafeVideoUrl = (url: string | null | undefined): url is string => {
  if (!url || url.length > MAX_VIDEO_URL || !/^https?:\/\/\S+$/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Trimmed text, or null when empty. */
export const cleanText = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Whether the match is the account owner's own. Older matches have no player
 * name and are always the owner's.
 */
export const isOwnMatch = (playerName: string | null | undefined, myName: string | null | undefined): boolean => {
  const player = cleanText(playerName);
  if (!player) return true;
  const me = cleanText(myName);
  return !!me && sameName(player, me);
};

/** How the tracker labels the player: "You" for your own matches, else their name. */
export const playerLabel = (playerName: string | null | undefined, myName: string | null | undefined): string =>
  isOwnMatch(playerName, myName) ? 'You' : cleanText(playerName)!;

/**
 * Check the details form. Returns an error message to show, or null when the
 * details are fine.
 */
export const validateDetails = (details: { opponent_name: string; player_name?: string | null; event?: string | null; video_url?: string | null; date: string }): string | null => {
  if (!cleanText(details.opponent_name)) return 'Opponent name is required';
  if (!details.date) return 'Match date is required';
  if ((cleanText(details.player_name)?.length ?? 0) > MAX_PLAYER_NAME) return `Player name must be ${MAX_PLAYER_NAME} characters or fewer`;
  if ((cleanText(details.event)?.length ?? 0) > MAX_EVENT) return `Event must be ${MAX_EVENT} characters or fewer`;
  const video = cleanText(details.video_url);
  if (video && !isSafeVideoUrl(video)) return 'The video link must be a full web address starting with https://';
  return null;
};
