import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Create Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminSupabase;
if (supabaseUrl && supabaseServiceKey) {
  adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('Missing Supabase credentials for admin operations');
}

// JWT Auth middleware
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Bearer token is required' });
  }
  
  try {
    if (!adminSupabase) {
      throw new Error('Supabase admin client not configured');
    }
    
    // Verify the JWT token with Supabase
    const { data, error } = await adminSupabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
    }
    
    if (!data || !data.user) {
      return res.status(401).json({ error: 'No user associated with this token' });
    }
    
    const user = data.user;
    
    // Add user to request object
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Failed to authenticate token',
      message: error.message 
    });
  }
};

// Set user as admin
app.post('/api/set-admin', authenticateJWT, async (req, res) => {
  const { adminKey } = req.body;
  const userId = req.user.id;
  
  // Verify admin key
  const correctAdminKey = process.env.VITE_ADMIN_REGISTRATION_KEY;
  
  if (!correctAdminKey || adminKey !== correctAdminKey) {
    return res.status(403).json({ error: 'Invalid admin registration key' });
  }
  
  try {
    if (!adminSupabase) {
      throw new Error('Supabase admin client not configured');
    }
    
    // Set the is_admin flag to true for the user
    const { error } = await pool.query(
      'UPDATE profiles SET is_admin = true WHERE id = $1',
      [userId]
    );
    
    if (error) {
      return res.status(500).json({ error: 'Failed to set admin status' });
    }
    
    res.status(200).json({ success: true, message: 'Admin status set successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoints

// Test authentication endpoint
app.get('/api/test/auth', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing authentication header',
      message: 'Please provide a Bearer token in the Authorization header'
    });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Invalid authorization format', 
      message: 'Expected format: "Bearer YOUR_TOKEN"'
    });
  }
  
  try {
    if (!adminSupabase) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Supabase admin client not configured'
      });
    }
    
    // Try to get user info with the token
    const { data, error } = await adminSupabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({ 
        error: 'Invalid token', 
        message: error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Shot data endpoints
app.get('/api/shots/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shot_categories ORDER BY display_order ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shot categories' });
  }
});

app.get('/api/shots', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shots ORDER BY display_order ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shots' });
  }
});

// Add debug logging middleware for match creation
app.use('/api/matches', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('POST /api/matches request received at', new Date().toISOString());
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    // Track original end method
    const originalEnd = res.end;
    const chunks = [];
    
    // Override end method to capture response
    res.end = function(chunk) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      
      const body = Buffer.concat(chunks).toString('utf8');
      console.log('Response for POST /api/matches:', {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        body: body.length < 1000 ? body : body.substring(0, 1000) + '... [truncated]'
      });
      
      // Call original end method
      originalEnd.apply(res, arguments);
    };
    
    // Continue to next middleware
    next();
  } else {
    next();
  }
});

// Secure all data endpoints with JWT middleware
app.use('/api/matches', authenticateJWT);
app.use('/api/sets', authenticateJWT);
app.use('/api/points', authenticateJWT);

// Matches
app.get('/api/matches', async (req, res) => {
  try {
    // Filter matches by the authenticated user
    const result = await pool.query(
      'SELECT * FROM matches WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

app.get('/api/matches/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get match
    const matchResult = await pool.query(
      'SELECT * FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
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
    res.status(500).json({ error: 'Failed to fetch full match data' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const { opponent_name, date, match_score, notes, initial_server } = req.body;
    
    // Validate required fields
    if (!opponent_name) {
      return res.status(400).json({ error: 'Opponent name is required' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    if (!initial_server || !['player', 'opponent'].includes(initial_server)) {
      return res.status(400).json({ error: 'Valid initial server is required (player or opponent)' });
    }
    
    // Use the authenticated user's ID
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO matches (user_id, opponent_name, date, match_score, notes, initial_server) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, opponent_name, date, match_score, notes, initial_server]
    );
    
    if (result.rows && result.rows.length > 0) {
      return res.status(201).json(result.rows[0]);
    } else {
      return res.status(500).json({ error: 'Database query succeeded but no rows returned' });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create match',
      message: error.message
    });
  }
});

app.put('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { opponent_name, date, match_score, notes, initial_server } = req.body;
    
    // First check if the match belongs to the authenticated user
    const checkResult = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
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
    values.push(req.user.id);
    
    const result = await pool.query(
      `UPDATE matches SET ${updateFields.join(', ')} WHERE id = $${paramCounter} AND user_id = $${paramCounter + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update match' });
  }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the match exists and belongs to the authenticated user
    const checkResult = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
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
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Sets
app.get('/api/sets', async (req, res) => {
  try {
    const { match_id } = req.query;
    
    let query = `
      SELECT s.* FROM sets s
      JOIN matches m ON s.match_id = m.id
      WHERE m.user_id = $1
    `;
    const values = [req.user.id];
    
    if (match_id) {
      query += ' AND s.match_id = $2';
      values.push(match_id);
    }
    
    query += ' ORDER BY s.set_number';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

app.post('/api/sets', async (req, res) => {
  try {
    const { match_id, set_number, score, player_score, opponent_score } = req.body;
    
    // Verify that the match belongs to the authenticated user
    const matchCheck = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND user_id = $2',
      [match_id, req.user.id]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const result = await pool.query(
      `INSERT INTO sets (match_id, set_number, score, player_score, opponent_score) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [match_id, set_number, score, player_score, opponent_score]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create set' });
  }
});

app.put('/api/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, player_score, opponent_score } = req.body;
    
    // Verify the set belongs to a match owned by the authenticated user
    const setCheck = await pool.query(
      `SELECT s.id FROM sets s
       JOIN matches m ON s.match_id = m.id
       WHERE s.id = $1 AND m.user_id = $2`,
      [id, req.user.id]
    );
    
    if (setCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
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
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// Points
app.get('/api/points', async (req, res) => {
  try {
    const { set_id } = req.query;
    
    let query = `
      SELECT p.* FROM points p
      JOIN sets s ON p.set_id = s.id
      JOIN matches m ON s.match_id = m.id
      WHERE m.user_id = $1
    `;
    const values = [req.user.id];
    
    if (set_id) {
      query += ' AND p.set_id = $2';
      values.push(set_id);
    }
    
    query += ' ORDER BY p.point_number';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
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
    return null;
  }
}

app.post('/api/points', async (req, res) => {
  try {
    const { set_id, point_number, winner, winning_shot, other_shot, notes } = req.body;
    
    // Verify the set belongs to a match owned by the authenticated user
    const setCheck = await pool.query(
      `SELECT s.id FROM sets s
       JOIN matches m ON s.match_id = m.id
       WHERE s.id = $1 AND m.user_id = $2`,
      [set_id, req.user.id]
    );
    
    if (setCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }
    
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
    
    const result = await pool.query(
      `INSERT INTO points (set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create point' });
  }
});

app.delete('/api/points/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the point belongs to a set of a match owned by the authenticated user
    const pointCheck = await pool.query(
      `SELECT p.id FROM points p
       JOIN sets s ON p.set_id = s.id
       JOIN matches m ON s.match_id = m.id
       WHERE p.id = $1 AND m.user_id = $2`,
      [id, req.user.id]
    );
    
    if (pointCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Point not found' });
    }
    
    const result = await pool.query(
      'DELETE FROM points WHERE id = $1 RETURNING id',
      [id]
    );
    
    res.json({ message: 'Point deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete point' });
  }
});

// Default route for testing
app.get('/api', (req, res) => {
  const envInfo = {
    SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    API_PORT: process.env.API_PORT || '3001 (default)',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  res.json({ 
    message: 'API running', 
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: !!adminSupabase ? 'configured' : 'not configured',
    env: envInfo
  });
});

// Debug route for testing the database connection
app.get('/api/debug/db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    // Test database connection with a simple query
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result.rows[0].now,
      connectionConfig: {
        host: process.env.VITE_PG_HOST,
        port: process.env.VITE_PG_PORT,
        database: process.env.VITE_PG_DATABASE,
        user: process.env.VITE_PG_USER,
        // Don't send password in response
      }
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      connectionConfig: {
        host: process.env.VITE_PG_HOST,
        port: process.env.VITE_PG_PORT, 
        database: process.env.VITE_PG_DATABASE,
        user: process.env.VITE_PG_USER,
        // Don't send password in response
      }
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});