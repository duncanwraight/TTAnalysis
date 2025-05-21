import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create PostgreSQL pool
const pool = new pg.Pool({
  host: process.env.VITE_PG_HOST,
  port: Number(process.env.VITE_PG_PORT),
  database: process.env.VITE_PG_DATABASE,
  user: process.env.VITE_PG_USER,
  password: process.env.VITE_PG_PASSWORD,
});

// Test database connection
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err);
  });

// API endpoints

// Matches
app.get('/api/matches', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM matches ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM matches WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

app.get('/api/matches/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get match
    const matchResult = await pool.query(
      'SELECT * FROM matches WHERE id = $1',
      [id]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const match = matchResult.rows[0];
    
    // Get sets
    const setsResult = await pool.query(
      'SELECT * FROM sets WHERE match_id = $1 ORDER BY set_number',
      [id]
    );
    
    const sets = setsResult.rows;
    
    // Get points
    let points = [];
    
    if (sets.length > 0) {
      const setIds = sets.map(set => set.id);
      
      const pointsResult = await pool.query(
        `SELECT * FROM points WHERE set_id = ANY($1) ORDER BY set_id, point_number`,
        [setIds]
      );
      
      points = pointsResult.rows;
    }
    
    res.json({ match, sets, points });
  } catch (error) {
    console.error('Error fetching full match data:', error);
    res.status(500).json({ error: 'Failed to fetch full match data' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const { user_id, opponent_name, date, match_score, notes, initial_server } = req.body;
    
    const result = await pool.query(
      `INSERT INTO matches (user_id, opponent_name, date, match_score, notes, initial_server) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [user_id, opponent_name, date, match_score, notes, initial_server]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

app.put('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { opponent_name, date, match_score, notes, initial_server } = req.body;
    
    // Create update query dynamically based on which fields are provided
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    if (opponent_name !== undefined) {
      updateFields.push(`opponent_name = $${paramCounter}`);
      values.push(opponent_name);
      paramCounter++;
    }
    
    if (date !== undefined) {
      updateFields.push(`date = $${paramCounter}`);
      values.push(date);
      paramCounter++;
    }
    
    if (match_score !== undefined) {
      updateFields.push(`match_score = $${paramCounter}`);
      values.push(match_score);
      paramCounter++;
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCounter}`);
      values.push(notes);
      paramCounter++;
    }
    
    if (initial_server !== undefined) {
      updateFields.push(`initial_server = $${paramCounter}`);
      values.push(initial_server);
      paramCounter++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE matches SET ${updateFields.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the match exists
    const checkResult = await pool.query(
      'SELECT id FROM matches WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Delete all associated data (cascade will handle this due to the foreign key constraints)
    const result = await pool.query(
      'DELETE FROM matches WHERE id = $1 RETURNING id',
      [id]
    );
    
    res.json({ message: 'Match deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Sets
app.get('/api/sets', async (req, res) => {
  try {
    const { match_id } = req.query;
    
    let query = 'SELECT * FROM sets';
    const values = [];
    
    if (match_id) {
      query += ' WHERE match_id = $1';
      values.push(match_id);
    }
    
    query += ' ORDER BY set_number';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

app.post('/api/sets', async (req, res) => {
  try {
    const { match_id, set_number, score, player_score, opponent_score } = req.body;
    
    const result = await pool.query(
      `INSERT INTO sets (match_id, set_number, score, player_score, opponent_score) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [match_id, set_number, score, player_score, opponent_score]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating set:', error);
    res.status(500).json({ error: 'Failed to create set' });
  }
});

app.put('/api/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, player_score, opponent_score } = req.body;
    
    // Create update query dynamically based on which fields are provided
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    if (score !== undefined) {
      updateFields.push(`score = $${paramCounter}`);
      values.push(score);
      paramCounter++;
    }
    
    if (player_score !== undefined) {
      updateFields.push(`player_score = $${paramCounter}`);
      values.push(player_score);
      paramCounter++;
    }
    
    if (opponent_score !== undefined) {
      updateFields.push(`opponent_score = $${paramCounter}`);
      values.push(opponent_score);
      paramCounter++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE sets SET ${updateFields.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// Points
app.get('/api/points', async (req, res) => {
  try {
    const { set_id } = req.query;
    
    let query = 'SELECT * FROM points';
    const values = [];
    
    if (set_id) {
      query += ' WHERE set_id = $1';
      values.push(set_id);
    }
    
    query += ' ORDER BY point_number';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Helper function to get shot by name
async function getShotIdByName(shotName) {
  if (!shotName || shotName === 'no_data') {
    return null;
  }
  
  try {
    const result = await pool.query(
      'SELECT id FROM shots WHERE name = $1 LIMIT 1',
      [shotName]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shot ID:', error);
    return null;
  }
}

app.post('/api/points', async (req, res) => {
  try {
    const { set_id, point_number, winner, winning_shot, other_shot, notes } = req.body;
    
    // Parse shot data to separate hand and shot name
    let winning_hand = null;
    let winning_shot_name = null;
    let other_hand = null;
    let other_shot_name = null;
    
    if (winning_shot && winning_shot !== 'no_data') {
      const parts = winning_shot.split('_');
      winning_hand = parts[0]; // 'fh' or 'bh'
      // Join the rest in case shot names contain underscores
      winning_shot_name = parts.slice(1).join('_');
    }
    
    if (other_shot && other_shot !== 'no_data') {
      const parts = other_shot.split('_');
      other_hand = parts[0]; // 'fh' or 'bh'
      // Join the rest in case shot names contain underscores
      other_shot_name = parts.slice(1).join('_');
    }
    
    // Look up shot IDs from the database based on names
    const winning_shot_id = await getShotIdByName(winning_shot_name);
    const other_shot_id = await getShotIdByName(other_shot_name);
    
    // For now, handle the case where shots might not be in the database yet
    // In the future, we'll update the frontend to use proper shot IDs
    
    const result = await pool.query(
      `INSERT INTO points (set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating point:', error);
    res.status(500).json({ error: 'Failed to create point' });
  }
});

app.delete('/api/points/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM points WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Point not found' });
    }
    
    res.json({ message: 'Point deleted successfully' });
  } catch (error) {
    console.error('Error deleting point:', error);
    res.status(500).json({ error: 'Failed to delete point' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});