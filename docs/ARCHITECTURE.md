# TTAnalysis Application Architecture

This document provides an overview of the TTAnalysis application architecture and key design decisions.

## Component Structure

### Core UI Components

#### `Button`
A reusable button component with multiple variants:
- Primary (filled with primary color)
- Secondary (filled with secondary color)
- Outline (border only)

Properties include:
- variant
- onClick handler
- disabled state
- custom classes

#### `Card`
A container component for consistent styling:
- Standardized border radius
- Box shadow
- Padding

#### `PlayerPanel`
Player representation component for match tracking:
- Displays player avatar and name
- Different styling for player vs opponent
- Click handler for selection

#### `Layout`
Common application layout:
- Header with navigation
- Main content area
- Footer

### Specialized Components

#### `ShotSelector`
A complex component for selecting shot types, split into smaller parts:
- `ShotCategory.tsx` - Category tabs
- `ShotItem.tsx` - Individual shot options with FH/BH variants
- `ShotList.tsx` - List of available shots
- `types.ts` - TypeScript types and constants

#### `ScoreBoard`
Displays match score and current server.

#### `PointHistory`
Visual representation of point sequence.

## State Management

### `MatchContext`
Centralized state for match tracking:
- Current score
- Set history
- Point sequence
- Server tracking
- Point recording flow

Key functionality:
- `handlePlayerSelect` - When a player wins a point
- `handleShotSelect` - For recording shot types
- `recordPoint` - Finalizes point recording
- `undoLastPoint` - Removes the last recorded point

## Data Flow

1. User creates a new match via `NewMatch` form
2. User records points in `MatchTracker` page:
   - Select point winner (player/opponent)
   - Select winning shot type
   - Select other shot type
3. Points are recorded and visualized
4. Match analysis is shown in `MatchAnalysis` page

## CSS Organization

- Global variables in `:root` (colors, spacing, etc.)
- Component-specific CSS files in `/styles/components/`
- Responsive design using media queries
- Common patterns extracted to shared styles

## Key Design Decisions

1. **Component Composition**: Breaking down complex UI into smaller, focused components
2. **Context for State**: Using React Context for complex state management
3. **CSS Organization**: Component-specific CSS files for better maintainability
4. **TypeScript Types**: Shared types for consistent data handling
5. **Mobile-First Design**: Optimized for courtside usage on mobile devices

## Future Architecture Improvements

1. **Custom Hooks**: Extract common logic into reusable hooks
2. **Supabase Integration**: Full backend integration with proper data synchronization
3. **Error Handling**: Comprehensive error boundaries and error states
4. **Testing Strategy**: Component and integration tests
5. **Performance Optimization**: Memoization and lazy loading