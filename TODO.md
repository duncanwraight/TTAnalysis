# TTAnalysis Project TODOs

## Database & Data Integration
- [x] Fix the Matches page to pull data from PostgreSQL database
- [x] Ensure proper data synchronization between local state and database
- [ ] Optimize database queries for match and point data

## Authentication (Self-Hosted Supabase Auth)
- [ ] Setup Supabase CLI for local development
- [ ] Initialize local Supabase project connected to PostgreSQL database
- [ ] Test connection between Supabase Auth and local database
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