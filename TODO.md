# TTAnalysis Project TODOs

## Authentication (Supabase Auth)
- [x] Setup Supabase CLI for local development
- [x] Initialize local Supabase project connected to PostgreSQL database
- [x] Test connection between Supabase Auth and local database
- [x] Create Auth UI components (login, signup, password reset)
- [x] Implement auth state management with React context
- [x] Create protected routes in frontend
- [x] Set up database access controls (Row Level Security)
- [x] Associate matches with authenticated users
- [x] Make logout button functional

## Database & Data Integration
- [x] Fix the Matches page to pull data from PostgreSQL database
- [x] Ensure proper data synchronization between local state and database
- [ ] Optimize database queries for match and point data
- [x] Add session token to matches page
- [x] Check for better way of passing session token to API requests

## Shots Database & Integration
- [x] Consolidate database migrations into a clean structure
- [x] Move shots and categories into database tables
- [x] Update application to fetch shots from database
- [ ] Add admin interface for managing shots and categories
- [x] Update point recording to use shot IDs instead of names
- [x] Add shot statistics visualization based on database queries

## UI Improvements
- [x] Fix point history panel
- [x] Fix serve indicator styling
- [x] Fix blue button hover styling (blue background then text goes blue on hover)
- [ ] Update text and make consistent styles across interfaces

## Analysis & Visualizations
- [x] Create performance analytics dashboard
- [x] Implement "shot success rate" visualizations
- [x] Add match statistics summary view
- [x] Create visualization for "points lost by shot type"

## Bug Fixes
- [x] Fix Match Analysis queries showing No Data
- [x] Fix Shot Selection tabs displaying Shots instead of Categories
- [x] Fix most/least effective shots panels not displaying data in Match Analysis
- [x] Fix forehand/backhand columns not rendering in Shot Breakdown table

## Deployment
- [x] Refactor application to use Supabase Postgres API instead of Express
- [ ] Set up Vercel or Netifly for frontend deployment
- [ ] Create GitHub Actions workflow for CI/CD

## Other Improvements
- [ ] Mobile responsive design refinements
