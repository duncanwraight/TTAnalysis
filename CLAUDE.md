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

# Start Express API server
npm run server

# Start both API and frontend servers
npm run dev:all

# Reset database and apply latest migrations
supabase db reset

# Build for production
npm run build

# Lint the codebase
npm run lint

# Preview the production build
npm run preview
```

The `start-dev.sh` script handles:
1. Starting the local Supabase services (PostgreSQL, Auth, etc.)
2. Setting environment variables for the Express server
3. Creating a test user if one doesn't exist
4. Starting the development servers

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
- **Matches**: id, user_id, opponent_name, date, match_score, notes, initial_server
- **Sets**: id, match_id, set_number, score, player_score, opponent_score
- **Points**: id, set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes

The database uses PostgreSQL with Supabase for Auth and Row Level Security. The schema is defined in the `supabase/migrations` directory.

## Code Organization

- `/src/components`: Reusable UI components (Layout, PlayerPanel, ShotSelector, etc.)
- `/src/pages`: Main application pages/screens
- `/src/lib`: Utilities and external clients (Supabase)
- `/src/types`: TypeScript definitions for database entities
- `/src/styles`: Global CSS and stylesheets
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
  - For PostgreSQL direct connection:
    - `VITE_PG_HOST` - Database host (set by start-dev.sh)
    - `VITE_PG_PORT` - Database port (set by start-dev.sh)
    - `VITE_PG_DATABASE` - Database name (set by start-dev.sh)
    - `VITE_PG_USER` - Database user (set by start-dev.sh)
    - `VITE_PG_PASSWORD` - Database password (set by start-dev.sh)

- Use `./start-dev.sh` for local development, which sets up:
  - Local Supabase instance for authentication and database
  - Express API server for database access
  - React frontend with Vite
  - Test user creation if needed

- Mobile-first design for courtside usage during matches
- Express server handles direct PostgreSQL access
- Match deletion and creation are fully implemented
- Point recording uses shot IDs from the shots database