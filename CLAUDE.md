# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTAnalysis is a table tennis match analysis web application built using React, TypeScript, and Supabase. The app allows users to track table tennis matches, record point-by-point details including shot types, and analyze performance statistics.

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint the codebase
npm run lint

# Preview the production build
npm run preview
```

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

- **Matches**: id, user_id, opponent_name, date, match_score, notes, initial_server
- **Sets**: id, match_id, set_number, score
- **Points**: id, set_id, point_number, winner, winning_shot, other_shot, notes
- **Users**: id, email, name, preferences (managed by Supabase Auth)

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

- The application uses environment variables for Supabase configuration:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Current implementation uses localStorage for data persistence before fully integrating with Supabase
- Mobile-first design for courtside usage during matches