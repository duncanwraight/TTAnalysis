# Architecture

Last updated: 2026-11-27

An overview of how TTAnalysis fits together. `CLAUDE.md` in the repo root has the detail: the schema, the analysis rules and the site's wording.

## Hosting

- **Frontend:** a Vite build of a React and TypeScript single-page app, deployed by Vercel from `main` to https://ttanalysis.app.
- **Backend:** Supabase. Postgres with row-level security for all data, Supabase Auth for accounts, and one Edge Function (`match-summary`) for the coach's summary.
- There is no server of our own. The browser talks to Supabase directly through `supabase-js`, and RLS decides what each request can read and write.

The build prerenders the signed-out homepage into `dist/index.html`, served only for `/`, and each help page into `dist/help/`, served only for its own route. Every other route is rewritten to `dist/app.html`.

## Search and analytics

- **Indexed:** only the homepage and the help pages. `scripts/prerender.mjs` writes `sitemap.xml` (those routes, from `HELP_ROUTES`) and `robots.txt`, gives the homepage a canonical link and JSON-LD (`WebSite` and `WebApplication`), and each help page its own title, description and canonical link.
- **Not indexed:** `app.html` carries `noindex`, so sign-in, app pages, share links and made-up URLs stay out of search. robots.txt doesn't block them, because a crawler has to load a page to read its noindex.
- **`vercel.json`:** `trailingSlash: false`, a year's immutable cache on `/assets/` (the file names are hashed), and robots.txt served as plain text.
- **Fonts:** Inter and Inter Tight are self-hosted through `@fontsource`. Help pages preload the 400 and 700 weights so long paragraphs don't rewrap when they arrive. The homepage doesn't, because there it only delayed the first paint.
- **Screenshots** on the homepage come in two sizes, the original and an 800px `-800.webp`, picked through `srcset`.
- **Analytics:** Vercel Web Analytics, production only, cookieless. `redactSharePath` in `src/lib/analyticsPath.ts` replaces share tokens before a page view is sent, and the query and hash are dropped.

`docs/SEO_REVIEW.md` has the review behind this, and *SEO* in `docs/NEXT_STEPS.md` what's left.

## Routes and pages

Every page except Home, Auth and Help is lazy-loaded in `App.tsx` inside `PageErrorBoundary`. Owner pages sit behind `ProtectedRoute`.

| Route | Page | What it does |
| --- | --- | --- |
| `/matches` | `MatchList` | The owner's matches |
| `/matches/new` | `NewMatch` | Pick a player and opponent, copy their styles onto the match |
| `/matches/:id` | `MatchTracker` | Enter points |
| `/matches/:id/analysis`, `/summary` | `MatchAnalysis` | The analysis and the coach's summary |
| `/matches/:id/points` | `PointsEditor` | Edit points after the match |
| `/matches/:id/sweep/:tag` | `PointSweep` | Tick one tag point by point |
| `/players` | `Players` | Players, their styles and notes |
| `/players/:id/history` (`/shots`, `/opponents`) | `PlayerHistory` | Every match for one player |
| `/admin`, `/admin/shots`, `/admin/styles` | Admin pages | Users, budget, shots and their guide, styles of play |
| `/shared/:token` | `MatchAnalysis` | A shared match |
| `/help`, `/help/:page` | `Help` | Public help pages, written in MDX (`src/help`) |
| `/shared/history/:token` | `PlayerHistory` | A shared player history, with each match under `/matches/:id` |

## Sign-in

Supabase Auth with email and password. The sign-in, sign-up and password reset forms carry Cloudflare Turnstile, to keep automated sign-ups out: the widget's token goes to Supabase as `captchaToken`, and Supabase checks it against the secret key in its Attack Protection settings. Off ttanalysis.app the app uses Cloudflare's always-pass test key, and the local stack's `config.toml` turns the check on with the matching test secret. Without an account, a request can only read the reference tables (shots, styles and their notes) and whatever a share token opens, so sign-up is the one door worth guarding.

## Data access

- `src/lib/supabase.ts` creates the signed-in client, and `createSharedClient(token)` creates one that sends the `x-share-token` header.
- `src/lib/api.ts` holds every query, grouped by area (`match`, `history` and so on). Pages get it through `useApi`.
- PostgREST returns at most 1,000 rows per request, so the player history fetches points in pages.

## Sharing

Sharing sets a random UUID on the row being shared: `matches.share_token` for a match, `players.share_token` for a player's history. RLS policies let anon and signed-in requests read a row only when the request sends the matching token in `x-share-token`, which `request_share_token()` reads.

A shared history can read that player's matches, sets, points and summaries. Players aren't readable by anon, so `shared_history_player_id()` and `shared_history_player()` are security definer functions. The second returns the player's name and style but never their notes. Owner-only tables such as `match_summary_notes` stay closed on every share link. Clearing the token kills the link. Signed-out visitors see a short invitation to try the app under a shared page (`AppFrame`), and shared pages are `noindex`.

## Analysis

The analysis is computed in the browser, not in SQL.

- `buildAnalysis` in `src/lib/analysis.ts` turns one match's sets, points and shots into everything the analysis page shows.
- `buildHistory` in `src/lib/history.ts` takes one analysis per match and adds them up for the player history. Totals add points together rather than averaging percentages.
- The `match-summary` Edge Function imports the same `analysis.ts` and `aiSummary.ts`, so the page and the coach's summary work from the same numbers. That's why `src/lib` imports use `.ts` extensions.

The logic in `src/lib` is covered by Vitest tests next to each file.

## Styling

Custom CSS with no UI library. Tokens and shared pieces (cards, buttons, fields, `.segmented`, `.data-table`, `.notice`) live in `src/index.css`. Page styles are in `src/styles`. Blue `--you` is always the player and orange `--opp` the opponent. The design is mobile first, because the tracker is used courtside.
