# TTAnalysis Project TODOs

## Authentication (Self-Hosted Supabase Auth)
- [x] Setup Supabase CLI for local development
- [x] Initialize local Supabase project connected to PostgreSQL database
- [x] Test connection between Supabase Auth and local database
- [x] Create Auth UI components (login, signup, password reset)
- [x] Implement auth state management with React context
- [x] Create protected routes in frontend
- [x] Implement JWT verification middleware in Express server
- [x] Update API endpoints to use authenticated user_id
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
- [ ] Add shot statistics visualization based on database queries

## UI Improvements
- [x] Fix point history panel
- [x] Fix serve indicator styling
- [x] Fix blue button hover styling (blue background then text goes blue on hover)
- [ ] Update text and make consistent styles across interfaces

## Analysis & Visualizations
- [ ] Create performance analytics dashboard
- [ ] Implement "shot success rate" visualizations
- [ ] Add match statistics summary view
- [ ] Create visualization for "points lost by shot type"

## Deployment
- [ ] Prepare for hosting with PostgreSQL backend
- [ ] Set up Supabase hosting (final step)
- [ ] Configure deployment pipelines
- [ ] Implement environment variable management for production

## Other Improvements
- [ ] Mobile responsive design refinements
- [ ] Add offline mode with sync when connection restored
