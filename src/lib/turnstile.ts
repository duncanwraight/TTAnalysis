/**
 * Cloudflare Turnstile on the sign-in, sign-up and password reset forms.
 * Supabase Auth checks each token itself (Authentication, then Attack
 * Protection, holds the secret key), so the page only renders the widget and
 * passes its token along as `captchaToken`.
 */

/** The widget made for ttanalysis.app in the Cloudflare dashboard. Public by design. */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGXZaRUTsWd-N_C1';

/**
 * Cloudflare's test key that always passes. The local stack's Supabase checks
 * against the matching test secret in supabase/config.toml.
 */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

const PRODUCTION_HOST = 'ttanalysis.app';

/**
 * The real key only on the real site, because the widget refuses any
 * hostname it wasn't made for. Everywhere else (the dev server, a local
 * build, a preview) gets the test key.
 */
export const turnstileSiteKey = (hostname: string): string =>
  hostname === PRODUCTION_HOST ? TURNSTILE_SITE_KEY : TURNSTILE_TEST_SITE_KEY;
