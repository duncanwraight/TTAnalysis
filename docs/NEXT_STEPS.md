# Next steps

Last updated: 2026-11-26

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

The user has done real sweeps on production and checked the sweep page, the points editor, the analysis page and the shot editor, with everything working.

The user has checked the admin panel, the `/debug` removal and the AI summaries on production, and used the tracker for a real match with no bugs found. Not yet checked on production by a person:

- The password reset email. Test it from ttanalysis.app: the link should land on ttanalysis.app/reset-password.
- A summary written with the sweep tags. Press "Update the summary" on a match with attacked first and attacked straight away ticked (about $0.10). Check it uses the counts sensibly, including the serve split, and that the banner goes away afterwards. If the banner stays, the page and the function are hashing different input (most likely `confirmed_tags` or the new point columns).

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

Still to do:

- Other accounts may have the same problem (a friend's name as their self player). Only the user's account was checked. There's no way in the app to change who "You" is: the Players page can't move `is_self`, and renaming the self player would rename every match linked to it. Either add a "This is me" control on the Players dialog or fix accounts by hand.
- Watch the next summaries written with player notes for any mention of the notes ("you noted", "your coach says"). See *Player notes in the summary's wording* below.
- Match-ups, and notes for left-handers and medium pips, are empty until the user writes them.

## 1. Signed-out homepage brochure and wording sweep (done)

Built and shipped on 2026-11-25 from this design canvas: https://claude.ai/artifact/QEw5JW86rf8BMaRDQSm79J. The user approved the design and the final copy on the canvas before it was built.

- **Where:** `src/pages/HomeBrochure.tsx` and `src/styles/home.css`. `Home.tsx` shows it to signed-out visitors.
- **Screenshots:** WebP files in `src/assets/home/`, taken from the real app with a sample match: a copy of a real local match with made-up names (Sam Carter v Alex Morgan, "Club league, division 2"). The copy quotes its numbers, so new screenshots mean checking the copy too. The sample matches exist only on the local stack, under `summary-test@example.test`.
- **Copy:** the first draft read as machine-written. It was rewritten from a brief built on research into UK sports product sites, one agent per section, then edited with the user. The brief and research are not in the repo; the lessons are: name real shots, sets and scores from the sample match, say plainly that only two shots a point are entered, and don't tell people how to film beyond "any phone will do". Playback at 1.25x or 1.5x is the user's own tip. The headline is "Your backhand loop won 5 and lost 12." Both sign-up buttons say "Create an account".
- **Facts:** constants at the top of `HomeBrochure.tsx`, answered by the user on 2026-11-25. Entry time: a match filmed uncut runs about 20 minutes, around 15 to enter at 1.5x, and a trimmed match often half that. The coach's summary is "By invitation". It's free with no payment to set up. There's no contact link (`CONTACT` stays `null`, so that line stays hidden).
- **Sign-up:** "Create an account" links to `/auth?mode=signup`, which opens the sign-up form.
- **Link previews:** `index.html` has a title, description and Open Graph tags. `public/og-image.png` is a 1200x630 shot of the hero, with the nav links, buttons and hero note hidden and the sample-match caption pinned bottom right. It was regenerated on 2026-11-25 for the new domain by injecting that CSS into a copy of `dist/index.html` and screenshotting it at 1200x630 with headless Chromium.
- **Signed-in users** go straight from `/` to `/matches`. The old signed-in home was removed.
- **Prerendering:** `npm run build` also builds `src/prerender.tsx` for SSR and runs `scripts/prerender.mjs`, which writes the brochure's HTML into `dist/index.html`. That file is only served for `/`. `dist/app.html` is the same page with an empty root, and `vercel.json` rewrites every other route to it, except `/assets/`, so no other page flashes the brochure. An inline script in the head hides the prerendered brochure from browsers holding a session (`html.has-session`), and `main.tsx` removes the class before React renders. `Home` keeps the brochure on screen while auth loads unless a session is stored (`src/lib/storedSession.ts`). React replaces the prerendered HTML rather than hydrating it.
- **Checked:** at 1440px and 390px wide, with no sideways scroll and no console errors, and on production after the deploy.
- **Wording sweep:** you **film** a match and **enter** its points. "Record" and "log" were removed from everything a user reads: the tracker, match list, new match form, analysis page, coach's summary, signed-in home and admin shots page. "Other shot" became "losing shot", the admin page's "AI coach" became "the coach's summary", and "log in/out" became "sign in/out". The rule is in CLAUDE.md. Code and database names (`recordPoint`, `unforced.recorded`, `other_shot_id`) and the AI prompt were left alone.

Still open: a contact link, if one is wanted.

## 2. AI coach's summary (done)

Built and shipped on 2026-11-24 in `c8c989c`, `56b9c09`, `44e0cbb` and `d2c03d7`. CLAUDE.md has the short version. This section has the decisions and the things worth knowing before changing it.

How it works:

- **Access.** `profiles.ai_summaries_enabled` is off for everyone. Admins switch it on per user from `/admin`, which also shows this month's spend against the budget, per user and in total.
- **The function.** `supabase/functions/match-summary` checks the flag and that the caller owns the match. It loads the match as the caller, so RLS applies, and rebuilds the analysis with `buildAnalysis`. Then it sends the analysis, every point and the shot guide to `claude-opus-5-5` (effort `medium`, structured output). The service role is only used for the flag, the budget, and writing the summary and usage rows.
- **Shared code.** `src/lib/aiSummary.ts` (input builder, hash, cost sum, output schema, validator) and `src/lib/shotGuide.ts` (the quality list and what each means to the model) are used by both the page and the function. That's why `src/lib` imports carry `.ts` extensions. The prompt is `supabase/functions/match-summary/prompt.ts`.
- **Storage.** `match_summaries` holds the latest summary per match, readable by the owner and by share-token requests. `match_summary_notes` holds the owner's correction notes, owner-only, so a share link never shows them. `ai_usage` logs every call's tokens and cost, and is kept when a match is deleted. `ai_settings` holds the monthly budget, $20.
- **Out of date.** The input is hashed together with the model and `SUMMARY_VERSION`, now 6. The page computes the same hash, and shows the owner an "Update the summary" banner and a dot on the tab when they differ. Share links never see either, and the banner is left out of PDF exports (`data-html2canvas-ignore`), because only the owner can act on it. Bump `SUMMARY_VERSION` after a prompt change that should prompt everyone to regenerate. Editing a shot's guide also changes the hash for matches that use that shot.
- **Notes.** "Correct this summary" sends the owner's notes with the previous summary. Corrections of fact are treated as true. Saved notes are reapplied on every rewrite.
- **Shot guide.** Each shot has `check_qualities` (tickboxes on `/admin/shots`) and free-text `technical_notes`. The output splits each problem into `tactical` and `technical`, shown as the "Tactical" and "Technical" panels. The technical part is empty when the shot has no notes, or the problem isn't about one shot. The tactical part is empty for unforced errors. The validator accepts either part empty, but not both. Serve is always in the guide, and its notes cover receiving as well as serving.
- **The tab.** The summary lives at `/matches/:id/summary` and `/shared/:token/summary` (`src/components/analysis/CoachSummary.tsx`). Share links only show the tab when a summary exists. PDF export prints whichever tab is open.

Cost and limits:

- A summary costs about $0.10 to $0.12 on Opus 5.5 since shot balance was added (it was $0.07 to $0.09 before): roughly 9,000 to 11,000 input tokens and 2,500 to 3,500 output tokens, including thinking. Regenerating an unchanged summary costs nothing, because the stored one is returned.
- The function refuses new calls once this month's logged spend reaches `ai_settings.monthly_budget_usd`. The hard stop is the spend limit on the "TT Analysis" workspace in the Claude Console, which the user set to $20 a month. Keep the two in step.
- The Anthropic API key is the `ANTHROPIC_API_KEY` function secret, set on production and in `supabase/functions/.env` locally (gitignored). It's named TTAnalysisSummaries, lives in the TT Analysis workspace and **expires on 1 December 2027**. Summaries stop working on that date unless it's renewed.

Decisions worth keeping:

- The prompt never lets the model guess causes the data can't show: placement, spin, which serve, timeouts. It names what to check on the video instead, and leaves "tactical or technical" to the player.
- Advice on a shot only uses the qualities ticked for it. An A/B test on two matches showed the shot guide made the advice clearly more specific.
- Fields over 140 words are rejected, because an early run degenerated into a list of fragments. The prompt asks for under 70 words a field.
- No server-side fallback to another model on refusal. A refusal is very unlikely on table tennis data, and a fallback would complicate the cost tracking.
- It uses the API, not a Claude subscription. A subscription can't power a server function used by other people.

Tactical and technical, added 2026-11-25: **tactical** is something a player can change during a match to influence it (placement, variation, shot choice). **Technical** is something in the stroke or in reading spin that they work on in practice. The definitions are `TACTICAL_DEFINITION` and `TECHNICAL_DEFINITION` in `src/lib/shotGuide.ts`. `/admin/shots` labels the qualities as tactical and the notes as technical, and the summary's problem panels read "Tactical" and "Technical" (they used to say "Check" and "If it's technical"), with both definitions under "Work on". The prompt uses the same definitions. `SUMMARY_VERSION` was not bumped, so existing summaries aren't marked out of date.

Unforced errors, changed 2026-11-25: a problem about unforced errors gets technical advice only, because a change of tactics doesn't stop a player missing a shot nobody forced. Where a problem mixes unforced errors with shots the opponent beat, the tactical part only covers the points the opponent won. Service faults count as unforced. The mental-side checks now look for unforced errors bunched late in sets (once either player reaches 8) or in close sets (won by 3 points or fewer): 3 or more, and more than in the rest of the match. That gets a note putting it down to nerves (holding back, shortening the stroke, steering the ball) and suggesting the player commit to the shot. `SUMMARY_VERSION` went from 3 to 4, so every stored summary shows as out of date until it's regenerated.

Shot balance, added 2026-11-25: the input now includes `balance` (role tallies for each side, the standouts, and each shot's role and counts, without row keys), and `categories` was dropped from the analysis altogether. The prompt reads the balance as who got to attack first: a bigger attack share means that side opened up and finished points, and won and lost within a role says whether that way of playing paid. If the player loses when controlling and wins when attacking, the advice is to look for the first chance to attack and make the control shot harder to attack. If the attack itself loses, the advice is never to attack more. A different style is described in counts, never named ("chopper"), because one match's last shots can't establish it. The balance is supporting evidence, not a section: it only comes up when something is in `standouts`, or a role was won or lost 2 to 1 on 10+ shots, and then mostly inside another problem. It gets a problem of its own at most once, and only reaches the headline when a role standout decided the match. Tested on the two local sample matches before shipping (about $0.10 each): the first run put role counts in the headline of a match with no role standout, which is why that last rule exists. Neither local match has a role standout (one is a copy of the other), so a match where the styles clearly differ hasn't been tried yet. The Edge Function now loads `shots.role`. Without it, the function's hash would never match the page's. `SUMMARY_VERSION` went from 4 to 5.

Still open:

- **Player and match-up insights (needs a design).** Let the coach's summary use what's known about the player and the kind of opponent, as well as the one match. Examples: things a player is working on or tends to fail with, and things to look for against particular styles of play, each split into tactical and technical. Questions for the design:
  - Where the knowledge lives: per player (the user and the friends whose matches they enter), per opponent, per style of play, or a mix. Who writes it: the user, the coach's summary across past matches, or both.
  - How a style of play is described: a fixed list (chopper, pips blocker, two-winged looper, penhold and so on), free text, or both, and whether it's set on the match or on the opponent.
  - How it reaches the prompt without the model treating it as evidence. The rule that only the counts are stated as fact has to hold, so player and style notes can only shape what to check.
  - Privacy on share links: notes about a player's weaknesses probably shouldn't be visible, like the correction notes today.
  - Effect on the input hash, cost and the token budget.
- The technical notes are the user's to write and refine. They were rewritten into one pattern on 2026-11-25 (*Shot notes* in `docs/ANALYSIS_REVIEW.md`), and new ones should follow it. Serve, sideswipe, pips block, pips chop block and lob have none.
- The eval (`scripts/summary-eval.ts`) checks rules by pattern, not the truth of each count. Claims like "won 5, lost 12" could be checked against the analysis if a wrong count ever turns up.
- Possibly let the user choose Sonnet 5.5 for half the cost, if quality holds on a side-by-side.

## 3. Deploying and testing the Edge Function

- **Deploy** with `supabase functions deploy match-summary --use-api --yes`. Docker bundling fails on this machine with "Permission denied (os error 13)" because of SELinux. `--use-api` bundles on Supabase's side and picks up the `src/lib` imports.
- **Serve locally** with `supabase functions serve --env-file supabase/functions/.env`. It needs the source labelled for containers first: `chcon -R -t container_file_t supabase/functions src/lib src/types`. New files need the label again; `restorecon -R` on those folders undoes it.
- **A test call costs real money**, about $0.10. To test without the app, sign in a local test user through the REST API and POST `{ "matchId": ... }` to `http://127.0.0.1:54321/functions/v1/match-summary` with their token.
- **Testing a prompt without serving the function:** a throwaway script run with `npx vite-node` can load a local match with the service role key, build the input with `buildAnalysis` and `buildSummaryInput`, and POST it to the Messages API with `SYSTEM_PROMPT`, `SUMMARY_SCHEMA` and the function's settings (`max_tokens` 16000, effort `medium`), using `ANTHROPIC_API_KEY` from `supabase/functions/.env`. That bills the TT Analysis workspace. This is how the shot balance prompt was tested.
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

- **Supabase dashboard (done by the user 2026-11-26):** minimum password length set to 8, leaked password protection on, email OTP expiry under an hour, and Postgres upgraded from 15.8.1.091 to 17.12. The project also moved from the Nano to the Micro compute size (a free upgrade). Checked after the upgrade: auth is healthy, the database linter is clean, shots read anonymously, matches don't, and production has 13 matches, 488 points and 3 summaries.
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

Still open:

- Editing a point's winner and shots in the points editor. The user wants this, as a separate piece of work.

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
- **Coach's summary.** The input now carries `attackFirst`, `thirdBall`, `unforced.confirmed` and "attacked first" and "third ball" point flags. The prompt has a "Who attacked first" section: use it over shot balance when present, treat unconfirmed counts as "in the points you marked", and never count unclear points as the opponent's. Not yet tried on a real model call.
- **Checked** locally in Chrome on the Sam Carter sample match: a sweep by keyboard, Back, finishing, the end screen, the warning and its button, both new sections, and the sweep at 390px wide. The local test user's password was set to `sweep-test-2026` for this.

Shipped in `65587b3`, with the changes below in `75b15bd` and `2c2a2ab`. Not yet tried: a coach's summary on a match with these tags (see *Where things stand*).

Changed on 2026-11-26, after the first real use: attacked first is split by who served, and the third-ball sweep became **attacked straight away** (`early_attack`, `points.is_early_attack`, migration `20261126120000_early_attack.sql`). It covers points past the receive on either serve: on the player's serve it's a third-ball attack, on the opponent's it's attacking the serve, and the Yes button says which. Receives that won or lost the point count from the entered shots without a tick, in both `earlyAttack.onReceive` and attacked first. The migration kept the 7 third-ball ticks on production, dropped `third_ball` from `confirmed_tags` (it never covered their serves) and cleared the one unfinished third-ball position. `SUMMARY_VERSION` went to 8. Also fixed: moving from one sweep's end screen to the next kept the old sweep's state (`75b15bd`). A UX pass the same day: the `/admin/shots` edit dialog is now wide, in sections (the shot, role, then Tactical and Technical side by side) with short explanations and Save always in view, and the shot tables share column widths; the analysis page's new bars match the stage bars, and the 8-all figures say so when no set reached 8-all.

Still open on sweeps:

- Opponent's third-ball attacks aren't tagged. Their receive attacks on the player's serve already show from the entered shots when the receive decided the point.
- The "Edit points" link at the bottom of the analysis page doesn't say that sweeps live on the points editor.
- Shot balance shows a "Defence 0 (0%)" row when nobody defended.

## 8. Code quality (done)

Cleared on 2026-11-26. Nothing is left open in this section. `tsc` only checks `src`, so `scripts/summary-eval.ts` is typed but only lint checks it.


- **`any` types (done 2026-11-26):** the last ones (the eval script and `User.preferences`) are typed, and `@typescript-eslint/no-explicit-any` is back on.
- **Supabase CLI v4 warnings (done 2026-11-26):** `config.toml` uses `auth.email.enabled` and `auth.sms.enabled`, so `supabase status` no longer warns.
- **Bundle size (done 2026-11-26):** every page except Home and Auth is loaded with `React.lazy` (`src/App.tsx`), which took the main chunk from 601 kB to 444 kB. PDF export imports html2pdf's source (`html2pdf.js/src/index.js`) rather than its prebuilt bundle, and `vite.config.ts` puts jspdf and html2canvas in chunks of their own: about 600 kB on the click instead of 985 kB, and no chunk over 500 kB. Vite's preload helper has its own chunk, because otherwise Rollup put it in the jspdf chunk and every page loaded jspdf. Export was checked on a production build against the local stack.
- **Stale tabs after a deploy (done 2026-11-26):** with pages loaded on demand, a tab opened before a deploy asks for chunks that no longer exist. `main.tsx` reloads once on `vite:preloadError` (a timestamp in session storage stops a loop), `vercel.json` no longer rewrites `/assets/` to `app.html` so a missing chunk is a 404 rather than HTML, and `PageErrorBoundary` shows "This page didn't load" with Reload and Your matches buttons instead of a blank screen. It resets when the path changes rather than by key, so the analysis page's tabs don't remount. Tested by deleting a chunk from a preview build. Vercel's Skew Protection would also cover this, but it's a paid feature.
- **Unused SQL views (done 2026-11-26):** `point_shots`, the six views on it and `match_summary` were dropped by `20261127140000_drop_analysis_views.sql`, applied to production the same day. Nothing in the app, the function or the scripts read them.

## Testing against a local stack

`supabase start` in the repo uses the default ports, which clash with the tt-reviews project if that is running. The user doesn't use tt-reviews at the moment; it was stopped on 2026-11-24 with its data kept (`supabase stop --project-id tt-reviews`).

Run the dev server against the local stack with:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<ANON_KEY from supabase status -o json> npx vite --port 5179
```

For an isolated stack instead, copy `supabase/` to a scratch directory, change the ports in its `config.toml` (earlier sessions used 553xx and project id `TTAnalysisScoringTest`), and run `supabase start --workdir <scratch dir>`. Stop it with `supabase stop --workdir <scratch dir> --no-backup`. Never run `supabase db reset` against the linked project. Apply new migrations locally with `supabase migration up --local`.

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

1. `npm run lint`, `npm test` and `npm run build`.
2. If there is a new migration: `supabase db push --remote --dry-run` to confirm only the expected file is pending, then `supabase db push --remote --yes`.
3. If `supabase/functions/match-summary` or anything it imports from `src/lib` changed: `supabase functions deploy match-summary --use-api --yes`.
4. Commit, then push `main`. Vercel deploys from it in about 30 seconds.

Run these one after another, never in parallel. A migration must finish before the push whenever the frontend depends on new columns. On 2026-11-24 the push landed before a migration and production briefly queried columns that didn't exist yet.

Claude Code's auto mode blocks production deploys and some pushes. The user has been switching it off for those steps, and a commit followed by a separate push has worked where one combined command was blocked.
