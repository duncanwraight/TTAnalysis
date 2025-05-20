#!/bin/bash

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker exec ttanalysis-db pg_isready -U ttuser -d ttanalysis; do
  echo "PostgreSQL is not ready yet... waiting"
  sleep 2
done
echo "PostgreSQL is ready!"

# Start the development server with API server and frontend
echo "Starting development servers..."
npm run dev:all