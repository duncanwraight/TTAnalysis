import { describe, expect, it } from 'vitest';
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY, turnstileSiteKey } from './turnstile';

describe('turnstileSiteKey', () => {
  it('uses the real key on the live site', () => {
    expect(turnstileSiteKey('ttanalysis.app')).toBe(TURNSTILE_SITE_KEY);
  });

  it('uses the always-pass test key everywhere else', () => {
    expect(turnstileSiteKey('localhost')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('127.0.0.1')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('www.ttanalysis.app')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('tt-analysis-abc123.vercel.app')).toBe(TURNSTILE_TEST_SITE_KEY);
  });
});
