// Prerenders the signed-out homepage into dist/index.html, and each help page
// into dist/help/. Also writes sitemap.xml and robots.txt, and marks
// dist/app.html noindex.
//
// dist/index.html is served for "/" only, and each help file only for its own
// route (both through vercel.json). Every other route is rewritten to
// dist/app.html, the same page with an empty root, so other pages never flash
// prerendered HTML. A small inline script marks browsers holding a session:
// the brochure hides itself from them, since they're redirected to /matches,
// and a help page hides its signed-out header links.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dist = path.resolve('dist');
const ssrEntry = path.resolve('dist-ssr/prerender.js');

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const EMPTY_ROOT = '<div id="root"></div>';
if (!template.includes(EMPTY_ROOT)) throw new Error('dist/index.html has no empty #root to fill');

const { render, renderHelp, helpRoutes } = await import(pathToFileURL(ssrEntry).href);

const markSession = (hide) => `<script>try{if(Object.keys(localStorage).some(function(k){return /^sb-.+-auth-token$/.test(k)}))document.documentElement.classList.add('has-session')}catch(e){}</script>
    <style>html.has-session ${hide}{visibility:hidden}</style>`;

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Swaps one tag in the template's head, failing loudly if index.html changes shape
const swap = (html, pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`index.html has no match for ${pattern}`);
  return html.replace(pattern, replacement);
};

const SITE = 'https://ttanalysis.app';

// What search engines read about the site: its name, and that it's a free
// web app. Shown only on the homepage.
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TT Analysis',
    url: `${SITE}/`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TT Analysis',
    url: `${SITE}/`,
    description: 'Film your table tennis match, enter the winning and losing shot for each point, and see which shots won and lost it.',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Any (runs in a web browser)',
    browserRequirements: 'Requires JavaScript',
    inLanguage: 'en-GB',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  },
];
// "<" can't close the script tag once escaped
const jsonLd = structuredData
  .map(item => `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`)
  .join('\n    ');

// The homepage
const brochure = render();
// Every route that isn't the homepage or help (sign-in, matches, share links,
// made-up URLs) gets this empty shell, so it stays out of search. Robots must
// still be allowed to crawl these paths to read the noindex.
await writeFile(
  path.join(dist, 'app.html'),
  template.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>'),
);
await writeFile(
  path.join(dist, 'index.html'),
  swap(template, /<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${SITE}/" />\n    <link rel="canonical" href="${SITE}/" />`)
    .replace('</head>', `  ${jsonLd}\n    ${markSession('#root')}\n  </head>`)
    .replace(EMPTY_ROOT, `<div id="root">${brochure}</div>`),
);
console.log(`Prerendered / (${brochure.length} characters of HTML)`);

// Every help route needs its own rewrite, or it would get the empty app.html
const vercel = JSON.parse(await readFile(path.resolve('vercel.json'), 'utf8'));
const rewrites = new Map(vercel.rewrites.map(r => [r.source, r.destination]));
const helpFile = (route) => (route === '/help' ? '/help/index.html' : `${route}.html`);
const wrong = helpRoutes.filter(route => rewrites.get(route) !== helpFile(route));
if (wrong.length > 0) {
  throw new Error(`vercel.json needs a rewrite for each help page, before the catch-all:\n${wrong.map(r => `  { "source": "${r}", "destination": "${helpFile(r)}" }`).join(',\n')}`);
}
const extra = [...rewrites.keys()].filter(source => source.startsWith('/help') && !helpRoutes.includes(source));
if (extra.length > 0) throw new Error(`vercel.json rewrites help routes that don't exist: ${extra.join(', ')}`);

await mkdir(path.join(dist, 'help'), { recursive: true });
for (const route of helpRoutes) {
  const { html, title, description } = renderHelp(route);
  const url = `${SITE}${route}`;
  let page = template;
  page = swap(page, /<title>.*?<\/title>/, `<title>${escape(title)}</title>`);
  page = swap(page, /<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escape(description)}" />`);
  page = swap(page, /<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${escape(title)}" />`);
  page = swap(page, /<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${escape(description)}" />`);
  page = swap(page, /<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />\n    <link rel="canonical" href="${url}" />`);
  page = page
    .replace('</head>', `  ${markSession('.app-nav')}\n  </head>`)
    .replace(EMPTY_ROOT, `<div id="root">${html}</div>`);
  await writeFile(path.join(dist, helpFile(route)), page);
}
console.log(`Prerendered ${helpRoutes.length} help pages`);

// The pages search engines should index: the homepage and every help page.
// Everything else is noindex (app.html above).
const indexed = ['/', ...helpRoutes];
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map(route => `  <url><loc>${SITE}${route}</loc></url>`).join('\n')}
</urlset>
`,
);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Wrote sitemap.xml (${indexed.length} pages) and robots.txt`);

await rm(path.resolve('dist-ssr'), { recursive: true, force: true });
