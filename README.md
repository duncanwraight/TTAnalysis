# TTAnalysis

A table tennis match analysis app, live at https://ttanalysis.app. You film a match, enter its points in the tracker (who won, the winning shot and the losing shot), and the app works out where points were won and lost. Built with React, TypeScript and Supabase, hosted on Vercel.

## Features

- **Tracker:** point-by-point entry built for courtside use on a phone, with keyboard shortcuts on wider screens. Serves, set scores and the match result are worked out from the points.
- **Analysis:** each match's analysis page covers winning and losing shots, serve and receive, close finishes from 8-all, shot balance by role, unforced errors, who attacked first and repeated patterns.
- **Coach's summary:** an AI write-up of a match with tactical and technical advice, switched on per user by an admin, with a monthly budget.
- **Points editor and sweeps:** fix a point's winner or shots after the match, and go back through a match one point at a time to tick unforced errors, attacked first, attacked straight away and lucky shots.
- **Players and styles:** the owner's players, each with a style of play, hand, rubbers and notes. Admins manage the styles and the notes that go with them.
- **Player history:** every match for one player added up, with trends over time, shots across matches and results against different kinds of opponent.
- **Sharing:** a match or a player's history can be shared by link. Stopping sharing kills the link.
- **PDF export** of the analysis page.

## Quick start

```bash
npm install

# Start the local Supabase stack, create a test user and start the dev server
./start-dev.sh

# Or the dev server only, with Supabase already running
npm run dev

npm test          # Vitest
npm run lint      # ESLint, no warnings allowed
npm run build     # type check, build and prerender the homepage and help pages
```

The app needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Apply new migrations with `supabase db push`, and never run `supabase db reset` against the linked project.

## Project structure

- `src/pages`: one file per route, loaded on demand from `App.tsx`
- `src/components`: shared pieces (`Layout`, dialogs) and folders for the tracker, the analysis page, the player history and auth
- `src/lib`: the Supabase client and API, and the logic behind the pages: `analysis.ts`, `history.ts`, `scoring.ts`, `sweeps.ts`, `pointEdits.ts`, `aiSummary.ts`, each with tests
- `src/styles`: page stylesheets; tokens and shared styles live in `src/index.css`
- `supabase/migrations`: the schema and row-level security policies
- `supabase/functions/match-summary`: the Edge Function behind the coach's summary
- `src/help`: the help pages at `/help`, one MDX file each in `src/help/content`
- `scripts`: the homepage and help prerender, admin promotion and the summary eval
- `docs`: architecture notes and the handover notes in `NEXT_STEPS.md`

`CLAUDE.md` has the full detail on the schema, the analysis rules and the wording used on the site.
