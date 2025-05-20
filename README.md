# Table Tennis Analysis Web App

A web application for tracking and analyzing table tennis matches, built with React, TypeScript, and Supabase.

## Features

- Record match details including opponent, date, and score
- Track individual points with shot analysis
- Visualize performance statistics
- Review match history

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Custom CSS

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Supabase credentials
4. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Application pages
- `/src/lib` - Utilities and Supabase client
- `/src/types` - TypeScript definitions
- `/src/styles` - CSS stylesheets

## Deployment

Follow the instructions in DEPLOYMENT.md to deploy the application to Supabase hosting.