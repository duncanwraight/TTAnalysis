import { describe, expect, it } from 'vitest';
import { redactSharePath } from './analyticsPath';

const TOKEN = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';

describe('redactSharePath', () => {
  it('hides a shared match token', () => {
    expect(redactSharePath(`/shared/${TOKEN}`)).toBe('/shared/[token]');
    expect(redactSharePath(`/shared/${TOKEN}/summary`)).toBe('/shared/[token]/summary');
  });

  it('hides a shared history token, keeping the rest of the path', () => {
    expect(redactSharePath(`/shared/history/${TOKEN}`)).toBe('/shared/history/[token]');
    expect(redactSharePath(`/shared/history/${TOKEN}/matches/42`)).toBe('/shared/history/[token]/matches/42');
  });

  it('leaves other paths alone', () => {
    expect(redactSharePath('/help/glossary')).toBe('/help/glossary');
    expect(redactSharePath('/matches/42/analysis')).toBe('/matches/42/analysis');
    expect(redactSharePath('/')).toBe('/');
  });
});
