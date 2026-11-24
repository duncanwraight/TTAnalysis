import { describe, expect, it } from 'vitest';
import { cleanText, isOwnMatch, isSafeVideoUrl, playerLabel, validateDetails } from './matchDetails';

describe('isSafeVideoUrl', () => {
  it('accepts http and https links', () => {
    expect(isSafeVideoUrl('https://youtu.be/abc123')).toBe(true);
    expect(isSafeVideoUrl('http://example.com/match.mp4')).toBe(true);
    expect(isSafeVideoUrl('HTTPS://EXAMPLE.COM/x')).toBe(true);
  });

  it('rejects other schemes and junk', () => {
    expect(isSafeVideoUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeVideoUrl('data:text/html,hi')).toBe(false);
    expect(isSafeVideoUrl('youtube.com/watch?v=1')).toBe(false);
    expect(isSafeVideoUrl('https://exa mple.com')).toBe(false);
    expect(isSafeVideoUrl('')).toBe(false);
    expect(isSafeVideoUrl(null)).toBe(false);
  });
});

describe('cleanText', () => {
  it('trims and turns empty into null', () => {
    expect(cleanText('  Winter league ')).toBe('Winter league');
    expect(cleanText('   ')).toBeNull();
    expect(cleanText(undefined)).toBeNull();
  });
});

describe('isOwnMatch and playerLabel', () => {
  it('treats a match with no player name as your own', () => {
    expect(isOwnMatch(null, 'Dunc')).toBe(true);
    expect(playerLabel('', 'Dunc')).toBe('You');
  });

  it('matches your name ignoring case and spaces', () => {
    expect(isOwnMatch(' dunc ', 'Dunc')).toBe(true);
    expect(playerLabel('DUNC', 'Dunc')).toBe('You');
  });

  it('uses the friend\'s name for someone else\'s match', () => {
    expect(isOwnMatch('Sam', 'Dunc')).toBe(false);
    expect(playerLabel('Sam', 'Dunc')).toBe('Sam');
  });

  it('uses the player name when you have no name set', () => {
    expect(playerLabel('Sam', null)).toBe('Sam');
  });
});

describe('validateDetails', () => {
  const base = { opponent_name: 'Alex', date: '2026-11-24' };

  it('accepts the minimum', () => {
    expect(validateDetails(base)).toBeNull();
  });

  it('requires an opponent and a date', () => {
    expect(validateDetails({ ...base, opponent_name: '  ' })).toMatch(/Opponent/);
    expect(validateDetails({ ...base, date: '' })).toMatch(/date/);
  });

  it('rejects a video link that isn\'t a web address', () => {
    expect(validateDetails({ ...base, video_url: 'javascript:alert(1)' })).toMatch(/https/);
    expect(validateDetails({ ...base, video_url: 'https://youtu.be/x' })).toBeNull();
  });

  it('limits the lengths', () => {
    expect(validateDetails({ ...base, event: 'x'.repeat(201) })).toMatch(/Event/);
    expect(validateDetails({ ...base, player_name: 'x'.repeat(101) })).toMatch(/Player/);
  });
});
