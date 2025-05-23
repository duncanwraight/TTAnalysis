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
  date: string;
  match_score: string;
  notes?: string;
  initial_server?: 'player' | 'opponent';
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
  created_at: string;
};

/* Shot Information Type for UI */
export type ShotInfo = {
  shotId: string; // Database UUID
  hand: 'fh' | 'bh';
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
  created_at?: string;
  updated_at?: string;
};