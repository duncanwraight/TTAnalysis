export type User = {
  id: string;
  email: string;
  name?: string;
  preferences?: any;
};

export type Match = {
  id: string;
  user_id: string;
  opponent_name: string;
  date: string;
  match_score: string;
  notes?: string;
  created_at: string;
};

export type Set = {
  id: string;
  match_id: string;
  set_number: number;
  score: string;
};

export type Point = {
  id: string;
  set_id: string;
  point_number: number;
  winner: 'player' | 'opponent';
  winning_shot: string; // e.g., 'forehand', 'backhand'
  other_shot: string; // e.g., 'serve', 'loop'
  notes?: string;
};