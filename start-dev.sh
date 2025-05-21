#!/bin/bash

# Start Supabase services (which includes PostgreSQL)
echo "Starting Supabase services..."
supabase start

# Verify Supabase is running
echo "Verifying Supabase services..."
if supabase status | grep -q "PostgreSQL.*online"; then
  echo "Supabase is running!"
else
  echo "Supabase services might not be fully online. Check with 'supabase status'"
fi

# Update .env file with correct database connection details for Express server
# These values match Supabase's default PostgreSQL configuration
echo "Updating connection settings for Express server..."
# Set environment variables for direct connection to Supabase PostgreSQL
export VITE_PG_HOST=localhost
export VITE_PG_PORT=54322
export VITE_PG_DATABASE=postgres
export VITE_PG_USER=postgres
export VITE_PG_PASSWORD=postgres

# Start the development server with API server and frontend
echo "Starting development servers..."
npm run dev:all