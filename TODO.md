# TTAnalysis Project TODOs

## Database & Data Integration
- [x] Fix the Matches page to pull data from PostgreSQL database
- [x] Ensure proper data synchronization between local state and database
- [ ] Optimize database queries for match and point data

## Authentication (Self-Hosted Supabase Auth)
- [x] Setup Supabase CLI for local development
- [x] Initialize local Supabase project connected to PostgreSQL database
- [x] Test connection between Supabase Auth and local database
- [x] Consolidate database migrations into a clean structure
- [x] Move shots and categories into database tables
- [x] Update application to fetch shots from database
- [ ] Create Auth UI components (login, signup, password reset)
- [ ] Implement auth state management with React context
- [ ] Create protected routes in frontend
- [ ] Implement JWT verification middleware in Express server
- [ ] Update API endpoints to use authenticated user_id
- [ ] Set up database access controls (Row Level Security)
- [ ] Associate matches with authenticated users

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