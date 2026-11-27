import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENTS_SLUG, HELP_PAGES, HELP_ROUTES, headingId, helpPath, helpSlugForPath } from './pages';

const SRC = path.resolve(__dirname, '..');
const CONTENT = path.join(SRC, 'help', 'content');

const read = (file: string) => readFileSync(file, 'utf8');
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|mdx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [full] : [];
  });

/** The anchors a help page offers: its ## and ### headings, as HelpView gives them ids. */
const anchorsOf = (slug: string): Set<string> =>
  new Set(read(path.join(CONTENT, `${slug}.mdx`)).split('\n')
    .flatMap(line => /^#{2,3} (.+)$/.exec(line)?.[1] ?? [])
    .map(headingId));

describe('help pages', () => {
  it('has a content file for every page and the contents', () => {
    const files = readdirSync(CONTENT).map(f => f.replace(/\.mdx$/, '')).sort();
    expect(files).toEqual([CONTENTS_SLUG, ...HELP_PAGES.map(p => p.slug)].sort());
  });

  it('works out which page a path shows', () => {
    expect(helpSlugForPath('/help')).toBe(CONTENTS_SLUG);
    expect(helpSlugForPath('/help/')).toBe(CONTENTS_SLUG);
    expect(helpSlugForPath('/help/glossary')).toBe('glossary');
    expect(helpSlugForPath('/help/no-such-page')).toBeNull();
    expect(helpSlugForPath('/matches')).toBeNull();
    expect(HELP_ROUTES).toHaveLength(HELP_PAGES.length + 1);
  });

  it('turns headings into the anchors links use', () => {
    expect(headingId("Who attacked first")).toBe('who-attacked-first');
    expect(headingId("Share a player's history")).toBe('share-a-players-history');
    expect(helpPath('analysis-page', 'Serve and receive')).toBe('/help/analysis-page#serve-and-receive');
  });

  // A renamed heading would otherwise leave "How this works" links landing at the top of the page
  it('only links to help pages and headings that exist', () => {
    const broken: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = read(file);
      const name = path.relative(SRC, file);
      for (const [, slug, heading] of text.matchAll(/<HelpLink page="([a-z0-9-]+)"(?: heading="([^"]+)")?/g)) {
        if (!HELP_PAGES.some(p => p.slug === slug)) broken.push(`${name}: no page ${slug}`);
        else if (heading && !anchorsOf(slug).has(headingId(heading))) broken.push(`${name}: no heading "${heading}" on ${slug}`);
      }
      for (const [, slug, anchor] of text.matchAll(/\(\/help\/([a-z0-9-]+)(?:#([a-z0-9-]+))?\)/g)) {
        if (!HELP_PAGES.some(p => p.slug === slug)) broken.push(`${name}: no page ${slug}`);
        else if (anchor && !anchorsOf(slug).has(anchor)) broken.push(`${name}: no #${anchor} on ${slug}`);
      }
      // Links to a heading on the same page
      if (file.endsWith('.mdx')) {
        const slug = path.basename(file, '.mdx');
        for (const [, anchor] of text.matchAll(/\(#([a-z0-9-]+)\)/g)) {
          if (!anchorsOf(slug).has(anchor)) broken.push(`${name}: no #${anchor}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
