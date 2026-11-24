# Next steps

Last updated: 2026-11-24

Handover notes for picking this work up in a fresh session. Work through the sections in order.

## Where things stand

Everything below is merged to `main`, migrated on production Supabase (project `ztozinueuucrdlfwusen`) and deployed to https://tt-analysis.vercel.app.

- **Bug sweep:** analysis view attribution, tracker scoring, undo across sets, End Set, best-of, shot selection rules, password reset page. See the commits from 2026-11-24.
- **Share links:** sharing sets `matches.share_token` to a random UUID and the link is `/shared/<token>`. RLS only grants read access to requests that send the token in the `x-share-token` header (`createSharedClient` in `src/lib/supabase.ts`). Stop Sharing clears the token, which kills the link. Links created before this change show "This shared link is invalid or sharing has been turned off" and need sharing again.

Not yet checked on production by a person: recording a match, undo, the analysis page, the Share button (including the copy-by-hand fallback when clipboard access is blocked) and the password reset email. The password reset link also needs `https://tt-analysis.vercel.app/reset-password` in the Supabase dashboard's allowed redirect URLs.

## 1. Tests for the scoring rules (done)

`npm test` runs Vitest over `src/lib/scoring.test.ts`, which covers every function in `src/lib/scoring.ts`. `buildMatchState` moved there from `MatchTracker.tsx` so the reload logic is tested too. No scoring bugs turned up.

Decided while writing the tests:

- A match stops as soon as a side has the sets it needs. Dead sets are not played out.
- Undo straight after End Set reverses the End Set and keeps the set's points: the empty next set is deleted, or the match is reopened if End Set finished it. The next Undo removes the last point. `lastActionWasEndSet` decides which, and the button reads "Undo End Set" when that's what it will do. Checked in the browser against a local stack.

Run `npm test` alongside lint and build before shipping.

## 2. Security audit

The first sweep deliberately skipped security. Things already known:

- **Debug page:** `/debug` is reachable without any admin check. Make it admin-only or delete it.
- **Admin model:** check how admin status is stored and checked (`is_admin` function, migrations `20250526000000` and `20250526120000`, `scripts/promote-admin.js`). Make sure a user can't make themselves admin through the API, for example by updating their own profile row.
- **RLS on every table:** list policies with `select * from pg_policies` and check each table (`matches`, `sets`, `points`, `shots`, `shot_categories`, users or profiles) for insert, update and delete as well as select. In particular check that a user can't insert a `set` or `point` pointing at someone else's `match_id`.
- **Views:** every view must have `security_invoker = on`, otherwise it bypasses RLS. Check none were missed: `select relname, reloptions from pg_class where relkind = 'v' and relnamespace = 'public'::regnamespace`.
- **Functions:** any `SECURITY DEFINER` function needs `SET search_path` and a reason to exist. Check grants to `anon`.
- **Share tokens:** the owner can read `share_token` through `match_summary`, which is fine. Nothing else should expose it.
- **Supabase advisors:** run the security advisor in the Supabase dashboard and work through what it reports.
- **Frontend:** `src/lib/supabase.ts` clears every localStorage key containing "auth" or "supabase" on each deploy. Decide whether that is wanted. Check nothing renders user-supplied text with `dangerouslySetInnerHTML`.
- **Dependencies:** `npm audit`, and update `html2pdf.js` if it pulls in vulnerable versions.

## 3. Code quality

- **`any` types:** `@typescript-eslint/no-explicit-any` is switched off in `eslint.config.js`. Type the analysis data in `MatchAnalysis.tsx` and the rest, then turn the rule back on.
- **Duplicate "Push" shots:** there are two shots named Push (Around The Net and Pips / Anti). The tables now show category, but the summary lists ("You Won With...", shot distribution, set breakdown) show only "Push".
- **Supabase CLI v4 warnings:** `config.toml` uses `auth.email.enable_signup` and `auth.sms.enable_signup`, which v4 renames to `enabled`. The `--linked` flag is deprecated in favour of `--remote`.
- **MatchTracker size:** `src/pages/MatchTracker.tsx` is still one large component. Split it only if more tracker features are planned.
- **Bundle size:** the build warns about a chunk over 500 kB, mostly `html2pdf.js`. Lazy-load it on the Export to PDF click.

## Testing against a local stack

`./start-dev.sh` uses the repo's `supabase/config.toml` on the default ports, which clash with the tt-reviews project if that is running. For isolated testing, copy `supabase/` to a scratch directory, change the ports in its `config.toml` (the earlier sessions used 553xx), and run:

```bash
supabase start --workdir <scratch dir> -x inbucket,mailpit,studio,imgproxy,vector,logflare,realtime,storage-api,edge-runtime,supavisor
```

Then point the dev server at it:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:55321 VITE_SUPABASE_ANON_KEY=<anon key from supabase start> npx vite --port 5199
```

Stop it with `supabase stop --workdir <scratch dir> --no-backup`. Never run `supabase db reset` against the linked project.

## Shipping changes

1. `npm run lint`, `npm test` and `npm run build`.
2. If there is a new migration: `supabase db push --remote --dry-run` to confirm only the expected file is pending, then `supabase db push --remote --yes`.
3. Push `main`. Vercel deploys from it in about 30 seconds.

Apply the migration before pushing the frontend whenever the frontend depends on new columns.
