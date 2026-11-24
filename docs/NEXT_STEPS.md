# Next steps

Last updated: 2026-11-24

Handover notes for picking this work up in a fresh session. Section 1 is the next piece of work. The sections after it record what's already done and what's still open.

## Where things stand

Everything below is merged to `main`, migrated on production Supabase (project `ztozinueuucrdlfwusen`) and deployed to https://tt-analysis.vercel.app. The latest commit is `1da49a8`.

Done on 2026-11-24, in order:

1. **Bug sweep:** analysis attribution, tracker scoring, undo across sets, End Set, best-of, shot selection rules, password reset page.
2. **Share links by token:** `matches.share_token` is a random UUID and the link is `/shared/<token>`. RLS only grants read access to requests that send the token in the `x-share-token` header (`createSharedClient` in `src/lib/supabase.ts`). Stop Sharing clears the token, which kills the link.
3. **Scoring tests** (section 2 below).
4. **Security audit** (section 3).
5. **Analysis page redesign, unforced errors, points editor, matches for friends, patterns** (section 4).

The user has checked the admin panel and the `/debug` removal on production, and used the tracker for a real match with no bugs found. Not yet checked on production by a person: the password reset email. The reset link also needs `https://tt-analysis.vercel.app/reset-password` in the Supabase dashboard's allowed redirect URLs.

## 1. Site-wide redesign (done, not yet shipped)

Done on 2026-11-24 in the working tree, checked on a local stack at desktop and 390px width. Not committed or deployed yet.

- **Shared styles.** `src/index.css` holds the tokens and shared pieces: `.card`, `.btn` (plain white; `.primary` is ink, `.danger`, `.quiet`, `.small`), `.field`/`.fields`, `.segmented`, `.check`, `.data-table`, `.chip`, `.notice`, `.state` for loading/empty/error, `.page`/`.page-head`. `MatchAnalysis.css` now only holds analysis-specific pieces. `src/styles/pages.css` has small bits for home, auth, match list and admin. The old `Button.css`, `Card.css`, `Layout.css`, `Auth.css`, `NewMatch.css`, admin and tracker stylesheets are gone.
- **Header.** White bar with the brand and nav. On `/admin` pages it turns dark purple with an "Admin" tag and its own nav (Users, Shots, Back to app). The admin pages didn't use `Layout` before, so they had no header at all. The shared analysis view now uses `Layout` too.
- **Tracker.** Split into `components/tracker/` (`Scoreboard`, `ShotPicker`, `MatchComplete`). Each side of the score is the "who won" button, so the old 200px player panels are gone. Serving is a small labelled dot, not an emoji. Category tabs wrap rather than scroll sideways, and each picker remembers its own last category. Shots show as label + FH + BH rows, two columns of rows on wide screens. Pips shots read "Pips push" etc., using `shotLabel` from `analysis.ts`. On a phone the scoreboard shrinks while a point is being recorded and the winning shot folds into a summary once picked. Undo and End Set sit at the top and are disabled mid-point. "Back" and "No Data" became one "Cancel point". The End Match dialog went, since everything is already saved; there's a Matches link instead. "Open video" appears when the match has a video link.
- **Other pages.** Match list cards lead with the right action (Continue recording, or Analysis once finished) and show a Won/Lost/In progress chip. New match uses segmented buttons for best of and first server. Auth and reset password reworded in sentence case with autocomplete hints. Admin users and shots use tables, and the shot forms are proper dialogs.
- **Unforced errors.** One definition, `UNFORCED_ERROR_DEFINITION` in `analysis.ts`, shown on the analysis page, the home page steps, the points editor and as the tracker toggle's tooltip: you weren't out of position, you read the spin, you went for the right shot, and it still missed.

Still to do:

- Commit and ship (see "Shipping changes"). No migration is needed.
- The user hasn't seen the new tracker yet. Ask how it feels on a real match.
- Errors in the tracker still use `alert()`. They could become an inline `.notice`.
- Keyboard shortcuts for recording on a laptop (e.g. 1/2 for who won) would speed things up further.

## 2. Tests for the scoring rules (done)

`npm test` runs Vitest. `src/lib/scoring.test.ts` covers every function in `src/lib/scoring.ts`, including `buildMatchState`, the reload logic, which moved there from `MatchTracker.tsx`. No scoring bugs turned up.

Decided while writing the tests:

- A match stops as soon as a side has the sets it needs. Dead sets are not played out.
- Undo straight after End Set reverses the End Set and keeps the set's points: the empty next set is deleted, or the match is reopened if End Set finished it. The next Undo removes the last point. `lastActionWasEndSet` decides which, and the button reads "Undo End Set" when that's what it will do.

## 3. Security audit (done)

Audited 2026-11-24. Every attack was reproduced against a local stack over the REST API, fixed, and retested.

Fixed in migration `20261124140000_security_hardening.sql`:

- **Self-promotion to admin.** Any signed-in user could set `is_admin = true` on their own profile with one PATCH, then edit or delete the shared shot list. Users can now only read their own profile. Admins can read every profile and change `is_admin`. No other profile column is writable through the API. Production showed no sign it was used.
- **Points in another user's set.** A point's set must now belong to the point's match, on insert and update.
- **Function grants.** `anon` can no longer execute `is_admin` or `handle_new_user`.
- **TRUNCATE** revoked from `anon` and `authenticated`, since it ignores RLS.

Fixed in the frontend: `/debug` deleted (it printed the visitor's tokens); admin pages no longer bounce an admin on a direct load; `npm audit fix` and `html2pdf.js` 0.14; `promote-admin.js` reads the documented `SUPABASE_SERVICE_ROLE_KEY`; unused `VITE_PG_*` entries removed from `.env.example`.

Still open:

- **Supabase dashboard (by hand):** upgrade Postgres (the advisor reports security patches for 15.8.1.091), shorten the email OTP expiry to under an hour, and turn on leaked password protection if the plan includes it. Consider raising the minimum password length from 6.
- **React Router:** two moderate advisories need v7. Neither can be reached in this app. Upgrade when convenient.
- **Logout on every deploy:** `src/lib/supabase.ts` clears the stored session whenever the deployed commit changes. It isn't needed for security. Decide whether to keep it.

## 4. Analysis page, unforced errors and points editor (done)

Designed with the user on this canvas: https://claude.ai/artifact/3J5Lt6syww186XcB9mHg6i

How the data works:

- Each point records two shots: the winner's **winning shot** and the loser's **losing shot**. The losing shot is either the one that set up the winner or the one that missed. Rally shots aren't recorded, so the page never talks about shots "played". A short note at the top of the page says this.
- `src/lib/analysis.ts` builds the whole page from the raw match, sets, points and shots, and `src/lib/analysis.test.ts` covers it. The SQL analysis views (`point_shots` and the views on it) are no longer used and can be dropped.
- A service fault is recorded as the receiver's winning shot with `no_shot` for the server. The analysis charges it to the server as an unforced losing shot.
- Who served each point is worked out from the scoring rules (`getServer`), not stored.

What's on the page, in order: headline tiles, "What decided it" cards from fixed rules, unforced errors, how the match went (score gap per set, stages of the set, longest runs), categories for both players, patterns (winning/losing shot pairs seen three times or more, unforced errors left out), your winning and losing shots, scouting the opponent.

Related features:

- **Unforced errors:** `points.is_unforced_error`, ticked in the tracker or in the points editor.
- **Points editor:** `/matches/:id/points`. Tick lucky and unforced point by point, and edit the match details. Linked from the analysis page and the match list.
- **Matches for friends:** `player_name`, `event` and `video_url` on `matches`. The video link must be http(s), checked in the app and by a database constraint. The user's own name lives in auth user metadata (`display_name`), because `profiles` is locked to admins. The analysis page always says "you" to the player being reviewed, so a share link reads naturally for them. The tracker shows "You" on your own matches and the player's name otherwise.

Still open: editing a point's winner and shots in the points editor. The user wants this, as a separate piece of work.

## 5. Code quality

- **`any` types:** `@typescript-eslint/no-explicit-any` is switched off in `eslint.config.js`. The analysis page and points editor are typed. Type the rest, then turn the rule back on.
- **Supabase CLI v4 warnings:** `config.toml` uses `auth.email.enable_signup` and `auth.sms.enable_signup`, which v4 renames to `enabled`.
- **Bundle size:** `html2pdf.js` loads on the Export to PDF click. Its own chunk is still over 500 kB, which the build warns about.
- **Unused SQL views:** see section 4.

## Testing against a local stack

`./start-dev.sh` uses the repo's `supabase/config.toml` on the default ports, which clash with the tt-reviews project if that is running. For isolated testing, copy `supabase/` to a scratch directory, change the ports in its `config.toml` (earlier sessions used 553xx and project id `TTAnalysisScoringTest`), and run:

```bash
supabase start --workdir <scratch dir> -x inbucket,mailpit,studio,imgproxy,vector,logflare,realtime,storage-api,edge-runtime,supavisor
```

Then point the dev server at it:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:55321 VITE_SUPABASE_ANON_KEY=<anon key from supabase start> npx vite --port 5199
```

Stop it with `supabase stop --workdir <scratch dir> --no-backup`. Never run `supabase db reset` against the linked project.

The production shot list has been edited through the admin page, so it no longer matches the migrations. On production, `around_the_net` is `short_game`, `defence` is `defence / blocks`, and there are extra `block` shots (defence and pips) and a pips `chop_block`. To test with production-like data locally, apply the same changes after `supabase start`. Read production with `supabase db query --remote --read-only`.

## Shipping changes

1. `npm run lint`, `npm test` and `npm run build`.
2. If there is a new migration: `supabase db push --remote --dry-run` to confirm only the expected file is pending, then `supabase db push --remote --yes`.
3. Commit, then push `main`. Vercel deploys from it in about 30 seconds.

Run these one after another, never in parallel. A migration must finish before the push whenever the frontend depends on new columns. On 2026-11-24 the push landed before a migration and production briefly queried columns that didn't exist yet.
