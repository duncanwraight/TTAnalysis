#!/bin/bash

# Start Supabase services (which includes PostgreSQL)
echo "Starting Supabase services..."
supabase start

# Verify Supabase is running
echo "Verifying Supabase services..."
if supabase status | grep -q "PostgreSQL.*online"; then
  echo "Supabase is running!"
  
  # Check if test user exists, if not run seed file
  echo "Checking if test user exists..."
  CONTAINER_ID=$(docker ps | grep supabase_db_TTAnalysis | awk '{print $1}')
  
  if [ -z "$CONTAINER_ID" ]; then
    echo "Postgres container not found"
  else
    # Check if test user exists
    USER_EXISTS=$(docker exec -i "$CONTAINER_ID" psql -U postgres -t -c "SELECT count(*) FROM auth.users WHERE id='00000000-0000-0000-0000-000000000001';" | tr -d '[:space:]')
    
    if [ "$USER_EXISTS" = "0" ]; then
      echo "Test user not found. Running seed SQL to create test user..."
      cat "$(dirname "$0")/supabase/seed.sql" | docker exec -i "$CONTAINER_ID" psql -U postgres
      echo "Seed completed. Test user created."
    else
      echo "Test user already exists."
    fi
  fi
else
  echo "Supabase services might not be fully online. Check with 'supabase status'"
fi

# Start the frontend development server
echo "Starting frontend development server..."
npm run dev