# Next steps

Last updated: 2026-11-24 (analysis redesign)

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

Audited 2026-11-24. Every attack below was reproduced against a local stack over the REST API, fixed, and retested.

Fixed in migration `20261124140000_security_hardening.sql`:

- **Self-promotion to admin.** The `profiles` update policy let any signed-in user set `is_admin = true` on their own row with one PATCH, and then edit or delete the shared shot list. Sign-up is open, so anyone could do it. Users can now only read their own profile. Admins can read every profile and change `is_admin`, and no other profile column is writable through the API. Production showed no sign it was used: one admin (set 2025-05-26), no other profile edited, and no shot changes after the September 2025 migrations.
- **Points in another user's set.** The `points` insert check only looked at `match_id`, so a point in your own match could name a set from someone else's. The set must now belong to the point's match, on insert and update.
- **Function grants.** `anon` can no longer execute `is_admin` or `handle_new_user`, which clears the two Supabase advisor warnings for them.
- **TRUNCATE** revoked from `anon` and `authenticated`, since it ignores RLS.

Fixed in the frontend:

- `/debug` deleted. It printed the visitor's access and refresh tokens on screen.
- Admin pages no longer bounce an admin to the home page on a direct load. `ProtectedRoute` now waits for the admin lookup.
- `npm audit fix`, and `html2pdf.js` 0.10 to 0.14 (pulls in jsPDF 4.2.1 and DOMPurify 3.5.0, clearing the critical advisories). PDF export checked in the browser.
- `scripts/promote-admin.js` read `SUPABASE_LIVE_SERVICE_ROLE_KEY` while every doc says `SUPABASE_SERVICE_ROLE_KEY`. It now reads the documented one.
- Unused `VITE_PG_*` entries removed from `.env.example`. Any `VITE_` variable the code reads is bundled into public JavaScript, so a database password must never go in one.

Checked and fine:

- RLS is on for all six tables, and all eight views have `security_invoker=on`.
- Users can't insert sets or points into another user's match, or move a match to another user.
- Both `SECURITY DEFINER` functions pin `search_path`. Shot deletes can't cascade into points (the foreign key is NO ACTION).
- Share links still work with the token and return nothing without it.
- Nothing uses `dangerouslySetInnerHTML`, `innerHTML` or `eval`.

Still open:

- **Supabase dashboard (by hand):** upgrade Postgres (advisor: security patches available on 15.8.1.091), shorten the email OTP expiry to under an hour, and turn on leaked password protection if the plan includes it. The minimum password length is 6 in `config.toml`; consider raising it.
- **React Router:** two moderate advisories need v7. Neither applies here: one is SSR-only and the other needs a navigation to an attacker-controlled path, and every navigation in the app uses a literal path. Upgrade when convenient.
- **Logout on every deploy:** `src/lib/supabase.ts` clears the stored session whenever the deployed commit changes. This isn't needed for security. It's a product decision whether to keep it.

## 3. Analysis page redesign (done)

Shipped 2026-11-24. The design came from a canvas worked through with the user: https://claude.ai/artifact/3J5Lt6syww186XcB9mHg6i

- `src/lib/analysis.ts` builds the whole page from raw data; `src/pages/MatchAnalysis.tsx` renders it. The SQL analysis views are unused and can be dropped.
- Unforced errors: `points.is_unforced_error`, ticked in the tracker or in the points editor at `/matches/:id/points`.
- The page uses a newer look than the rest of the site. Bringing the other pages in line is a separate piece of work.
- Not done yet: editing a point's winner and shots in the points editor (the user wants this, later).

## 4. Code quality

- **`any` types:** `@typescript-eslint/no-explicit-any` is switched off in `eslint.config.js`. The analysis page is now typed; type the rest, then turn the rule back on.
- **Duplicate "Push" shots:** fixed on the analysis page, which prefixes pips shots ("Pips push"). The shot list in the tracker still shows both as "Push" under their categories.
- **Supabase CLI v4 warnings:** `config.toml` uses `auth.email.enable_signup` and `auth.sms.enable_signup`, which v4 renames to `enabled`. The `--linked` flag is deprecated in favour of `--remote`.
- **MatchTracker size:** `src/pages/MatchTracker.tsx` is still one large component. Split it only if more tracker features are planned.
- **Bundle size:** `html2pdf.js` is now loaded on the Export to PDF click. Its own chunk is still over 500 kB, which the build warns about.

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
