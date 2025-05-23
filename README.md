# Table Tennis Analysis Web App

A web application for tracking and analyzing table tennis matches, built with React, TypeScript, and Supabase.

## Features

- Record match details including opponent, date, and score
- Track individual points with shot analysis
- Visualize performance statistics
- Review match history

## Quick Start

```bash
# Install dependencies
npm install

# Start Supabase and frontend development server
./start-dev.sh

# Alternative: Start frontend only (requires Supabase to be running)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**IMPORTANT**: The Supabase local development environment must be running for the application to work correctly. The `start-dev.sh` script handles this for you.

## Project Structure

- `/src` - All application code
  - `/components` - Reusable UI components
    - `/ui` - Common UI components (Button, Card)
    - `/ShotSelector` - Shot selection components
  - `/pages` - Application pages
  - `/context` - React context providers
  - `/lib` - Utilities and Supabase client
  - `/types` - TypeScript definitions
  - `/styles` - CSS stylesheets
    - `/components` - Component-specific CSS
- `/docs` - Project documentation
- `/supabase` - Supabase configuration and migrations

## Component Architecture

### UI Components
- **Button**: Reusable button with primary, secondary, and outline variants
- **Card**: Container component with consistent styling
- **Layout**: Common application layout with header, main content, and footer
- **PlayerPanel**: Player representation for selection
- **ShotSelector**: Shot type selection with categories

### Pages
- **Home**: Application landing page
- **MatchList**: Overview of recorded matches
- **NewMatch**: Match creation form
- **MatchTracker**: Point-by-point match recording
- **MatchAnalysis**: Statistics and performance analysis

### State Management
- **MatchContext**: Centralized state for match tracking

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Custom CSS
- **Build Tool**: Vite

## Development Notes

- Mobile-first design for courtside usage
- Modular components for reusability
- Context-based state management for complex workflows
- CSS organization by component