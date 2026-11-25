/**
 * Whether this browser holds a signed-in Supabase session. Read straight from
 * localStorage, so it works before the auth client has loaded. The share-link
 * client stores under 'sb-shared-view', which this deliberately skips.
 */
export const hasStoredSession = (): boolean => {
  try {
    return Object.keys(localStorage).some(key => /^sb-.+-auth-token$/.test(key));
  } catch {
    return false;
  }
};
