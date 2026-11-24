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
- **Shots**: id, category_id, name, display_name, description, display_order
- **Matches**: id, user_id, player_name (who the analysis is about; empty on older matches, which are the owner's own), opponent_name, event (free text), video_url (http(s) only, enforced by a check constraint), date, match_score, notes, initial_server, best_of, is_complete, share_token (random UUID set when sharing; RLS grants public read only to requests sending it in the x-share-token header)
- **Sets**: id, match_id, set_number, score, player_score, opponent_score
- **Points**: id, set_id, match_id, point_number (restarts each set; order by created_at across a match), winner, winning_shot_id, winning_hand, other_shot_id, other_hand, is_lucky_shot, is_unforced_error (the losing shot was unforced; ticked in the tracker or the points editor), notes

Each point records two shots: the winner's winning shot and the loser's losing shot ("other shot" in the schema), which is either the shot that set up the winner or the one that missed. Rally shots aren't recorded, so the analysis page always talks about winning and losing shots, never shots played. The page is built by `buildAnalysis` in `src/lib/analysis.ts` from the raw match, sets, points and shots, and is covered by `src/lib/analysis.test.ts`. A service fault is recorded as the receiver's winning shot with `no_shot` for the server; the analysis charges it to the server as an unforced losing shot.

The page also lists patterns: winning/losing shot pairs that happened three times or more for each side, excluding unforced errors. The user's own name for defaulting the player lives in auth user metadata (`display_name`), not in `profiles`, which only admins can update.

AI summaries: admins switch them on per user (`profiles.ai_summaries_enabled`). The `match-summary` Edge Function (`supabase/functions/match-summary`) checks the flag and ownership, rebuilds the analysis with `buildAnalysis`, and sends it with every point to Claude Opus 5.5 using the prompt in `prompt.ts`. The input builder, hash, cost sum and output schema live in `src/lib/aiSummary.ts`, shared by the page and the function, which is why `src/lib` imports use `.ts` extensions. Summaries are stored in `match_summaries` (owner and share token can read), the owner's correction notes in `match_summary_notes` (owner only), and every call's tokens and cost in `ai_usage`. The function refuses new calls once the month's logged spend reaches `ai_settings.monthly_budget_usd`, which admins set on `/admin`. The Anthropic key is the `ANTHROPIC_API_KEY` function secret (locally `supabase/functions/.env`, gitignored). Deploy the function with `supabase functions deploy match-summary --use-api`, because Docker bundling hits SELinux on this machine. Locally, `supabase functions serve` needs `chcon -R -t container_file_t supabase/functions src/lib src/types` for the same reason.

The older SQL views (`point_shots` and the views built on it) are no longer used by the frontend. Views use `security_invoker`, so a view created without it bypasses RLS.

The database uses PostgreSQL with Supabase for Auth and Row Level Security. The schema is defined in the `supabase/migrations` directory.

## Code Organization

- `/src/components`: Reusable UI components. `Layout` renders the header, with a purple admin variant on `/admin` pages. `tracker/` holds the tracker's `Scoreboard` (each side is the "who won" button), `ShotPicker` and `MatchComplete`
- `/src/pages`: Main application pages/screens
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