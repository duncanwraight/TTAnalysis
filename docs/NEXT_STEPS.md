# Next steps

Last updated: 2026-11-28

Handover notes for picking this work up in a fresh session. Section 0 is the most recent work and lists what's left on it. The sections after it record what's already done and what's still open.

## Where things stand

Everything below is merged to `main`, migrated on production Supabase (project `ztozinueuucrdlfwusen`) and deployed to https://ttanalysis.app. See *Domain and hosting* for how the domain is set up.

Done on 2026-11-24, in order:

1. **Bug sweep:** analysis attribution, tracker scoring, undo across sets, End Set, best-of, shot selection rules, password reset page.
2. **Share links by token:** `matches.share_token` is a random UUID and the link is `/shared/<token>`. RLS only grants read access to requests that send the token in the `x-share-token` header (`createSharedClient` in `src/lib/supabase.ts`). Stop Sharing clears the token, which kills the link.
3. **Scoring tests** (section 5).
4. **Security audit** (section 6).
5. **Analysis page redesign, unforced errors, points editor, matches for friends, patterns** (section 7).
6. **Site-wide redesign and new tracker** (section 4), shipped in `ad8a04f`.
7. **AI coach's summary** (section 2): per-user toggle, Claude Opus 5.5 behind a Supabase Edge Function, a monthly budget, correction notes, a per-shot guide, and its own tab on the analysis page.

Done on 2026-11-25:

1. **Signed-out homepage brochure** (section 1), shipped in `b8d8a1e`.
2. **Wording sweep** (section 1): "film" and "enter" used consistently across the whole site, shipped in the commit after it.
3. **Tactical and technical** (section 2): both terms are now named and defined on `/admin/shots` and in the coach's summary.
4. **Homepage facts, redirect and prerendering** (section 1).
5. **Unforced errors in the coach's summary** (section 2): technical advice only, and a mental note when they bunch up late in sets. Function deployed to production.
6. **No out-of-date banner on share links** (section 2), shipped in `bf523cc`.
7. **Own domain** (*Domain and hosting*): the app moved to ttanalysis.app in `f6eaa13`. The user has checked it works.
8. **Shot balance** (section 7): a new section on the analysis page in place of Categories, a role per shot on `/admin/shots`, and two new cards.
9. **Shot balance in the coach's summary** (section 2), shipped in `76c4035`. Function deployed to production.
10. **Analysis page and prompt review** (`docs/ANALYSIS_REVIEW.md`): close finishes from 8-all, a Serve and receive section, a new page order, problem kinds and receive guidance in the prompt, and an eval script. `SUMMARY_VERSION` is now 6, so every stored summary shows as out of date until it's regenerated.

Done on 2026-11-26, all shipped (see *Sweeps* in section 7):

1. **Sweeps** with attacked first and a third-ball tag, in `65587b3`.
2. **Sweep-to-sweep fix**: the end screen's links kept the finished sweep's state, fixed in `75b15bd`.
3. **Attacked straight away** in place of third ball, attacked first split by server, and a UX pass on `/admin/shots` and the analysis page, in `2c2a2ab`. `SUMMARY_VERSION` is now 8, so every stored summary shows as out of date.
4. **Players, styles of play and player notes** (section 0), in `7cb22be`. Migration applied and `match-summary` deployed.
5. **The coach's ten styles and the rubber notes** (section 0), in `0436147`. Migration applied.
6. **"This is me" unticked by default** on the new match form, in `ae30fd2`, and the user's own account fixed by hand (section 0).
7. **Player notes kept out of the summary's wording** (section 0), in `6a3ee03`. Function deployed.
8. **Code quality** (section 8): the last `any` types, the CLI v4 config names, the old SQL views dropped, pages loaded on demand and a smaller PDF export, in `7d33a3b`, `20e320c` and `579ff5f`.
9. **Stale tabs after a deploy** (section 8): reload once, then an error page instead of a blank screen, in `5d711ef`.
10. **Security** (section 6): React Router 7, 8-character passwords, no more sign-out on every deploy, and the user's Supabase dashboard changes, including Postgres 17. In `c1557d1` and `7f2ac24`. The user signed in on production after the upgrade and everything worked.
11. **"This is me" on the Players page** (section 0), in `450c7f2`. Migration `20261128120000_set_self_player.sql` applied to production on 2026-11-26.
12. **Keyboard shortcuts in the tracker** (section 4), in `bad9350`.
13. **Editing a point's winner and shots** (section 7), in `a123532` and `96bb7ce`. Migration `20261128130000_edit_points.sql` applied to production on 2026-11-26.
14. **No service fault as a losing shot** (section 4), in `ff29493`.
15. **Production checks:** no old points with a service fault as the losing shot, and no other account with a friend as its self player (sections 0 and 4). Adding or deleting a point mid-match was dropped: editing a point covers every mistake that keeps the point count right, and the tracker's score shows a missed point while it's being entered.
16. **Aesthetic sweep** (section 4), in `059a531`.

Shipped on 2026-11-26 (see *Player history* below):

1. **Player history** at `/players/:id/history`, with sharing by link, in `5188481`. Migration `20261129120000_player_history_sharing.sql` applied to production the same day. Not yet checked by the user on production.

Shipped on 2026-11-27 (see *Help pages* below):

1. **Help pages** at `/help`, public and prerendered, with "How this works" links from the app and shorter help text on its pages, in `7feaf7a`. No migration or function change. The user is reviewing the words on production.
2. **SEO review and fixes** (see *SEO* below): sitemap, robots.txt, noindex on app pages, structured data, self-hosted fonts, asset caching, an invitation on shared pages and Vercel Web Analytics, in `2c4a424` and `9d1eb10`. Then the Lighthouse fixes (contrast, smaller screenshots for phones, font preloads on help pages) in `1d5b222` and `3a05a16`. No migration or function change. Search Console, Bing and switching on Web Analytics are for the user.

The user has done real sweeps on production and checked the sweep page, the points editor, the analysis page and the shot editor, with everything working.

The user has checked the admin panel, the `/debug` removal and the AI summaries on production, and used the tracker for a real match with no bugs found. On 2026-11-26 they also confirmed on production the "This is me" box on the Players page, the tracker's keyboard shortcuts, the Edit button in the points editor and the password reset email (the link lands on ttanalysis.app/reset-password). The player history is the only shipped work waiting on a check by a person. The help pages shipped on 2026-11-27 and the user is reviewing the words (see *Help pages*).

## SEO

Reviewed on 2026-11-27: the findings and reasoning are in `docs/SEO_REVIEW.md`. The site wasn't in search at all: no sitemap, no Search Console, no links from other sites, and a two-day-old domain.

Built and shipped on 2026-11-27 (all ten below). Checked on a local build served through `vercel.json`'s rewrites, at 1440px and 390px: the fonts load from `/assets/` (latin files only), the hero has `fetchpriority="high"`, the FAQ links open, the shared match shows its invitation with no sideways scrolling, and `app.html` alone carries noindex. Decided while building:

- `@vercel/analytics` is in `main.tsx`, production only. Its `beforeSend` replaces share tokens with `[token]` (`redactSharePath` in `src/lib/analyticsPath.ts`, 3 tests) and drops the query and hash, because a share token is all it takes to read a match, and auth links carry codes. Production serves the analytics script (`/_vercel/insights/script.js` returns 200), but the Vercel API can't say whether Web Analytics is switched on, so check the project's Analytics tab shows visits and switch it on there if not. Checked on production after the deploy: robots.txt (as plain text), the sitemap, both icons, `/help/` redirecting to `/help`, noindex on `/matches`, `/shared/...` and made-up URLs but not on `/` or help, the homepage's canonical and two JSON-LD blocks, the glossary's new title, a year's cache on `/assets/`, and no Google Fonts.
- Help pages take an optional `metaTitle` in `src/help/pages.ts` for the browser tab and search result, so a title can name the sport without changing the page's heading. Set on the contents page, first match, unforced errors and attacks, and the glossary.
- The invitation on shared pages lives in `AppFrame`, shown to signed-out visitors on any `/shared/` path, and is left out of PDF exports. The sharing help page says so, and that shared pages ask search engines not to list them.
- The shared match page's requests for the owner's notes come back 401 for visitors. That was already so before this work, and it's RLS doing its job; nothing leaks.

Lighthouse 12.8, run on production on 2026-11-27 after the first deploy (scores are performance, accessibility, best practices and SEO):

| Page | Before | After |
| --- | --- | --- |
| Homepage, mobile | 98/95/100/100 | 94 to 97/100/100/100 |
| Homepage, desktop | 100/95/100/100 | 100/100/100/100 |
| Glossary, mobile | 99/100/100/100 | 98/100/100/100 |
| Glossary, desktop | 96/100/100/100 | 100/100/100/100 |

Fixed from it, in `1d5b222` and `3a05a16`:

- **Contrast:** five bits of small grey text on the homepage used the grey meant for the other background (the sample match caption, the step numbers, the coach section's fine print). Swapped.
- **Screenshots:** the seven large ones have 800px versions (`*-800.webp`) chosen through `srcset` on phones, tablets and 1x screens. The homepage went from 736 KiB to 515 on desktop and 712 to 491 on mobile.
- **Layout shift on help pages:** long paragraphs rewrapped when Inter arrived (0.116 on the glossary at desktop width). Help pages now preload Inter 400 and 700, and the shift is 0. Preloading on the homepage was tried and taken out: it doesn't shift, so there was nothing to gain.

Mobile performance on the homepage varies by 2 to 4 points between runs, because Lighthouse simulates a slow connection from the real one. Three runs before taking out the homepage preloads scored 94 to 96, and three after scored 94 to 97, so treat anything in the mid 90s as the same. What's still flagged and left alone: the analytics script's short cache (Vercel's, not ours), about 82 KiB of the main bundle unused on the homepage (it's the whole app, and the page is prerendered so it doesn't hold back the first paint), and the two phone screenshots, which are already close to the size they're shown at.

The list:

1. **robots.txt and sitemap.xml**, written by `scripts/prerender.mjs` from `HELP_ROUTES` plus `/`.
2. **noindex on `app.html`**, so `/auth`, `/matches`, `/shared/...` and made-up URLs stay out of search. The homepage and help pages stay indexable.
3. **Canonical on the homepage**, and `trailingSlash: false` so `/help/` redirects to `/help`.
4. **Long cache on `/assets/`** (hashed file names): `max-age=31536000, immutable`.
5. **JSON-LD on the homepage:** `WebSite` (site name) and `WebApplication` (free, runs in a browser).
6. **Icons:** a 180px `apple-touch-icon.png` and a `favicon.ico`.
7. **Performance:** self-host Inter instead of the render-blocking Google Fonts stylesheet, and `fetchpriority="high"` on the hero screenshot.
8. **Shared pages invite the visitor:** a line at the foot of a shared match or history ("Made with TT Analysis") linking to the homepage.
9. **Homepage FAQ links** to `/help/first-match` and `/help/two-shots`.
10. **"Table tennis" in the words people read:** the homepage eyebrow and help page titles, kept small.

Done by the user on 2026-11-28:

- **Google Search Console:** ttanalysis.app is a domain property, verified through Search Console's own Cloudflare integration (it added the TXT record itself), and the sitemap is submitted.
- **Bing Webmaster Tools:** imported from Search Console.
- **Vercel Web Analytics:** it was off, and is now on for `tt-analysis`. The dashboard's setup steps are for Next.js (`<Analytics />`); this app's `inject()` in `main.tsx` is the plain JavaScript equivalent, so no code change was needed. Vercel only accepts page views on deployments made after it's switched on.
- **Homepage eyebrow:** "league" dropped at the user's request ("For table tennis players and their coaches"), so it fits on one line on desktop. `public/og-image.png` was regenerated with it the same day.

Still for the user:

- **Off-site posts:** TableTennisDaily forum, r/tabletennis, the user's own league and club sites, AlternativeTo. A draft to work from was written in the session on 2026-11-28; the user is writing their own.

Later, each designed with the user first:

- **Guides on playing against styles and rubbers** (long pips, choppers, pushers first) at `/guides/<slug>`, written up from the notes on `/admin/styles`.
- **How to analyse a table tennis match from video**, for people who haven't signed up.
- **A public sample match** at a stable URL, from the Sam Carter sample.
- **A fuller copy pass** for "table tennis" on the homepage, with options for the user.

## Help pages (shipped)

Built on 2026-11-27 from the plan below and the design canvas the user liked: https://claude.ai/artifact/WHZXaJ33A66AAgq9V4Fbev. Shipped on 2026-11-27 in `7feaf7a`. Checked on production straight after the deploy: `/help` and each page tried come back with their own title and the page's HTML in the response, an unknown `/help/...` gets the app (which sends it to `/help`), and `/matches` is unchanged. The user is reviewing the words on production.

- **Where:** `src/help/pages.ts` (the list: slug, section, title, description), `src/help/content/*.mdx` (one file a page, plus `contents.mdx` for the common questions), `src/help/HelpView.tsx` (contents page and article layout, shared with the prerender), `src/pages/Help.tsx` (the route), `src/styles/help.css`, and `src/components/HelpLink.tsx` (the "How this works" link). MDX is `@mdx-js/rollup` with `remark-gfm` for tables, `enforce: 'pre'` in `vite.config.ts`.
- **Pages:** the twelve agreed below, at `/help/<slug>`: `first-match`, `tracker`, `unforced-errors-and-attacks`, `fix-a-point`, `someone-else`, `sharing`, `glossary`, `keyboard-shortcuts`, `analysis-page`, `player-history`, `two-shots`, `coach-summary`. The glossary, the sweeps page and the analysis page import `UNFORCED_ERROR_DEFINITION`, `TACTICAL_DEFINITION`, `TECHNICAL_DEFINITION`, `ATTACK_DEFINITION` and `SWEEPS` rather than copying them.
- **Prerendering:** `src/prerender.tsx` renders each help route signed out inside `AppFrame` (the header and footer, split out of `Layout` so the prerender doesn't load the auth client). `scripts/prerender.mjs` writes `dist/help/index.html` and `dist/help/<slug>.html` with their own title, description, Open Graph tags and canonical link, and fails the build unless `vercel.json` has exactly one rewrite per help route. For browsers holding a session it hides the signed-out header links until React renders. `Help` is in the main bundle (about 11 kB) and `main.tsx` loads the page's MDX before the first render, so the prerendered page is replaced by the same page, not a loading state. Each page's MDX is its own small chunk.
- **Links in the app:** Help in the header (signed in and out), the footer (with Keyboard shortcuts) and the brochure's nav and footer. "How this works" on every analysis section heading (to the matching heading on `/help/analysis-page`), the sweep page ("More about sweeps"), the points editor (sweeps and ticks), the Players page, the three player history notes and the coach's summary. The tracker's Help opens in a new tab and is greyed out mid-point. The empty match list has a "How it works" button. All of them are left out of PDF exports.
- **Less help text:** shortened to a line and a link on the analysis page (how to read it, serve and receive, your shots, unforced errors, patterns, who attacked first, shot balance, the stages note), the points editor's paragraph on ticks, the Players page intro, and the player history's Opponents, Shots and Over time notes. Left as they were: the sweep instructions (they're what the sweep asks), the coach's summary's tactical and technical definitions, and the field hints on forms.
- **Checks:** `src/help/pages.test.ts` (4 tests) checks every page has a content file, and that every `HelpLink` and every `/help/...#anchor` link points at a page and heading that exist. Lint, 192 tests and the build pass. Screenshotted at 1440px and 390px in headless Chromium against the local stack, serving `dist` through a small script that applies `vercel.json`'s rewrites: every help page with JavaScript off and on (same text both ways, no console errors, no sideways scrolling), and signed in, the analysis page, points editor, sweep, tracker and players page with their links. A "How this works" link lands on its heading and Back returns to the analysis page.
- **Still to do:** the user to read the words on production, especially the coach's summary page (it describes the prompt's rules in public) and the tracker's advice on a missed point. Screenshots were left out, as planned, until a page needs one.

The plan, agreed with the user on 2026-11-27:

- **Inside the app, public.** A `/help` section in the React app, readable without signing in, so people weighing up the brochure and coaches opening a share link can read it too. A separate docs site (Starlight, Docusaurus, GitBook) or a hosted help centre (Intercom, Help Scout) would mean a second deploy and look, or a monthly fee, for 10 to 15 pages.
- **Written in MDX.** `@mdx-js/rollup` in `vite.config.ts`, with `enforce: 'pre'` so it runs before `@vitejs/plugin-react`. Pages are `.mdx` files edited as prose. They import the definitions the app already uses (`UNFORCED_ERROR_DEFINITION`, `TACTICAL_DEFINITION`, `TECHNICAL_DEFINITION`, the sweep scopes) so help can't drift from the tooltips. Loaded with `React.lazy` like other pages.
- **Prerendered.** Extend `scripts/prerender.mjs` to `/help/*` and add a rewrite per help route in `vercel.json`, so the pages read before JavaScript loads and can be indexed.
- **Organised by what the reader is doing** (a light version of Diátaxis): one getting started walkthrough (film, create the match, enter points, read the analysis); how-to pages (sweeps, fixing a point, sharing a match or history, players); reference (a glossary of winning and losing shot, unforced error, attacked first, close finishes and shot roles, plus the keyboard shortcuts); explanation (why only two shots a point, how the coach's summary works).
- **Help where the question comes up.** A small "How this works" link on the tracker, the sweep page and each analysis section, opening the matching heading. A Help link in the header and footer.
- **No guided tours.** Completion drops sharply past 3 or 4 steps (Chameleon: 72% at 3 steps, 16% at 7 or more), and a popover gets in the way courtside.
- **No search at first.** One contents page is enough under about 20 pages.
- **Few screenshots.** They go out of date with every UI change. Use them only where words can't do the job (the scoreboard, the shot picker), from the sample match on the local stack.

- **Less help text around the site.** The user likes this most: tooltips, instructions and explanations in the app shrink to a line and link to the glossary entry or the guide instead.

Pages agreed with the user on 2026-11-27:

- **Getting started: Your first match, from video to analysis.** Filming (any phone, playback at 1.25x or 1.5x), creating the match, the first few points, a quick tour of the analysis. Links out rather than repeating the detailed pages.
- **How to: Enter points in the tracker.** Who won, the winning and losing shots, hand, the unforced and lucky ticks, Undo, End Set, and what to do when the video and the score drift apart.
- **How to: Mark unforced errors and attacks.** The sweeps page. The title avoids "sweep", which means nothing to a new user; the page introduces the word. The four sweeps, running one, and when a tag starts counting.
- **How to: Fix a point entered wrongly.** Ticks in the points editor, Edit, why a winner change in a finished set needs a second change, and what can't be changed.
- **How to: Enter a match for someone else.** Open with why you'd do it (you coach, or you're helping a friend). Players, what "you" means on the analysis page, styles, hand and rubbers, and that notes are private.
- **How to: Share a match or a player's history.** What the person opening the link sees and never sees, and Stop sharing.
- **Look it up: Glossary.** Every term, including sweep and style of play. The app links here instead of explaining in place.
- **Look it up: Keyboard shortcuts.** Tracker and sweep page keys, screens wider than 768px only.
- **Look it up: The analysis page, section by section.** Each section's "How this works" link lands on its heading here.
- **Look it up: Player history.** The three tabs, how trends compare, sets v points, greyed-out groups, sharing.
- **How it works: Why you only enter two shots a point.** What the data can and can't tell you.
- **How it works: How the coach's summary is written.** Public, even though the summary is by invitation. Includes tactical and technical advice (examples, and why unforced errors only get technical advice); the glossary holds the two definitions.
- **Common questions** on the contents page, including: who served and how the app knows (only the first server is picked; a wrong one skews the serve and receive figures), and exporting a PDF (it prints whichever tab is open).

Dropped: a separate PDF export page and a separate tactical and technical page. The admin pages get no help.

## Player history (shipped)

Designed with the user on 2026-11-26 on this canvas: https://claude.ai/artifact/JpbbeN917uCogDkWvT69Gp. The user's one change was to lead the Opponents tab with sets rather than points, because sets win matches, and to show the gap between the two: a player who wins points but loses sets is losing them at the end, through a stroke under pressure or nerves.

- **Where:** `src/pages/PlayerHistory.tsx`, `src/components/history/` (Overview, Shots, Opponents), `src/styles/components/PlayerHistory.css`, and `buildHistory` in `src/lib/history.ts` (21 tests). Reached from a History button on each player card with matches, and an "All of X's matches" link on the analysis page's Match details card (owner only).
- **Filters:** 3, 6 or 12 months or all (the default), finished matches only (on by default), and event.
- **Overview:** totals, What stands out (at most three), seven trend charts (sets, points, serve, receive, close finishes, unforced errors per 10 points, attacked first), and the match list.
- **Sharing:** `players.share_token`, Share and Stop sharing in a dialog. The link shows the same tabs read-only, and each match opens under it with its coach's summary if it has one. The player's notes and summary notes are never readable through it.
- **Decided while building:** sharing uses RLS policies keyed on the player's token, not a single JSON function as first planned, so the shared view loads through the same queries as the owner's and can't leak a column the owner's view doesn't. PDF export of the history was left out.
- **Checked:** RLS over REST on the local stack. The token reads only that player's matches, sets, points and summaries; summary notes and players are refused; a wrong or malformed token reads nothing; another signed-in user can't set a player's token or see their matches; Stop sharing kills the link. In headless Chromium at 1440px and 390px with six temporary copies of the local Sam Carter matches (deleted afterwards): every tab, the share dialog, the shared history and a shared match, with no sideways scrolling. The trend comparisons and What stands out haven't been seen on real data with 6 or more matches.
- **Production:** shipped in `5188481` on 2026-11-26. Checked after the migration: the four policies exist, no player is shared yet, and an anonymous request with a made-up token reads no matches and no player. Production has 7 matches, so most charts say "Too few matches to compare yet".
- **Still to do:** the user to check it on production, including sharing a history and opening the link signed out. Look at What stands out again once a player has 6 or more matches with unforced errors confirmed.

## 0. Players, styles of play and notes (shipped)

Designed with the user on 2026-11-25 on this canvas: https://claude.ai/artifact/GKWsSyv6txbLJ6aQs5p2vY. Built the same day. Shipped on 2026-11-26: migration applied to production, `match-summary` deployed, pushed to `main`.

- **Players** (`/players`, `src/pages/Players.tsx`): the owner and the people whose matches they enter. Each has a style, hand, rubbers and free-text notes (owner only, 1,000 characters). Saving yourself also saves `display_name`. Renaming a player renames their matches (`players_sync_name` trigger), because share links read `matches.player_name` and can't read players.
- **Styles** (`/admin/styles`, `src/pages/AdminStyles.tsx`): the coach's ten styles (see *Style notes* below). Each has "playing as" and "against" tactical notes. Hands and rubbers (`kit_notes`) carry "against" notes for left-handed, short, medium and long pips, and anti. Match-ups run one way (player's style, then opponent's). Admins see how many matches use each style through the `style_usage()` function.
- **Matches**: `player_id` plus both sides' style, hand and rubbers, copied when the match is created so later changes to a player don't rewrite old matches. The new match form picks a player or adds one ("Someone new"). It fills in the opponent from the last match against the same name, ignoring case. The points editor edits both sides. A trigger rejects a `player_id` that isn't the owner's.
- **Migration** `20261127120000_players_and_styles.sql` creates a self player for every account with matches or a saved name (named from `display_name`, or "Me"), a player for every other distinct `player_name`, and links every match. On the local stack every match was linked.
- **Analysis page**: the analysis tab has a Match details card (result, date, event, format, video, both styles). The header's date line now only shows on the summary tab.
- **Coach's summary**: `buildStyleSection` (`src/lib/styles.ts`) adds a section after the shot guide with both styles and their notes, the opponent's hand and rubber notes, any match-up and the player's notes. When there's nothing to add the input is unchanged, so `SUMMARY_VERSION` wasn't bumped and existing summaries only show as out of date once a style or note is set. The prompt's new section says to take styles as given but never as evidence, never to work against the player's own style, to check any shot the notes name against the counts either way, and never to quote the notes or say they exist (see *Player notes in the summary's wording*). The "never name a style" rule now only applies to styles that weren't given.
- **Checked**: 155 tests, lint and build. RLS tested over REST on the local stack: anon reads styles but not players, another user can't see players, edit styles or kit notes, or point a match at someone else's player, and `style_usage()` returns nothing to non-admins. In Chrome on the local stack: players page and dialog, new match with an existing player, the opponent lookup, the points editor, the details card and the out-of-date dot, and the admin page with a match-up. Fixed on the way: the opponent lookup could overwrite a style chosen while it was loading. Not checked: phone width (Sway wouldn't resize the window), and a real summary call with styles (about $0.10).

Style notes:

- Shipped on 2026-11-26 in `20261127130000_style_notes.sql`, which replaced the six starting styles with the user's ten (Chopper became Classical defender, Blocker became Inverted push-blocker, the other three were deleted). The "playing as" notes are the user's, tidied. The "against" notes were drafted from the user's shot notes on production (pushes are about length, placement and spin variation, never height; "the crossover", not "the middle") and reviewed by the user. Hybrid styles (Attacking retriever, Attacking pips or anti crab, Modern defender) all ask whether the player can bait weak attacks or exploit weak defence. Left-handed and medium pips notes are deliberately empty: the user doesn't want made-up tactics there. No match-ups yet.
- The starting migration seeded six placeholder styles; `20261127130000_style_notes.sql` replaced them, so any fresh database ends up with the ten.

Player notes in the summary's wording, 2026-11-26:

- The first real summary with styles and notes (James Moore v Howard McCain, 2026-11-14) worked: the styles were set in the points editor, the summary used them, and the user was happy with it. But it said "You noted a tendency to get passive". The player reads the summary, never sees the notes and usually didn't write them, and coaches want to be able to write blunt development notes.
- The prompt now says never to mention that notes exist or who wrote them, and to put a note's point as a neutral, encouraging observation about the player's game, then say what the match showed ("Sometimes you can be too passive, but in this match you attacked first on 14 of 20 points"). Shipped in `6a3ee03`. `SUMMARY_VERSION` wasn't bumped, so existing summaries don't show as out of date.
- James's stored summary wasn't rewritten. At the user's request that one sentence was edited by hand in `match_summaries.summary` on production (problems[0].detail now reads "You can sometimes be too passive, but in this match you attacked first..."). A search of the rest of the summary found no other mention of the notes. Editing the stored JSON doesn't change the input hash, so the summary isn't marked out of date.

The "You" bug, found on 2026-11-26:

- The old new match form had "This is me. Fill it in on new matches." ticked by default, so entering a friend's match on an account with no saved name saved the friend's name as `display_name`. The players migration trusted `display_name`, so the user's account (dunc@seriouslyfish.com) got James Moore as its self player, with two old blank-name matches (Lee Dorning 2025-02-09, Pit 2025-05-25) linked to him.
- Fixed by hand on production: James Moore is no longer self, the existing Duncan Wraight player is, those two matches moved to Duncan Wraight with `player_name` set, and `display_name` is now Duncan Wraight. Checked by reading it back.
- The new form had copied the same default; `ae30fd2` leaves the box unticked.
- Every other account was checked on production on 2026-11-26. None has matches or a friend as its self player. Three have a "Me" self player and no matches, left by the migration from test matches deleted the same day. If it happens again, an owner can fix it themselves: open their own player on `/players`, tick "This is me" and save. That calls `set_self_player`, which makes the old self player an ordinary one (keeping the matches entered under their name), moves matches with no player name to the new self player, and saves the name as `display_name`.

Still to do:

- Watching the next summaries for any mention of player notes is parked until 2027-01-01 (section 2).

## 1. Signed-out homepage brochure and wording sweep (done)

Built and shipped on 2026-11-25 from this design canvas: https://claude.ai/artifact/QEw5JW86rf8BMaRDQSm79J. The user approved the design and the final copy on the canvas before it was built.

- **Where:** `src/pages/HomeBrochure.tsx` and `src/styles/home.css`. `Home.tsx` shows it to signed-out visitors.
- **Screenshots:** WebP files in `src/assets/home/` (since 2026-11-27 each large one also has an 800px `-800.webp` copy for phones, made with `magick <name>.webp -resize 800x -quality 80 <name>-800.webp`), taken from the real app with a sample match: a copy of a real local match with made-up names (Sam Carter v Alex Morgan, "Club league, division 2"). The copy quotes its numbers, so new screenshots mean checking the copy too. The sample matches exist only on the local stack, under `summary-test@example.test`.
- **Copy:** the first draft read as machine-written. It was rewritten from a brief built on research into UK sports product sites, one agent per section, then edited with the user. The brief and research are not in the repo; the lessons are: name real shots, sets and scores from the sample match, say plainly that only two shots a point are entered, and don't tell people how to film beyond "any phone will do". Playback at 1.25x or 1.5x is the user's own tip. The headline is "Your backhand loop won 5 and lost 12." Both sign-up buttons say "Create an account".
- **Facts:** constants at the top of `HomeBrochure.tsx`, answered by the user on 2026-11-25. Entry time: a match filmed uncut runs about 20 minutes, around 15 to enter at 1.5x, and a trimmed match often half that. The coach's summary is "By invitation". It's free with no payment to set up. There's no contact link (`CONTACT` stays `null`, so that line stays hidden).
- **Sign-up:** "Create an account" links to `/auth?mode=signup`, which opens the sign-up form.
- **Link previews:** `index.html` has a title, description and Open Graph tags. `public/og-image.png` is a 1200x630 shot of the hero, with the nav links, buttons and hero note hidden and the sample-match caption pinned bottom right. It was regenerated on 2026-11-25 for the new domain, and on 2026-11-28 for the new eyebrow, by loading the built homepage at 1200x630 in headless Chromium (Playwright), adding CSS that hides `.bro-nav-links`, `.bro-nav .bro-btn`, `.bro-actions` and `.bro-hero-note`, sets `.bro-hero` to `min-height: 630px` and pins `.bro-caption` with `position: fixed; right: 40px; bottom: 16px`, then taking a screenshot. Regenerate it whenever the hero's words change.
- **Signed-in users** go straight from `/` to `/matches`. The old signed-in home was removed.
- **Prerendering:** `npm run build` also builds `src/prerender.tsx` for SSR and runs `scripts/prerender.mjs`, which writes the brochure's HTML into `dist/index.html`. That file is only served for `/`. `dist/app.html` is the same page with an empty root, and `vercel.json` rewrites every other route to it, except `/assets/`, so no other page flashes the brochure. An inline script in the head hides the prerendered brochure from browsers holding a session (`html.has-session`), and `main.tsx` removes the class before React renders. `Home` keeps the brochure on screen while auth loads unless a session is stored (`src/lib/storedSession.ts`). React replaces the prerendered HTML rather than hydrating it.
- **Checked:** at 1440px and 390px wide, with no sideways scroll and no console errors, and on production after the deploy.
- **Wording sweep:** you **film** a match and **enter** its points. "Record" and "log" were removed from everything a user reads: the tracker, match list, new match form, analysis page, coach's summary, signed-in home and admin shots page. "Other shot" became "losing shot", the admin page's "AI coach" became "the coach's summary", and "log in/out" became "sign in/out". The rule is in CLAUDE.md. Code and database names (`recordPoint`, `unforced.recorded`, `other_shot_id`) and the AI prompt were left alone.

Still open: a contact link, if one is wanted.

## 2. AI coach's summary

First shipped on 2026-11-24 in `c8c989c`, `56b9c09`, `44e0cbb` and `d2c03d7`, and extended most days since (see *Changes since launch*). CLAUDE.md has the short version. This section has the decisions and the things worth knowing before changing it.

How it works:

- **Access.** `profiles.ai_summaries_enabled` is off for everyone. Admins switch it on per user from `/admin`, which also shows this month's spend against the budget, per user and in total.
- **The function.** `supabase/functions/match-summary` checks the flag and that the caller owns the match. It loads the match as the caller, so RLS applies, and rebuilds the analysis with `buildAnalysis`. Then it sends the analysis, every point, the shot guide and any styles and player notes to `claude-opus-5-5` (effort `medium`, `max_tokens` 16000, structured output). The service role is only used for the flag, the budget, and writing the summary and usage rows.
- **Shared code.** `src/lib/aiSummary.ts` (input builder, hash, cost sum, output schema, `enforceKinds`, validator), `src/lib/shotGuide.ts` (the quality list, what each means to the model, the tactical and technical definitions and `RECEIVE_GUIDANCE`) and `src/lib/styles.ts` (`buildStyleSection`) are used by both the page and the function. That's why `src/lib` imports carry `.ts` extensions. The prompt is `supabase/functions/match-summary/prompt.ts`.
- **Storage.** `match_summaries` holds the latest summary per match, readable by the owner and by share-token requests. `match_summary_notes` holds the owner's correction notes, owner-only, so a share link never shows them. `ai_usage` logs every call's tokens and cost, and is kept when a match is deleted. `ai_settings` holds the monthly budget, $20.
- **Out of date.** The input is hashed together with the model and `SUMMARY_VERSION`, now 8. The page computes the same hash, and shows the owner an "Update the summary" banner and a dot on the tab when they differ. Share links never see either, and the banner is left out of PDF exports (`data-html2canvas-ignore`). Bump `SUMMARY_VERSION` after a prompt change that should prompt everyone to regenerate. Editing a used shot's guide, or setting a style or player note, also changes the hash for the matches it touches. Anything the function loads that feeds the input (as `shots.role` and the sweep columns do) must be loaded by the page too, or the two hashes never match.
- **Problems.** Three or four, each with a `kind` (`shot`, `unforced`, `receive`, `serve`, `situation`) and separate `tactical` and `technical` advice, shown as the "Tactical" and "Technical" panels. The kind decides the advice: unforced errors get technical advice only and are never put down to misreading spin, receive problems always use `RECEIVE_GUIDANCE` rather than the receiving stroke's notes, and a situation gets no technical advice. `enforceKinds` applies those rules before validation. The validator accepts either part empty, but not both.
- **Shot guide.** Each shot has `check_qualities` (tickboxes on `/admin/shots`, labelled tactical) and free-text `technical_notes`. The Serve notes are for serving only. The input lists the guide for shots used in the match.
- **Notes.** "Correct this summary" sends the owner's notes with the previous summary. Corrections of fact are treated as true. Saved notes are reapplied on every rewrite.
- **The tab.** The summary lives at `/matches/:id/summary` and `/shared/:token/summary` (`src/components/analysis/CoachSummary.tsx`). Share links only show the tab when a summary exists. PDF export prints whichever tab is open.

Cost and limits:

- A summary costs about $0.10 to $0.13 on Opus 5.5: roughly 10,000 to 14,000 input tokens and 2,800 to 3,900 output tokens, including thinking. The match with sweep tags, styles and a player note (James Moore v Howard McCain) came to 13,735 in and 3,247 out, $0.12. Regenerating an unchanged summary costs nothing, because the stored one is returned. By 2026-11-26 there had been 18 calls in all, $1.71 of them this month.
- The function refuses new calls once this month's logged spend reaches `ai_settings.monthly_budget_usd`. The hard stop is the spend limit on the "TT Analysis" workspace in the Claude Console, which the user set to $20 a month. Keep the two in step.
- The Anthropic API key is the `ANTHROPIC_API_KEY` function secret, set on production and in `supabase/functions/.env` locally (gitignored). It's named TTAnalysisSummaries, lives in the TT Analysis workspace and **expires on 1 December 2027**. Summaries stop working on that date unless it's renewed.
- Fields over 140 words (`MAX_FIELD_WORDS`) are rejected, because an early run degenerated into a list of fragments. The prompt asks for under 60 words a field and under 550 for the whole summary.

Decisions worth keeping:

- Only the counts are stated as fact. The prompt never lets the model guess causes the data can't show (placement, spin, which serve, timeouts). It names what to check on the video instead, and leaves "tactical or technical" to the player.
- **Tactical** is something a player can change during a match (placement, variation, shot choice). **Technical** is something in the stroke or in reading spin that they work on in practice. The definitions are `TACTICAL_DEFINITION` and `TECHNICAL_DEFINITION` in `shotGuide.ts`, used on `/admin/shots`, in the summary's "Work on" panel and in the prompt.
- Advice on a shot only uses the qualities ticked for it. An A/B test on two matches showed the shot guide made the advice clearly more specific.
- Nerves are only mentioned when `unforced.bunchedLate` is true: 3 or more unforced errors from 8-all, at least twice as often per point as in the rest of the match. The note suggests committing to the shot.
- Shot balance is supporting evidence, not a section. It only comes up when something is in `standouts`, or a role was won or lost 2 to 1 on 10+ shots, gets a problem of its own at most once, and only reaches the headline when a role standout decided the match. If the attack itself loses, the advice is never to attack more. A style that wasn't given is described in counts, never named.
- Who attacked first, when the sweep tags are there, is used over shot balance. Unconfirmed tags count as "in the points you marked", and unclear points are never the opponent's.
- Styles are taken as given but never as evidence, and the advice never works against the player's own style. Player notes only shape what to check, and the summary never mentions that notes exist or who wrote them: a note comes through as a neutral observation, followed by what the match showed.
- No server-side fallback to another model on refusal. A refusal is very unlikely on table tennis data, and a fallback would complicate the cost tracking.
- It uses the API, not a Claude subscription. A subscription can't power a server function used by other people.

Changes since launch, newest first (`SUMMARY_VERSION` in brackets where it was bumped):

- 2026-11-26: player notes kept out of the wording, `6a3ee03` (section 0).
- 2026-11-26: styles of play, hand, rubbers and player notes, `7cb22be` (section 0).
- 2026-11-25: attacked straight away and attacked first split by server, `2c2a2ab` (8); sweeps with attacked first, `65587b3` (7) (section 7, *Sweeps*).
- 2026-11-25: serve and receive, close finishes from 8-all, problem kinds, `RECEIVE_GUIDANCE` and the eval script, `dfa8788` (6). The details are in `docs/ANALYSIS_REVIEW.md`.
- 2026-11-25: shot balance in the input, `76c4035` (5). Tested on the two local sample matches first: the first run put role counts in the headline of a match with no role standout, which is why the headline rule exists.
- 2026-11-25: unforced errors get technical advice only, and the mental-side checks for late unforced errors (4).
- 2026-11-25: tactical and technical named and defined, `b644843`.

Checked on production: four matches have a summary. The James Moore v Howard McCain summary (2026-11-14, regenerated 2026-11-26 on version 8) used the sweep tags (45 attacked first, 33 attacked straight away, both confirmed), styles and a player note, and the user was happy with it apart from the mention of the note, which was edited by hand (section 0). No summary has been written with player notes since the fix.

Closed on 2026-11-26: the shots without technical notes (serve, sideswipe, pips block, pips chop block, lob), the empty left-handed and medium pips notes, and the missing match-ups. The user has nothing to write for them. The summary already handles each one being empty, so leave them unless the user adds notes.

Parked until 2027-01-01 (the user has no new matches to review before then):

- **Watch the next summary written with player notes** for any mention of the notes ("you noted", "your coach says"). The fix in `6a3ee03` hasn't met a real match yet: the only summary since (Lee Tinkler, 2025-09-16) is for a player with no notes. A quick check of every stored summary: `supabase db query --remote --read-only "select match_id from match_summaries where summary::text ilike any (array['%you noted%', '%your coach%', '%your notes%'])"`.
- **A match where the styles clearly differ.** Shot balance's role standouts haven't been seen in a real summary, because no production or local match has one.
- **The eval checks rules, not counts.** `scripts/summary-eval.ts` checks rules by pattern, not whether a claim like "won 5, lost 12" matches the analysis. Revisit with the new matches, or sooner if a wrong count turns up.

Still open:

- **Learning across matches.** The summary only sees one match, plus whatever the user writes in a player's notes. Drafting or suggesting player notes from past matches would need a design: what counts as a pattern across matches, and whether the user approves each note before it's used.
- **Sonnet 5.5** for about half the cost, if quality holds on a side-by-side. The eval script can run both on the production matches for about $1.50.

## 3. Deploying and testing the Edge Function

- **Deploy** with `supabase functions deploy match-summary --use-api --yes`. Docker bundling fails on this machine with "Permission denied (os error 13)" because of SELinux. `--use-api` bundles on Supabase's side and picks up the `src/lib` imports.
- **Serve locally** with `supabase functions serve --env-file supabase/functions/.env`. It needs the source labelled for containers first: `chcon -R -t container_file_t supabase/functions src/lib src/types`. New files need the label again; `restorecon -R` on those folders undoes it.
- **A test call costs real money**, about $0.10. To test without the app, sign in a local test user through the REST API and POST `{ "matchId": ... }` to `http://127.0.0.1:54321/functions/v1/match-summary` with their token.
- **Testing a prompt without serving the function:** a throwaway script run with `npx vite-node` can load a local match with the service role key, build the input with `buildAnalysis` and `buildSummaryInput`, and POST it to the Messages API with `SYSTEM_PROMPT`, `SUMMARY_SCHEMA` and the function's settings (`max_tokens` 16000, effort `medium`), using `ANTHROPIC_API_KEY` from `supabase/functions/.env`. That bills the TT Analysis workspace. This is how the shot balance prompt was tested.
- **Testing a prompt outside the app:** the `ant` CLI has a `dev` profile (`ant auth login --profile dev`) whose token can call the Messages API (`ant auth print-credentials --access-token --profile dev`, plus the `anthropic-beta: oauth-2025-04-20` header). It bills the Wraight Consulting API account's Default workspace, not the user's Claude subscription. The `admin` profile can't call models.

## 4. Site-wide redesign (done)

Shipped in `ad8a04f`.

- **Shared styles.** `src/index.css` holds the tokens and shared pieces: `.card`, `.btn` (plain white; `.primary` is ink, `.danger`, `.quiet`, `.small`), `.field`/`.fields`, `.segmented`, `.check` (a checkbox row, so don't use it as a general class name), `.data-table` (wide tables go in a `.table-card`, which scrolls sideways and is `position: relative` so `sr-only` headings stay inside it), `.chip`, `.notice`, `.notice-with-action` (a notice with its button below it, never inside), `.state` for loading/empty/error, `.page`/`.page-head`. `MatchAnalysis.css` holds the analysis page and the coach's summary. `src/styles/pages.css` has small bits for home, auth, match list and admin.
- **Header.** White bar with the brand and nav. On `/admin` pages it turns dark purple with an "Admin" tag and its own nav.
- **Tracker.** Split into `components/tracker/` (`Scoreboard`, `ShotPicker`, `MatchComplete`). Each side of the score is the "who won" button. Category tabs wrap, and each picker remembers its own last category. On a phone the scoreboard shrinks while a point is being recorded. Undo and End Set sit at the top and are disabled mid-point.
- **No browser popups (2026-11-26).** Nothing calls `alert()` or `confirm()` any more. Errors show as an inline `ErrorNotice` (`src/components/ui/ErrorNotice.tsx`, a `.notice.error` with a Dismiss button): the tracker shows its save, undo and End Set errors above the scoreboard, and on the match complete screen. Confirmations use `useConfirm` (`src/components/ui/useConfirm.tsx`): `await confirm({ title, message, confirmLabel, danger })` returns true or false, and the page renders the hook's `dialog`. It focuses Cancel, closes on Escape or a backdrop click, and opens above other dialogs. Used for deleting matches, players, shots, categories, styles and match-ups.
- **Match score repair (2026-11-26).** The match list reads `matches.match_score` and `is_complete`, while the tracker works the result out from the sets. They could fall out of step if the match update failed at the end of a set, which used to be logged and ignored. Now the tracker says so, and repairs both fields whenever it loads a match whose stored values disagree with its sets. Found on a local test match (a copy made by a script) that showed "Not started" on the list while the tracker said it was over. On production every match's score agreed with its sets, but three old best-of-5 matches that had reached 3 sets (1-3 on 2025-02-09, 3-2 on 2025-05-25, 0-3 on 2025-09-16) were never marked complete. They were set complete by hand on 2026-11-26. The other seven were unfinished. Six of them were test matches (Zafar, Duncan, Test, Tedt and two with HTML in the opponent's name, 3 points between them) and were deleted the same day, leaving 7 matches and 485 points. Tomas Jacko (2025-10-05, 21 points, 0-1 in sets) is the one real unfinished match left.
The 0-3 match against Lee Tinkler (2025-09-16) was the user's own, entered on a second account (dunc+ttanalysis@seriouslyfish.com). At the user's request it was moved to dunc@seriouslyfish.com and linked to the Duncan Wraight player the same day. The Tomas Jacko match was moved the same way, and the second account (by then owning nothing) was deleted. All 7 production matches are now on dunc@seriouslyfish.com. Nobody checked who owned the six test matches before they were deleted; they were most likely the user's own tests.
- **Unforced errors.** One definition, `UNFORCED_ERROR_DEFINITION` in `analysis.ts`, used on the analysis page, the home page, the points editor and the tracker toggle's tooltip.

- **Keyboard shortcuts (2026-11-26).** On screens wider than 768px: 1 or 2 for who won and Z to undo, then left and right arrows for the shot category, a shot's number then F or B for the hand, U and L for unforced and lucky, Backspace to change the winning shot and Escape to cancel the point. Only the picker waiting for a shot listens. The keys are shown under the prompt and in the point entry. Checked in Chrome on a local match.

- **Aesthetic sweep (2026-11-26).** The user reported a cramped reset notice and misaligned buttons on the match list. Every page was then screenshotted at 1440px and 390px wide against the local stack (headless Chromium driven by `playwright-core` from a scratch directory, signed in as `summary-test@example.test`), and the problems of that kind were fixed in `059a531`:
  - A notice followed by a button now sits in `.notice-with-action` (`index.css`), with the button below the notice rather than inside it. Used on the reset-link-sent message, and on the reset page's success and expired-link states.
  - Match cards put the main actions on one row and "Edit points and sweeps" with Delete on the next, so every card's buttons line up.
  - Five pages (points editor, all three admin pages) scrolled sideways on a phone. The cause was the `sr-only` "Actions" headings: they're absolutely positioned, so they escaped the table's scroll box. `.table-card` is now `position: relative`.
  - The points editor's Sweeps list uses one grid (subgrid rows), so the status column lines up whatever buttons a row has. On a phone the main button comes first.
  - Admin: the user table's buttons have one width so the rows line up, the extra gap above the table is gone and dates don't wrap. The styles table's headers don't wrap and its descriptions keep 240px on a phone. The admin header drops its "Admin" tag on a phone and nav links never wrap, so "Back to app" fits on one line.
  - Smaller: room under the tactical and technical definitions in the coach's summary, a wider point list on the sweep page so shots aren't cut off, and "No style set yet" shown the same way on every player card.
  - Left alone: the tracker is wider than the header on desktop, which is deliberate (`.app-main.wide`, for courtside use). Hyphens in Inter look widely spaced in headless Chromium screenshots, which is down to the font rendering there, not the text.

- **No service fault as a losing shot (2026-11-26).** The losing shot picker used to offer "Service fault", which can't happen: a service fault is only ever the receiver's winning shot. `ShotPicker` now takes a `losing` prop, used by the tracker and the points editor, and `checkPointEdits` refuses an edited point with a service fault as its losing shot. In `ff29493`. Production was checked the same day and has no points with a service fault as the losing shot.

## 5. Tests for the scoring rules (done)

`npm test` runs Vitest: 155 tests across `scoring.test.ts`, `analysis.test.ts`, `aiSummary.test.ts`, `matchDetails.test.ts`, `styles.test.ts` and `sweeps.test.ts` in `src/lib`. `src/lib/scoring.test.ts` covers every function in `src/lib/scoring.ts`, including `buildMatchState`, the reload logic.

Decided while writing the tests:

- A match stops as soon as a side has the sets it needs. Dead sets are not played out.
- Undo straight after End Set reverses the End Set and keeps the set's points. The next Undo removes the last point. `lastActionWasEndSet` decides which, and the button reads "Undo End Set" when that's what it will do.

## 6. Security audit (done)

Audited 2026-11-24. Every attack was reproduced against a local stack over the REST API, fixed, and retested.

Fixed in migration `20261124140000_security_hardening.sql`:

- **Self-promotion to admin.** Any signed-in user could set `is_admin = true` on their own profile with one PATCH. Users can now only read their own profile. Admins can read every profile and change `is_admin` and `ai_summaries_enabled`. No other profile column is writable through the API.
- **Points in another user's set.** A point's set must now belong to the point's match, on insert and update.
- **Function grants.** `anon` can no longer execute `is_admin` or `handle_new_user`.
- **TRUNCATE** revoked from `anon` and `authenticated`, since it ignores RLS.

The AI tables were checked the same way on a local stack: a share link reads the summary but not the notes; another user reads nothing and can't switch AI on for themselves; only admins read spend or change the budget; nobody can write summaries or usage through the API.

Fixed in the frontend: `/debug` deleted; admin pages no longer bounce an admin on a direct load; `npm audit fix` and `html2pdf.js` 0.14; `promote-admin.js` reads `SUPABASE_SERVICE_ROLE_KEY`.

Follow-up on 2026-11-26 (nothing is left open in this section):

- **Supabase dashboard (done by the user 2026-11-26):** minimum password length set to 8, leaked password protection on, email OTP expiry under an hour, and Postgres upgraded from 15.8.1.091 to 17.12. The project also moved from the Nano to the Micro compute size (a free upgrade). Checked after the upgrade: auth is healthy, the database linter is clean, shots read anonymously, matches don't, and production had 13 matches, 488 points and 3 summaries (7 matches and 485 points after the test matches were deleted later that day).
- **Minimum password length (done 2026-11-26):** the sign-up and reset forms now ask for 8 characters (`MIN_PASSWORD_LENGTH` in `src/lib/password.ts`, shown as a hint under the field), and `config.toml` matches. Existing passwords still work: Supabase only checks the length when a password is set. The dashboard now says 8 as well, so the API enforces it too.
- **React Router (done 2026-11-26):** upgraded to v7 (`react-router` 7.18, replacing `react-router-dom`). `npm audit` reports nothing. Every link is absolute and the only splat route is the catch-all, so v7's changes to relative paths don't apply.
- **Logout on every deploy (removed 2026-11-26):** `src/lib/supabase.ts` used to clear the stored session whenever the deployed commit changed, which signed everyone out on each push. It wasn't needed for security and was taken out at the user's go-ahead; the leftover `app_version` key is removed on load.

## 7. Analysis page, unforced errors and points editor (done)

Designed with the user on this canvas: https://claude.ai/artifact/3J5Lt6syww186XcB9mHg6i

How the data works:

- Each point records two shots: the winner's **winning shot** and the loser's **losing shot**. The losing shot is either the one that set up the winner or the one that missed. Rally shots aren't recorded, so the page never talks about shots "played".
- `src/lib/analysis.ts` builds the whole page from the raw match, sets, points and shots, and `src/lib/analysis.test.ts` covers it. The old SQL analysis views were dropped on 2026-11-26.
- A service fault is recorded as the receiver's winning shot with `no_shot` for the server. The analysis charges it to the server as an unforced losing shot.
- Who served each point is worked out from the scoring rules (`getServer`), not stored.

Related features:

- **Unforced errors:** `points.is_unforced_error`, ticked in the tracker or in the points editor.
- **Points editor:** `/matches/:id/points`. Tick lucky and unforced point by point, and edit the match details.
- **Matches for friends:** `player_name`, `event` and `video_url` on `matches`. The user's own name lives in auth user metadata (`display_name`), because `profiles` is locked to admins. The analysis page always says "you" to the player being reviewed.

Editing a point's winner and shots (2026-11-26):

- Each row in the points editor has an Edit button that opens `PointEditDialog`: who won, both shots (the tracker's `ShotPicker`, opening on the point's own shots), lucky and unforced. Changing the winner clears the shots and the unforced tick, like the tracker. Picking a service fault fills in no shot and ticks unforced.
- `checkPointEdits` (`src/lib/pointEdits.ts`, 12 tests) replays the match with the edits. It refuses a set that would finish before its last point, a finished set that would no longer be finished, end level, or go to the other player, a match decided before its last set, a serve or service fault that doesn't belong to whoever served, and a service fault as an edited point's losing shot. Serve checks only run on edited points and points whose server moved, so an odd old point can't block an edit.
- Changing one winner in a set that reached 11 never adds up on its own: the set would end a point early or not at all. So the dialog offers "Keep and edit another point", the change is held as pending (highlighted in the table, which shows the scores as if it were saved), and the ticks are locked until the pending changes are saved or discarded. The usual fix is two points entered the wrong way round.
- Saving goes through `edit_points` (migration `20261128130000_edit_points.sql`), which writes the points, the set scores and `matches.match_score`/`is_complete` in one transaction. It runs as the caller and checks every point and set belongs to the match. Editing a point that no longer goes past the receive clears its "attacked straight away" tick. Coach's summaries for an edited match show as out of date.
- A winner change in the set still being entered can finish that set, or the match. Changing who won a set is refused.

### Shot balance (done)

Designed with the user on 2026-11-25 on this canvas: https://claude.ai/artifact/FrhvxN3b9vbEQGZ8hounA2

- **Roles.** `shots.role` is `attack`, `control` (keeping the ball in play at the table: push, block, bump), `defence` (with backspin or from distance: chop, chop block, fish, lob; chop block moved from control on 2026-11-25 by `20261125150000_chop_block_defence.sql`) or null (serve, no shot, service fault), set by migration `20261125120000_shot_roles.sql` by shot name and edited on `/admin/shots`. Pips shots take the same role as the inverted ones. Three roles, not two, so a chopper and a pusher look different.
- **The section** (`src/components/analysis/ShotBalance.tsx`, built by `buildBalance` in `analysis.ts`) replaced Categories. Each side's winning and losing shots by role, "What stands out", and a by-shot chart with you on the left and the opponent on the right. Pips shots stay separate rows. The comparison is always the opponent in the same match.
- **What stands out**, at most three, in this order: a role share 20 points or more apart (both sides with 10+ shots); a shot and hand the opponent had 5+ times that you never had; a shot one side had 1.5x as often with 10+; a shot you had 5+ times that they never had.
- **Cards.** "They/You did more attacking" now counts attack-role shots, falling back to "did more defending". "No backhand blocks" (or whichever shot) appears for the biggest shot you never had. "Attacking dropped off" (`attacksBySet`) counts attack-role shots too, so a pips attack filed under another category counts.
- **In the coach's summary** since 2026-11-25 (section 2). `categories` is gone from the analysis.
### Sweeps, attacked first and attacked straight away (done)

Designed with the user on 2026-11-26 on this canvas: https://claude.ai/artifact/5LK1fv2xobgWtKuLGWRpT9

- **The idea.** Entering two shots a point is already hard work, so other tags get their own pass afterwards: one question per point, Yes or Next. Next means no. The user found that quicker and more accurate than tagging everything while entering. Saving video timestamps was considered and dropped: too slow to enter, and jumping around YouTube is finicky.
- **Tags.** Unforced errors (points the player lost, not service faults), attacked first (every point except third-ball attacks), third-ball attack (the player's serves that went past the receive) and lucky shots. Definitions and scopes are in `src/lib/sweeps.ts`. Any attack-role shot counts as an attack, including a flick on the receive.
- **Attacked first is one tickbox for the player.** Unticked with an attack-role shot in the last two means the opponent attacked first, which is exact if the ticks are right. Unticked with no attack is "unclear" (nobody attacked, or the opponent attacked mid-rally), shown as its own row and never counted as the opponent's.
- **Unticked isn't "no" until confirmed.** A tag counts once it has a tick or is in `matches.confirmed_tags`. Finishing a sweep confirms it, and so does "That's all of them" on the points editor or on the owner's analysis-page warning. The migration confirmed unforced errors on every match with at least one of the player's own ticked, so old matches don't all ask. Lucky shots never ask.
- **The sweep page** (`PointSweep`, `/matches/:id/sweep/:tag`): score before the point (what the video shows when the rally starts), the two shots, a list of the set's points to stay in step with the video, keys Y, N or Space and Backspace. Each answer writes the point only when it changes, plus the position in `sweep_progress`, queued so the last answer is the last write. On a phone the instructions fold away and the buttons stick to the bottom.
- **Analysis page.** A "Who attacked first" section before Shot balance, "Attacking after your serve" under Serve and receive, and a "Getting in first paid off" card (5+ points each way and a 25-point gap in win rate).
- **Coach's summary.** The input now carries `attackFirst`, `thirdBall`, `unforced.confirmed` and "attacked first" and "third ball" point flags. The prompt has a "Who attacked first" section: use it over shot balance when present, treat unconfirmed counts as "in the points you marked", and never count unclear points as the opponent's. First used on James Moore v Howard McCain on 2026-11-26 (section 2).
- **Checked** locally in Chrome on the Sam Carter sample match: a sweep by keyboard, Back, finishing, the end screen, the warning and its button, both new sections, and the sweep at 390px wide. The local test user's password was set to `sweep-test-2026` for this.

Shipped in `65587b3`, with the changes below in `75b15bd` and `2c2a2ab`. A coach's summary with these tags was written on production on 2026-11-26 (section 2).

Changed on 2026-11-26, after the first real use: attacked first is split by who served, and the third-ball sweep became **attacked straight away** (`early_attack`, `points.is_early_attack`, migration `20261126120000_early_attack.sql`). It covers points past the receive on either serve: on the player's serve it's a third-ball attack, on the opponent's it's attacking the serve, and the Yes button says which. Receives that won or lost the point count from the entered shots without a tick, in both `earlyAttack.onReceive` and attacked first. The migration kept the 7 third-ball ticks on production, dropped `third_ball` from `confirmed_tags` (it never covered their serves) and cleared the one unfinished third-ball position. `SUMMARY_VERSION` went to 8. Also fixed: moving from one sweep's end screen to the next kept the old sweep's state (`75b15bd`). A UX pass the same day: the `/admin/shots` edit dialog is now wide, in sections (the shot, role, then Tactical and Technical side by side) with short explanations and Save always in view, and the shot tables share column widths; the analysis page's new bars match the stage bars, and the 8-all figures say so when no set reached 8-all.

Small fixes on 2026-11-26 (nothing is left open on sweeps):

- Every "Edit points" link (analysis page footer, match list, end-of-match screen) now reads "Edit points and sweeps", so it's clear where the sweeps live.
- Shot balance leaves a role out of both cards when neither side had a shot in it, so there's no "Defence 0 (0%)" row. The by-shot table already did this.
- The opponent's third-ball attacks won't be tagged. The user decided against it. Their receive attacks on the player's serve still show from the entered shots when the receive decided the point.

## 8. Code quality (done)

Cleared on 2026-11-26. Nothing is left open in this section. `tsc` only checks `src`, so `scripts/summary-eval.ts` is typed but only lint checks it.


- **`any` types (done 2026-11-26):** the last ones (the eval script and `User.preferences`) are typed, and `@typescript-eslint/no-explicit-any` is back on.
- **Supabase CLI v4 warnings (done 2026-11-26):** `config.toml` uses `auth.email.enabled` and `auth.sms.enabled`, so `supabase status` no longer warns.
- **Bundle size (done 2026-11-26):** every page except Home and Auth is loaded with `React.lazy` (`src/App.tsx`), which took the main chunk from 601 kB to 444 kB. Help joined them in the main bundle on 2026-11-27 (455 kB), so prerendered help pages aren't swapped for a loading state. PDF export imports html2pdf's source (`html2pdf.js/src/index.js`) rather than its prebuilt bundle, and `vite.config.ts` puts jspdf and html2canvas in chunks of their own: about 600 kB on the click instead of 985 kB, and no chunk over 500 kB. Vite's preload helper has its own chunk, because otherwise Rollup put it in the jspdf chunk and every page loaded jspdf. Export was checked on a production build against the local stack.
- **Stale tabs after a deploy (done 2026-11-26):** with pages loaded on demand, a tab opened before a deploy asks for chunks that no longer exist. `main.tsx` reloads once on `vite:preloadError` (a timestamp in session storage stops a loop), `vercel.json` no longer rewrites `/assets/` to `app.html` so a missing chunk is a 404 rather than HTML, and `PageErrorBoundary` shows "This page didn't load" with Reload and Your matches buttons instead of a blank screen. It resets when the path changes rather than by key, so the analysis page's tabs don't remount. Tested by deleting a chunk from a preview build. Vercel's Skew Protection would also cover this, but it's a paid feature.
- **Unused SQL views (done 2026-11-26):** `point_shots`, the six views on it and `match_summary` were dropped by `20261127140000_drop_analysis_views.sql`, applied to production the same day. Nothing in the app, the function or the scripts read them.

## Testing against a local stack

`supabase start` in the repo uses the default ports, which clash with the tt-reviews project if that is running. The user doesn't use tt-reviews at the moment; it was stopped on 2026-11-24 with its data kept (`supabase stop --project-id tt-reviews`).

Run the dev server against the local stack with:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<ANON_KEY from supabase status -o json> npx vite --port 5179
```

For an isolated stack instead, copy `supabase/` to a scratch directory, change the ports in its `config.toml` (earlier sessions used 553xx and project id `TTAnalysisScoringTest`), and run `supabase start --workdir <scratch dir>`. Stop it with `supabase stop --workdir <scratch dir> --no-backup`. Never run `supabase db reset` against the linked project. Apply new migrations locally with `supabase migration up --local`.

Screenshots of every page, for a visual check: install `playwright-core` in a scratch directory (not the repo), launch it with `executablePath: '/usr/local/bin/chromium'`, sign in through `/auth` as `summary-test@example.test` (password `sweep-test-2026`, an admin with AI summaries on and the three sample matches), and screenshot each route at 1440x900 and 390x844. Full-page shots of long pages shrink too far to read, so clip them into screen-height tiles. Compare `document.documentElement.scrollWidth` with the window width on each page to catch sideways scrolling. This is how the aesthetic sweep in section 4 was done. Chrome through the extension can't do phone widths here, because Sway won't resize the window.

To check prerendered pages (the homepage and help), build against the local stack (`VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=... npm run build`) and serve `dist` with a small Node server in a scratch directory that applies `vercel.json`: serve a file if it exists, otherwise the first matching rewrite. `vite preview` doesn't apply the rewrites, so it serves the wrong file for `/help/...`. Load each route once with JavaScript off and once on, and compare the text of `main`. This is how the help pages were checked. A build without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` still prerenders, but the app fails to start in the browser and clears the page, so always build with them for a check.

Lighthouse runs from a scratch directory with `npx lighthouse@12.8.2 <url> --chrome-path=/usr/local/bin/chromium --chrome-flags="--headless=new" --output=json` (add `--preset=desktop` for desktop). Auto mode blocks launching it, so the user switches auto mode off first. Mobile scores move 2 to 4 points between runs, so run it three times before reading anything into a change.

The production shot list has been edited through the admin page, so it no longer matches the migrations. On production, `around_the_net` is `short_game`, `defence` is `defence / blocks`, and there are extra `block` shots (defence and pips) and a pips `chop_block`. Shots are publicly readable, so the production list and its guide can be read with the public anon key. Read anything else on production with `supabase db query --remote --read-only`.

## Domain and hosting

Set up on 2026-11-25.

- **Domain:** ttanalysis.app, bought by the user on Cloudflare, which is also its DNS (zone id `2c5b935257d4c1dad92fc33448ec4cdc`). Chosen over tabletennisanalysis.app because it matches the app's name and is short enough to say out loud. A domain name has no real effect on search ranking. The page text does.
- **DNS:** two A records for the apex (`216.198.79.1` and `64.29.17.1`) and a CNAME for `www` (`f69dd25ba55bb6fb.vercel-dns-017.com`), all DNS only. Turning on the Cloudflare proxy stops Vercel renewing the certificate, and a .app domain only works over HTTPS. The records were added with the "ovh VPS" Cloudflare API token in `~/Documents/vps/.cloudflare-token`, which turned out to cover this zone. That token expires on 2027-01-01.
- **Vercel:** project `tt-analysis` (`prj_gu5fUEdIHpOM3zv2OUlviHKXSuCP`) in the user's personal team (`team_0dKSydEmVRcqft35lpxBJpw8`). It has `ttanalysis.app`, `www.ttanalysis.app` (a 308 to the apex) and the original `tt-analysis.vercel.app`. Vercel issues the certificate (Let's Encrypt).
- **Old address:** `vercel.json` sends every path on `tt-analysis.vercel.app` to the same path on ttanalysis.app with a 308, so share links sent before the move still work. People signed in on the old address have to sign in once more, because sessions are stored per domain.
- **Link preview:** the Open Graph tags in `index.html` point at ttanalysis.app, and `public/og-image.png` was regenerated to show the new address (section 1).
- **Supabase auth URLs:** set by the user in the dashboard on 2026-11-25, under Authentication, then URL Configuration. The Site URL is `https://ttanalysis.app`, and the redirect URLs include `https://ttanalysis.app/**` as well as the old vercel.app entry. `supabase/config.toml` has the same values, but they aren't pushed from there. These only matter for links that leave the app and come back (password reset and sign-up confirmation emails). Email and password sign-in works on any domain without them.
- **Vercel MCP:** the Vercel plugin's MCP server is signed in and has access to the personal team. It can add domains, read deployments and logs, and check domain configuration (`get_domain_config`), so it's the first thing to reach for instead of the dashboard.

## Shipping changes

1. `npm run lint`, `npm test` and `npm run build`. Check the change is reflected in the help pages, the glossary or the common questions (CLAUDE.md, *Help pages*). A new help page also needs its rewrite in `vercel.json`, or the build fails.
2. If there is a new migration: `supabase db push --remote --dry-run` to confirm only the expected file is pending, then `supabase db push --remote --yes`.
3. If `supabase/functions/match-summary` or anything it imports from `src/lib` changed: `supabase functions deploy match-summary --use-api --yes`.
4. Commit, then push `main`. Vercel deploys from it in about 30 seconds.

Run these one after another, never in parallel. A migration must finish before the push whenever the frontend depends on new columns. On 2026-11-24 the push landed before a migration and production briefly queried columns that didn't exist yet.

Claude Code's auto mode blocks production deploys and some pushes. The user has been switching it off for those steps, and a commit followed by a separate push has worked where one combined command was blocked.
