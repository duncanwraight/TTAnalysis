export type User = {
  id: string;
  email: string;
  name?: string;
  preferences?: any;
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
  winning_shot: string; // e.g., 'forehand', 'backhand'
  other_shot: string; // e.g., 'serve', 'loop'
  notes?: string;
  created_at: string;
};