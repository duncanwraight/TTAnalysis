/* User Data Types */
export type User = {
  id: string;
  email: string;
  name?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

/* Match Data Types */
export type Match = {
  id: string;
  user_id: string;
  opponent_name: string;
  // Who the analysis is about. Empty on older matches, which are the account owner's own
  player_name?: string | null;
  // Free text, e.g. "Winter 2026/27 league"
  event?: string | null;
  // http(s) link to the match video
  video_url?: string | null;
  date: string;
  match_score: string;
  notes?: string;
  initial_server?: 'player' | 'opponent';
  best_of: number;
  share_token: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type MatchSet = {
  id: string;
  match_id: string;
  set_number: number;
  score: string;
  player_score: number;
  opponent_score: number;
  created_at: string;
  updated_at: string;
};

/* Point and Scoring Types */
export type Point = {
  id: string;
  set_id: string;
  match_id: string; // Added match_id as required by database schema
  point_number: number;
  winner: 'player' | 'opponent';
  winning_shot_id: string; // Required by database schema
  winning_hand?: 'fh' | 'bh';
  other_shot_id: string;   // Required by database schema
  other_hand?: 'fh' | 'bh';
  notes?: string;
  is_lucky_shot?: boolean; // Tracks whether the winning shot was lucky (e.g., hit net or edge)
  is_unforced_error?: boolean; // The losing shot was a mistake the winner didn't force
  created_at: string;
};

/* Shot Information Type for UI */
export type ShotInfo = {
  shotId: string; // Database UUID
  hand: 'fh' | 'bh';
  isLucky?: boolean; // Whether this shot was lucky (hit net/edge)
};

/* Shot Classification Types */
export type ShotCategory = {
  id: string;
  name: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

export type Shot = {
  id: string;
  category_id: string;
  name: string;
  display_name: string;
  display_order: number;
  description?: string;
  // Shot guide for the AI summary; see src/lib/shotGuide.ts
  check_qualities?: string[];
  technical_notes?: string | null;
  // Shot balance role; null leaves the shot out. See Role in src/lib/analysis.ts
  role?: 'attack' | 'control' | 'defence' | null;
  created_at?: string;
  updated_at?: string;
};