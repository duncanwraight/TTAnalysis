// Prerenders the signed-out homepage into dist/index.html.
//
// dist/index.html is served for "/" only. Every other route is rewritten to
// dist/app.html (see vercel.json), the same page with an empty root, so other
// pages never flash the brochure. A small inline script hides the prerendered
// brochure from browsers holding a session, since they're redirected to /matches.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dist = path.resolve('dist');
const ssrEntry = path.resolve('dist-ssr/prerender.js');

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const EMPTY_ROOT = '<div id="root"></div>';
if (!template.includes(EMPTY_ROOT)) throw new Error('dist/index.html has no empty #root to fill');

const { render } = await import(pathToFileURL(ssrEntry).href);
const html = render();

const hideForSignedIn = `<script>try{if(Object.keys(localStorage).some(function(k){return /^sb-.+-auth-token$/.test(k)}))document.documentElement.classList.add('has-session')}catch(e){}</script>
    <style>html.has-session #root{visibility:hidden}</style>`;

const page = template
  .replace('</head>', `  ${hideForSignedIn}\n  </head>`)
  .replace(EMPTY_ROOT, `<div id="root">${html}</div>`);

await writeFile(path.join(dist, 'app.html'), template);
await writeFile(path.join(dist, 'index.html'), page);
await rm(path.resolve('dist-ssr'), { recursive: true, force: true });
console.log(`Prerendered / (${html.length} characters of HTML)`);
