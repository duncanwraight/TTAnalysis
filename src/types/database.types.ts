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

export type Set = {
  id: string;
  match_id: string;
  set_number: number;
  score: string;
  player_score: number;
  opponent_score: number;
  created_at: string;
  updated_at: string;
};

export type Point = {
  id: string;
  set_id: string;
  point_number: number;
  winner: 'player' | 'opponent';
  winning_shot: string; // Temporary for backwards compatibility 
  other_shot: string;   // Temporary for backwards compatibility
  winning_shot_id?: string; // UUID of the shot from shots table
  winning_hand?: 'fh' | 'bh';
  other_shot_id?: string;   // UUID of the shot from shots table
  other_hand?: 'fh' | 'bh';
  notes?: string;
  created_at: string;
};

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