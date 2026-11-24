# Next steps

Last updated: 2026-11-24

Handover notes for picking this work up in a fresh session. Section 1 is the next piece of work. The sections after it record what's already done and what's still open.

## Where things stand

Everything below is merged to `main`, migrated on production Supabase (project `ztozinueuucrdlfwusen`) and deployed to https://tt-analysis.vercel.app. The latest commit is `d2c03d7`.

Done on 2026-11-24, in order:

1. **Bug sweep:** analysis attribution, tracker scoring, undo across sets, End Set, best-of, shot selection rules, password reset page.
2. **Share links by token:** `matches.share_token` is a random UUID and the link is `/shared/<token>`. RLS only grants read access to requests that send the token in the `x-share-token` header (`createSharedClient` in `src/lib/supabase.ts`). Stop Sharing clears the token, which kills the link.
3. **Scoring tests** (section 5).
4. **Security audit** (section 6).
5. **Analysis page redesign, unforced errors, points editor, matches for friends, patterns** (section 7).
6. **Site-wide redesign and new tracker** (section 4), shipped in `ad8a04f`.
7. **AI coach's summary** (section 2): per-user toggle, Claude Opus 5.5 behind a Supabase Edge Function, a monthly budget, correction notes, a per-shot guide, and its own tab on the analysis page.

The user has checked the admin panel, the `/debug` removal and the AI summaries on production, and used the tracker for a real match with no bugs found. Not yet checked on production by a person: the password reset email. The reset link also needs `https://tt-analysis.vercel.app/reset-password` in the Supabase dashboard's allowed redirect URLs.

## 1. Signed-out homepage as a marketing brochure (next)

The user wants the signed-out homepage (`/`, `src/pages/Home.tsx`) to sell the app properly: what it is, how it works and why it's worth the effort of recording a match. Today it's a heading, a sign-in button and a six-step "How it works" card, which explains the process but doesn't show the product.

Approach: design it on a Design canvas with the user first, as was done for the analysis page and the summary tab, then build it.

What the page should show, as a starting point for the design conversation:

- **The product itself, not a description of it.** The strongest asset is the real analysis page. Rather than screenshots that go stale, consider rendering the real components (headline tiles, "What decided it" cards, set charts, patterns, a coach's summary) from a bundled sample match run through `buildAnalysis`. It would always match the live app and stay sharp at any width.
- **How recording works.** Film the match, go through the video, two shots per point (winning and losing), tick unforced errors. The key selling point is that you don't log every rally shot. A small working version of the tracker's shot picker could show this better than text.
- **What the analysis tells you:** where points were won and lost, patterns, how each set went, set starts and finishes, scouting the opponent.
- **The AI coach:** problems ranked by cost, "Check" and "If it's technical" advice from the shot guide, the mental side, and corrections. It's admin-enabled per account and costs real money per summary, so the copy must not promise it to every sign-up. Decide with the user how to present it (invite-only, coming soon, or a paid tier).
- **Sharing:** share links for a coach or the player, PDF export, recording matches for friends and players you coach.
- **Who it's for, and an FAQ:** how long recording takes, whether you need to record every shot (no), privacy (matches are private unless shared).

Questions to settle with the user before designing:

1. **Audience:** individual players, coaches recording their players, clubs, or all three? This decides the main message.
2. **Sample data:** the real matches belong to real people (James Moore, Howard McCain, Andrew Wilkinson). Using them publicly needs their consent. The alternative is a made-up sample match clearly labelled as an example.
3. **Real numbers for the copy:** how long it takes to record a match, and anything else a claim would rest on. Don't invent figures, testimonials or user counts. Leave a visible placeholder where a fact is missing.
4. **Sign-ups:** are they open to anyone? The page's main button depends on it.
5. **Signed-in users:** keep the current home for them, or send them straight to `/matches`?

Technical notes:

- It's a Vite single-page app, so link previews and search engines only see `index.html`. Give it a proper `<title>`, description and Open Graph image. Consider prerendering `/` if search traffic matters.
- Keep the page fast on a phone. `html2pdf.js` already loads on demand, and the marketing page should do the same with anything heavy.
- Use the existing tokens in `src/index.css`. Blue (`--you`) and orange (`--opp`) always mean player and opponent, so they can't become general accent colours on the brochure either.

## 2. AI coach's summary (done)

Built and shipped on 2026-11-24 in `c8c989c`, `56b9c09`, `44e0cbb` and `d2c03d7`. CLAUDE.md has the short version. This section has the decisions and the things worth knowing before changing it.

How it works:

- **Access.** `profiles.ai_summaries_enabled` is off for everyone. Admins switch it on per user from `/admin`, which also shows this month's spend against the budget, per user and in total.
- **The function.** `supabase/functions/match-summary` checks the flag and that the caller owns the match. It loads the match as the caller, so RLS applies, and rebuilds the analysis with `buildAnalysis`. Then it sends the analysis, every point and the shot guide to `claude-opus-5-5` (effort `medium`, structured output). The service role is only used for the flag, the budget, and writing the summary and usage rows.
- **Shared code.** `src/lib/aiSummary.ts` (input builder, hash, cost sum, output schema, validator) and `src/lib/shotGuide.ts` (the quality list and what each means to the model) are used by both the page and the function. That's why `src/lib` imports carry `.ts` extensions. The prompt is `supabase/functions/match-summary/prompt.ts`.
- **Storage.** `match_summaries` holds the latest summary per match, readable by the owner and by share-token requests. `match_summary_notes` holds the owner's correction notes, owner-only, so a share link never shows them. `ai_usage` logs every call's tokens and cost, and is kept when a match is deleted. `ai_settings` holds the monthly budget, $20.
- **Out of date.** The input is hashed together with the model and `SUMMARY_VERSION`, now 3. The page computes the same hash, and shows an "Update the summary" banner and a dot on the tab when they differ. Bump `SUMMARY_VERSION` after a prompt change that should prompt everyone to regenerate. Editing a shot's guide also changes the hash for matches that use that shot.
- **Notes.** "Correct this summary" sends the owner's notes with the previous summary. Corrections of fact are treated as true. Saved notes are reapplied on every rewrite.
- **Shot guide.** Each shot has `check_qualities` (tickboxes on `/admin/shots`) and free-text `technical_notes`. The output splits each problem into `tactical` ("Check") and `technical` ("If it's technical"). The technical part is empty when the shot has no notes, or the problem isn't about one shot. Serve is always in the guide, and its notes cover receiving as well as serving.
- **The tab.** The summary lives at `/matches/:id/summary` and `/shared/:token/summary` (`src/components/analysis/CoachSummary.tsx`). Share links only show the tab when a summary exists. PDF export prints whichever tab is open.

Cost and limits:

- A summary costs about $0.07 to $0.09 on Opus 5.5: roughly 7,000 to 9,000 input tokens and 2,000 to 3,000 output tokens, including thinking. Regenerating an unchanged summary costs nothing, because the stored one is returned.
- The function refuses new calls once this month's logged spend reaches `ai_settings.monthly_budget_usd`. The hard stop is the spend limit on the "TT Analysis" workspace in the Claude Console, which the user set to $20 a month. Keep the two in step.
- The Anthropic API key is the `ANTHROPIC_API_KEY` function secret, set on production and in `supabase/functions/.env` locally (gitignored). It's named TTAnalysisSummaries, lives in the TT Analysis workspace and **expires on 1 December 2027**. Summaries stop working on that date unless it's renewed.

Decisions worth keeping:

- The prompt never lets the model guess causes the data can't show: placement, spin, which serve, timeouts. It names what to check on the video instead, and leaves "tactical or technical" to the player.
- Advice on a shot only uses the qualities ticked for it. An A/B test on two matches showed the shot guide made the advice clearly more specific.
- Fields over 140 words are rejected, because an early run degenerated into a list of fragments. The prompt asks for under 70 words a field.
- No server-side fallback to another model on refusal. A refusal is very unlikely on table tennis data, and a fallback would complicate the cost tracking.
- It uses the API, not a Claude subscription. A subscription can't power a server function used by other people.

Still open:

- The technical notes are the user's to write and refine. My drafts from the A/B test were never put on production.
- There's no eval set. Prompt changes have been judged by reading outputs for the Duncan and James matches. If changes become frequent, build a small eval: a handful of matches, plus a checklist covering counts with every claim, no placement guesses, no invented technical faults, and the length limits.
- Possibly let the user choose Sonnet 5.5 for half the cost, if quality holds on a side-by-side.

## 3. Deploying and testing the Edge Function

- **Deploy** with `supabase functions deploy match-summary --use-api --yes`. Docker bundling fails on this machine with "Permission denied (os error 13)" because of SELinux. `--use-api` bundles on Supabase's side and picks up the `src/lib` imports.
- **Serve locally** with `supabase functions serve --env-file supabase/functions/.env`. It needs the source labelled for containers first: `chcon -R -t container_file_t supabase/functions src/lib src/types`. New files need the label again; `restorecon -R` on those folders undoes it.
- **A test call costs real money**, about $0.08. To test without the app, sign in a local test user through the REST API and POST `{ "matchId": ... }` to `http://127.0.0.1:54321/functions/v1/match-summary` with their token.
- **Testing a prompt outside the app:** the `ant` CLI has a `dev` profile (`ant auth login --profile dev`) whose token can call the Messages API (`ant auth print-credentials --access-token --profile dev`, plus the `anthropic-beta: oauth-2025-04-20` header). It bills the Wraight Consulting API account's Default workspace, not the user's Claude subscription. The `admin` profile can't call models.

## 4. Site-wide redesign (done)

Shipped in `ad8a04f`.

- **Shared styles.** `src/index.css` holds the tokens and shared pieces: `.card`, `.btn` (plain white; `.primary` is ink, `.danger`, `.quiet`, `.small`), `.field`/`.fields`, `.segmented`, `.check` (a checkbox row, so don't use it as a general class name), `.data-table`, `.chip`, `.notice`, `.state` for loading/empty/error, `.page`/`.page-head`. `MatchAnalysis.css` holds the analysis page and the coach's summary. `src/styles/pages.css` has small bits for home, auth, match list and admin.
- **Header.** White bar with the brand and nav. On `/admin` pages it turns dark purple with an "Admin" tag and its own nav.
- **Tracker.** Split into `components/tracker/` (`Scoreboard`, `ShotPicker`, `MatchComplete`). Each side of the score is the "who won" button. Category tabs wrap, and each picker remembers its own last category. On a phone the scoreboard shrinks while a point is being recorded. Undo and End Set sit at the top and are disabled mid-point.
- **Unforced errors.** One definition, `UNFORCED_ERROR_DEFINITION` in `analysis.ts`, used on the analysis page, the home page, the points editor and the tracker toggle's tooltip.

Still to do:

- Errors in the tracker still use `alert()`. They could become an inline `.notice`.
- Keyboard shortcuts for recording on a laptop (e.g. 1/2 for who won) would speed things up.

## 5. Tests for the scoring rules (done)

`npm test` runs Vitest: 115 tests across `scoring.test.ts`, `analysis.test.ts`, `aiSummary.test.ts` and `matchDetails.test.ts`. `src/lib/scoring.test.ts` covers every function in `src/lib/scoring.ts`, including `buildMatchState`, the reload logic.

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

Still open:

- **Supabase dashboard (by hand):** upgrade Postgres (the advisor reports security patches for 15.8.1.091), shorten the email OTP expiry to under an hour, and turn on leaked password protection if the plan includes it. Consider raising the minimum password length from 6.
- **React Router:** two moderate advisories need v7. Neither can be reached in this app. Upgrade when convenient.
- **Logout on every deploy:** `src/lib/supabase.ts` clears the stored session whenever the deployed commit changes. It isn't needed for security. Decide whether to keep it.

## 7. Analysis page, unforced errors and points editor (done)

Designed with the user on this canvas: https://claude.ai/artifact/3J5Lt6syww186XcB9mHg6i

How the data works:

- Each point records two shots: the winner's **winning shot** and the loser's **losing shot**. The losing shot is either the one that set up the winner or the one that missed. Rally shots aren't recorded, so the page never talks about shots "played".
- `src/lib/analysis.ts` builds the whole page from the raw match, sets, points and shots, and `src/lib/analysis.test.ts` covers it. The SQL analysis views (`point_shots` and the views on it) are no longer used and can be dropped.
- A service fault is recorded as the receiver's winning shot with `no_shot` for the server. The analysis charges it to the server as an unforced losing shot.
- Who served each point is worked out from the scoring rules (`getServer`), not stored.

Related features:

- **Unforced errors:** `points.is_unforced_error`, ticked in the tracker or in the points editor.
- **Points editor:** `/matches/:id/points`. Tick lucky and unforced point by point, and edit the match details.
- **Matches for friends:** `player_name`, `event` and `video_url` on `matches`. The user's own name lives in auth user metadata (`display_name`), because `profiles` is locked to admins. The analysis page always says "you" to the player being reviewed.

Still open: editing a point's winner and shots in the points editor. The user wants this, as a separate piece of work.

## 8. Code quality

- **`any` types:** `@typescript-eslint/no-explicit-any` is switched off in `eslint.config.js`. Type the rest, then turn the rule back on.
- **Supabase CLI v4 warnings:** `config.toml` uses `auth.email.enable_signup` and `auth.sms.enable_signup`, which v4 renames to `enabled`.
- **Bundle size:** `html2pdf.js` loads on the Export to PDF click. Its own chunk is still over 500 kB, which the build warns about.
- **Unused SQL views:** see section 7.

## Testing against a local stack

`supabase start` in the repo uses the default ports, which clash with the tt-reviews project if that is running. The user doesn't use tt-reviews at the moment; it was stopped on 2026-11-24 with its data kept (`supabase stop --project-id tt-reviews`).

Run the dev server against the local stack with:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<ANON_KEY from supabase status -o json> npx vite --port 5179
```

For an isolated stack instead, copy `supabase/` to a scratch directory, change the ports in its `config.toml` (earlier sessions used 553xx and project id `TTAnalysisScoringTest`), and run `supabase start --workdir <scratch dir>`. Stop it with `supabase stop --workdir <scratch dir> --no-backup`. Never run `supabase db reset` against the linked project. Apply new migrations locally with `supabase migration up --local`.

The production shot list has been edited through the admin page, so it no longer matches the migrations. On production, `around_the_net` is `short_game`, `defence` is `defence / blocks`, and there are extra `block` shots (defence and pips) and a pips `chop_block`. Shots are publicly readable, so the production list and its guide can be read with the public anon key. Read anything else on production with `supabase db query --remote --read-only`.

## Shipping changes

1. `npm run lint`, `npm test` and `npm run build`.
2. If there is a new migration: `supabase db push --remote --dry-run` to confirm only the expected file is pending, then `supabase db push --remote --yes`.
3. If `supabase/functions/match-summary` or anything it imports from `src/lib` changed: `supabase functions deploy match-summary --use-api --yes`.
4. Commit, then push `main`. Vercel deploys from it in about 30 seconds.

Run these one after another, never in parallel. A migration must finish before the push whenever the frontend depends on new columns. On 2026-11-24 the push landed before a migration and production briefly queried columns that didn't exist yet.

Claude Code's auto mode blocks production deploys and some pushes. The user has been switching it off for those steps, and a commit followed by a separate push has worked where one combined command was blocked.
