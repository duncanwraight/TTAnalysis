/**
 * The help pages at /help, in reading order. Each page's words are an MDX file
 * in ./content named after its slug; the contents page's common questions are
 * ./content/contents.mdx. Adding a page means an entry here, its MDX file and a
 * rewrite in vercel.json (the build checks the rewrites match this list).
 */

export type HelpSection = 'Getting started' | 'How to' | 'Look it up' | 'How it works';

export type HelpPageInfo = {
  slug: string;
  section: HelpSection;
  title: string;
  // One or two sentences under the title, also the page's meta description
  description: string;
  // A shorter title for the side menu, when the full one is long
  short?: string;
  // The browser tab's and search result's title, when the page's own title
  // doesn't say it's about table tennis
  metaTitle?: string;
};

export const HELP_SECTIONS: { section: HelpSection; note: string }[] = [
  { section: 'How to', note: 'One job a page, in steps.' },
  { section: 'Look it up', note: 'Terms and keys, for when you need one fact.' },
  { section: 'How it works', note: 'The thinking behind the numbers.' },
];

export const HELP_PAGES: HelpPageInfo[] = [
  {
    slug: 'first-match',
    section: 'Getting started',
    title: 'Your first match, from video to analysis',
    metaTitle: 'Your first table tennis match, from video to analysis',
    short: 'Your first match',
    description: 'Film it, create the match, enter two shots a point, then read the analysis.',
  },
  {
    slug: 'tracker',
    section: 'How to',
    title: 'Enter points in the tracker',
    description: 'Who won, the winning and losing shots, the two ticks, and what to do when the video and the score drift apart.',
  },
  {
    slug: 'unforced-errors-and-attacks',
    section: 'How to',
    title: 'Mark unforced errors and attacks',
    metaTitle: 'Mark unforced errors and attacks in a table tennis match',
    short: 'Mark unforced errors and attacks',
    description: 'Go back through a match one point at a time with a sweep, and tick one thing on each point.',
  },
  {
    slug: 'fix-a-point',
    section: 'How to',
    title: 'Fix a point entered wrongly',
    description: 'Change a tick, a shot or who won a point, and what to do when one change leaves the match not adding up.',
  },
  {
    slug: 'someone-else',
    section: 'How to',
    title: 'Enter a match for someone else',
    short: 'Enter a match for someone else',
    description: 'For coaches, and for anyone filming a friend. Players, styles of play and private notes.',
  },
  {
    slug: 'sharing',
    section: 'How to',
    title: "Share a match or a player's history",
    short: 'Share a match or history',
    description: 'Send a link that opens without an account, and stop sharing when you want the link to stop working.',
  },
  {
    slug: 'glossary',
    section: 'Look it up',
    title: 'Glossary',
    metaTitle: 'Table tennis match analysis glossary',
    description: 'What the words on the tracker, the analysis page and the coach\'s summary mean.',
  },
  {
    slug: 'keyboard-shortcuts',
    section: 'Look it up',
    title: 'Keyboard shortcuts',
    description: 'Keys for the tracker and the sweep page, on screens wider than 768 pixels.',
  },
  {
    slug: 'analysis-page',
    section: 'Look it up',
    title: 'The analysis page, section by section',
    short: 'The analysis page',
    description: 'What each section of a match\'s analysis counts, and what it leaves out.',
  },
  {
    slug: 'player-history',
    section: 'Look it up',
    title: 'Player history',
    description: 'Every match for one player added together: trends, shots and opponents.',
  },
  {
    slug: 'two-shots',
    section: 'How it works',
    title: 'Why you only enter two shots a point',
    short: 'Why two shots a point',
    description: 'What the winning and losing shot can tell you, and what they can\'t.',
  },
  {
    slug: 'coach-summary',
    section: 'How it works',
    title: "How the coach's summary is written",
    short: "How the coach's summary works",
    description: 'What the AI coach reads, the rules it follows, and how to correct it.',
  },
];

export const findHelpPage = (slug: string | undefined): HelpPageInfo | undefined =>
  HELP_PAGES.find(p => p.slug === slug);

/** The content file's name for a slug; the contents page has its own. */
export const CONTENTS_SLUG = 'contents';

/**
 * Which help page a path shows: the contents slug for /help, a page's slug
 * for /help/<slug>, and null for anything else, including unknown slugs.
 */
export const helpSlugForPath = (pathname: string): string | null => {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/help') return CONTENTS_SLUG;
  const match = /^\/help\/([a-z0-9-]+)$/.exec(path);
  return match && findHelpPage(match[1]) ? match[1] : null;
};

/** Every prerendered help route, for scripts/prerender.mjs and the vercel.json check. */
export const HELP_ROUTES: string[] = ['/help', ...HELP_PAGES.map(p => `/help/${p.slug}`)];

/** "Who attacked first" becomes "who-attacked-first", the anchor the app's help links use. */
export const headingId = (text: string) =>
  text.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The link to a help page, and to a heading on it. */
export const helpPath = (slug: string, heading?: string) => `/help/${slug}${heading ? `#${headingId(heading)}` : ''}`;

/** The title in index.html, put back when leaving help. */
export const APP_TITLE = 'TT Analysis: table tennis match analysis from video';

/** The browser tab's title for a help page, or for the contents when null. */
export const helpTitle = (page: HelpPageInfo | null | undefined) =>
  page ? `${page.metaTitle ?? page.title} | TT Analysis help` : 'Table tennis match analysis help | TT Analysis';
