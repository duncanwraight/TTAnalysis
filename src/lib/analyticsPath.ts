/**
 * A path with any share token replaced, for page view analytics. A share
 * token is all it takes to read a match or a player's history, so it must
 * never be sent anywhere else.
 */
export const redactSharePath = (pathname: string): string =>
  pathname
    .replace(/^\/shared\/history\/[^/]+/, '/shared/history/[token]')
    .replace(/^\/shared\/(?!history\/)[^/]+/, '/shared/[token]');
