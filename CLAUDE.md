# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTAnalysis is a table tennis match analysis web application built using React, TypeScript, and Supabase. The app allows users to track table tennis matches, record point-by-point details including shot types, and analyze performance statistics.

## Common Commands

```bash
# Install dependencies
npm install

# Start Supabase and application servers (recommended)
./start-dev.sh

# Start only the development server (without Supabase)
npm run dev


# Apply new migrations to database (NEVER use supabase db reset)
supabase db push

# Build for production
npm run build

# Lint the codebase
npm run lint

# Preview the production build
npm run preview

# Promote a user to admin (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env)
npm run promote-admin user@example.com
```

The `start-dev.sh` script handles:
1. Starting the local Supabase services (PostgreSQL, Auth, etc.)
2. Creating a test user if one doesn't exist
3. Starting the development server

## Architecture

### Frontend Structure

- **React with TypeScript**: Frontend framework and type checking
- **React Router**: Page navigation and routing
- **Custom CSS**: Styling without external UI libraries
- **Vite**: Build tool and development server

### Backend Integration

- **Supabase**: Backend-as-a-service for:
  - Database (PostgreSQL)
  - Authentication
  - Storage
  - Row-level security policies

### Data Flow

1. Match creation → stored in local state and Supabase
2. Point recording:
   - Select winning player
   - Select winning shot type
   - Select other shot type
   - Record point and update scores
3. Set completion → automated tracking of set scores
4. Match completion → summary and analysis

### Database Schema

- **Users**: id, email, name, preferences
- **Shot Categories**: id, name, display_order
- **Shots**: id, category_id, name, display_name, description, display_order, role (attack, control, defence or null)
- **Players**: id, user_id, name, is_self (the account owner; one per user), style_id, hand, forehand_rubber, backhand_rubber, notes (owner only; feed the technical advice in the coach's summary)
- **Play styles**: id, name, description, as_notes, against_notes, display_order (admin-managed tactical notes); **kit_notes** (key: left_handed or a non-inverted rubber, against_notes); **style_matchups** (player_style_id, opponent_style_id, notes)
- **Matches**: id, user_id, player_id (the player record; a trigger keeps player_name in step with its name and checks it's the owner's), player_name (who the analysis is about, shown on share links; empty on older matches, which are the owner's own), player_/opponent_ style_id, hand, forehand_rubber, backhand_rubber (each side's style as it was for this match), opponent_name, event (free text), video_url (http(s) only, enforced by a check constraint), date, match_score, notes, initial_server, best_of, is_complete, share_token (random UUID set when sharing; RLS grants public read only to requests sending it in the x-share-token header), confirmed_tags (sweep tags the owner has confirmed are complete), sweep_progress (the next point id for each unfinished sweep)
- **Sets**: id, match_id, set_number, score, player_score, opponent_score
- **Points**: id, set_id, match_id, point_number (restarts each set; order by created_at across a match), winner, winning_shot_id, winning_hand, other_shot_id, other_hand, is_lucky_shot, is_unforced_error (the losing shot was unforced; ticked in the tracker or the points editor), is_attacked_first (the player played the first attacking shot), is_early_attack (the player attacked straight away: the third ball on their serve, the receive on the opponent's; implies is_attacked_first, enforced by a check constraint), notes

Wording on the site: you **film** a match (the video) and **enter** its points (the tracker). Don't use "record" or "log" for either in anything a user reads, and say "losing shot", never "other shot". The AI feature is "the coach's summary". Advice is **tactical** (something a player can change during a match) or **technical** (something to work on in practice); the definitions live in `src/lib/shotGuide.ts`.

Each point records two shots: the winner's winning shot and the loser's losing shot ("other shot" in the schema), which is either the shot that set up the winner or the one that missed. Rally shots aren't recorded, so the analysis page always talks about winning and losing shots, never shots played. The page is built by `buildAnalysis` in `src/lib/analysis.ts` from the raw match, sets, points and shots, and is covered by `src/lib/analysis.test.ts`. A service fault is recorded as the receiver's winning shot with `no_shot` for the server; the analysis charges it to the server as an unforced losing shot.

Each shot has a `role` (attack; control, keeping the ball in play at the table; defence, with backspin or from distance, including chop block; or null for serves), edited on `/admin/shots`. The Shot balance section (`ShotBalance` in `src/components/analysis`, data from `buildBalance`) compares each side's winning and losing shots by role and by shot. The coach's summary gets it too, but only uses it to back up other problems (who got to attack first), and only when something clearly stands out.

The first two shots are the only ones the data places exactly: when the serve is the winning shot the loser's last shot was the receive, and when the serve is the server's losing shot the receive won. `serveReceive` in the analysis and the page's Serve and receive section are built on that, and each point row carries `decidedBy`. "Close finishes" means points played with both players on 8 or more (`isFromEightAll`), used everywhere the page or the summary talks about the end of sets.

Sweeps (`src/lib/sweeps.ts`, page `PointSweep` at `/matches/:id/sweep/:tag`) go back through a match one point at a time to tick one tag: unforced errors (points the player lost), attacked first (every point except those already ticked as attacked straight away), attacked straight away (points past the receive on either serve; the button reads "Third-ball attack" or "Attacked their serve") and lucky shots. Next means no, keys are Y, N or Space, and Backspace. Every answer saves the point and the position; finishing adds the tag to `confirmed_tags`. A tag only reaches the analysis (`attackFirst`, split by server, and `earlyAttack`) once it has a tick or is confirmed, and the analysis page asks the owner about ticked tags that aren't confirmed. Only the player's attack first is ticked: an unticked point with an attack-role shot in its last two means the opponent attacked first, and one without is "unclear", never counted as the opponent's. On the opponent's serve, a point decided by the receive already shows whether the player attacked the serve, so it's counted without a tick.

Players and styles: `/players` lists the owner's players (themselves and the people whose matches they enter), each with a style, hand, rubbers and free-text notes. Admins manage styles of play, notes for left-handers and each non-inverted rubber, and one-way match-ups on `/admin/styles`. A new match picks a player (or adds one), copies their style onto the match, and fills in the opponent's from the last match against the same name (`getLastOpponentKit`). The points editor edits both sides. The analysis tab shows them on a Match details card. Styles are tactical, the player's notes technical. `buildStyleSection` in `src/lib/styles.ts` adds them to the end of the summary input, and adds nothing when there's nothing to say, so matches without styles hash as before. Players are owner only, so share links see style labels but never notes. The self player comes from the "This is me" box on the new match form (unticked by default, only offered while the account has none); nothing in the app can move it to another player afterwards.

The page also lists patterns: winning/losing shot pairs that happened three times or more for each side, excluding unforced errors. The user's own name for defaulting the player lives in auth user metadata (`display_name`), not in `profiles`, which only admins can update.

AI summaries: admins switch them on per user (`profiles.ai_summaries_enabled`). The `match-summary` Edge Function (`supabase/functions/match-summary`) checks the flag and ownership, rebuilds the analysis with `buildAnalysis`, and sends it with every point to Claude Opus 5.5 using the prompt in `prompt.ts`. The input builder, hash, cost sum and output schema live in `src/lib/aiSummary.ts`, shared by the page and the function, which is why `src/lib` imports use `.ts` extensions. Summaries are stored in `match_summaries` (owner and share token can read), the owner's correction notes in `match_summary_notes` (owner only), and every call's tokens and cost in `ai_usage`. The summary is its own tab on the analysis page, at `/matches/:id/summary` and `/shared/:token/summary` (`CoachSummary` in `src/components/analysis`). Owners see the tab once AI summaries are on or a summary exists; share links only when a summary exists, and never the owner's notes. PDF export prints whichever tab is open. Each shot carries a guide for the summary, edited on `/admin/shots`: `check_qualities` (keys from `src/lib/shotGuide.ts`, which also holds what each quality means to the model) and free-text `technical_notes`. The input lists the guide for shots used in the match, and each problem comes back with a `kind` (shot, unforced, receive, serve, situation) and separate `tactical` and `technical` advice. The kind decides the advice: unforced errors get technical advice only and are never put down to misreading spin, receive problems always use `RECEIVE_GUIDANCE` from `shotGuide.ts` rather than the receiving stroke's notes, and a situation gets no technical advice. `enforceKinds` applies those rules before validation. Nerves are only mentioned when `unforced.bunchedLate` is true. Test prompt changes with `scripts/summary-eval.ts` (usage in its header; about $0.10 a summary); summaries stored before that have a single `try` and still render. Editing a used shot's guide changes the input hash, so those summaries show as out of date. The function refuses new calls once the month's logged spend reaches `ai_settings.monthly_budget_usd`, which admins set on `/admin`. The Anthropic key is the `ANTHROPIC_API_KEY` function secret (locally `supabase/functions/.env`, gitignored). Deploy the function with `supabase functions deploy match-summary --use-api`, because Docker bundling hits SELinux on this machine. Locally, `supabase functions serve` needs `chcon -R -t container_file_t supabase/functions src/lib src/types` for the same reason.

The older SQL views (`point_shots` and the views built on it) are no longer used by the frontend. Views use `security_invoker`, so a view created without it bypasses RLS.

The database uses PostgreSQL with Supabase for Auth and Row Level Security. The schema is defined in the `supabase/migrations` directory.

## Code Organization

- `/src/components`: Reusable UI components. `Layout` renders the header, with a purple admin variant on `/admin` pages. `tracker/` holds the tracker's `Scoreboard` (each side is the "who won" button), `ShotPicker` and `MatchComplete`
- `/src/pages`: Main application pages/screens. `Home` shows `HomeBrochure` (the marketing page, styles in `src/styles/home.css`, screenshots in `src/assets/home/`) to signed-out visitors and sends signed-in users to `/matches`. Its facts are constants at the top of `HomeBrochure.tsx`; a `null` one stays hidden. The build prerenders it into `dist/index.html` (`src/prerender.tsx`, `scripts/prerender.mjs`), served only for `/`; every other route is rewritten to `dist/app.html`
- `/src/lib`: Utilities and external clients (Supabase)
- `/src/types`: TypeScript definitions for database entities
- `/src/styles`: Page stylesheets. Tokens and shared pieces (cards, `.btn`, fields, `.segmented`, `.data-table`, `.chip`, `.notice`, `.state`) live in `src/index.css`; blue `--you` and orange `--opp` mean player and opponent and aren't used as general accents
- `/docs`: Project documentation

## Key Features

- Match recording with opponent, date, and score tracking
- Point-by-point analysis with shot type classification
- Server tracking based on table tennis rules (every 2 points)
- Set advancement with proper scoring rules (first to 11, win by 2)
- Match statistics and performance visualization

## Development Notes

- The application uses environment variables:
  - For Supabase:
    - `VITE_SUPABASE_URL` - URL for Supabase instance
    - `VITE_SUPABASE_ANON_KEY` - Anonymous API key for Supabase

- Use `./start-dev.sh` for local development, which sets up:
  - Local Supabase instance for authentication and database
  - React frontend with Vite
  - Test user creation if needed

- Mobile-first design for courtside usage during matches
- Match deletion and creation are fully implemented
- Point recording uses shot IDs from the shots database