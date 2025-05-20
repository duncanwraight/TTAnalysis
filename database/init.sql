-- Initialize TTAnalysis Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches Table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    match_score VARCHAR(50) DEFAULT '0-0',
    notes TEXT,
    initial_server VARCHAR(10) CHECK (initial_server IN ('player', 'opponent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sets Table
CREATE TABLE sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    score VARCHAR(50) NOT NULL DEFAULT '0-0',
    player_score INTEGER NOT NULL DEFAULT 0,
    opponent_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, set_number)
);

-- Points Table
CREATE TABLE points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    winner VARCHAR(10) NOT NULL CHECK (winner IN ('player', 'opponent')),
    winning_shot VARCHAR(50) NOT NULL,
    other_shot VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(set_id, point_number)
);

-- Indexes
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_sets_match_id ON sets(match_id);
CREATE INDEX idx_points_set_id ON points(set_id);

-- Insert test user for development
INSERT INTO users (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating the updated_at timestamp
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sets_updated_at
BEFORE UPDATE ON sets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();