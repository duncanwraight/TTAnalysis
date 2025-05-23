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

// Match analysis endpoint
app.get('/api/matches/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the match belongs to the authenticated user
    const matchCheck = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or access denied' });
    }

    // Get all points with detailed shot and category information
    const pointsResult = await pool.query(`
      SELECT 
        p.winner, 
        p.winning_shot_id, 
        p.other_shot_id,
        p.winning_hand,
        p.other_hand,
        s.display_name as winning_shot_name, 
        o.display_name as other_shot_name,
        sc_w.name as winning_shot_category,
        sc_o.name as other_shot_category,
        st.set_number
      FROM points p
      JOIN sets st ON p.set_id = st.id
      LEFT JOIN shots s ON p.winning_shot_id = s.id
      LEFT JOIN shots o ON p.other_shot_id = o.id
      LEFT JOIN shot_categories sc_w ON s.category_id = sc_w.id
      LEFT JOIN shot_categories sc_o ON o.category_id = sc_o.id
      WHERE st.match_id = $1
      ORDER BY st.set_number, p.point_number
    `, [id]);
    
    const allPoints = pointsResult.rows;
    
    if (allPoints.length === 0) {
      return res.json({
        mostEffectiveShots: { error: 'No data' },
        mostCostlyShots: { error: 'No data' },
        shotDistribution: { error: 'No data' },
        setBreakdown: { error: 'No data' },
        categoryBreakdown: { error: 'No data' },
        tacticalInsights: { error: 'No data' },
        handAnalysis: { error: 'No data' },
        matchSummary: { error: 'No data' }
      });
    }

    // 1. Most effective shots (player wins with win percentage)
    const playerWinPoints = allPoints.filter(p => p.winner === 'player');
    const totalPlayerWins = playerWinPoints.length;
    
    const effectiveCounts = {};
    playerWinPoints
      .filter(p => p.winning_shot_name)
      .forEach(p => {
        effectiveCounts[p.winning_shot_name] = (effectiveCounts[p.winning_shot_name] || 0) + 1;
      });
    
    const mostEffectiveShots = Object.keys(effectiveCounts).length > 0 
      ? { data: Object.entries(effectiveCounts)
          .map(([name, wins]) => ({ 
            name, 
            wins, 
            win_percentage: totalPlayerWins > 0 ? Math.round((wins / totalPlayerWins) * 100) : 0
          }))
          .sort((a, b) => b.wins - a.wins) }
      : { error: 'No data' };
    
    // 2. Most costly shots (player loses)
    const playerLossPoints = allPoints.filter(p => p.winner === 'opponent');
    const totalPlayerLosses = playerLossPoints.length;
    
    const costlyCounts = {};
    playerLossPoints
      .filter(p => p.other_shot_name)
      .forEach(p => {
        costlyCounts[p.other_shot_name] = (costlyCounts[p.other_shot_name] || 0) + 1;
      });
    
    const mostCostlyShots = Object.keys(costlyCounts).length > 0 
      ? { data: Object.entries(costlyCounts)
          .map(([name, losses]) => ({ 
            name, 
            losses, 
            loss_percentage: totalPlayerLosses > 0 ? Math.round((losses / totalPlayerLosses) * 100) : 0
          }))
          .sort((a, b) => b.losses - a.losses) }
      : { error: 'No data' };

    // 3. Shot distribution (all shots played by user)
    const userShots = [];
    allPoints.forEach(p => {
      if (p.winner === 'player' && p.winning_shot_name) {
        userShots.push({ name: p.winning_shot_name, result: 'win' });
      }
      if (p.winner === 'opponent' && p.other_shot_name) {
        userShots.push({ name: p.other_shot_name, result: 'loss' });
      }
    });
    
    const shotDistCounts = {};
    userShots.forEach(shot => {
      if (!shotDistCounts[shot.name]) {
        shotDistCounts[shot.name] = { total: 0, wins: 0, losses: 0 };
      }
      shotDistCounts[shot.name].total++;
      if (shot.result === 'win') shotDistCounts[shot.name].wins++;
      if (shot.result === 'loss') shotDistCounts[shot.name].losses++;
    });
    
    const shotDistribution = Object.keys(shotDistCounts).length > 0
      ? { data: Object.entries(shotDistCounts)
          .map(([name, stats]) => ({
            name,
            total_shots: stats.total,
            percentage_of_total: userShots.length > 0 ? Math.round((stats.total / userShots.length) * 100) : 0,
            success_rate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0
          }))
          .sort((a, b) => b.total_shots - a.total_shots) }
      : { error: 'No data' };

    // 4. Set breakdown (how winning shots changed between sets)
    const setBreakdownData = {};
    playerWinPoints.forEach(p => {
      if (p.winning_shot_name) {
        const setNum = p.set_number;
        if (!setBreakdownData[setNum]) setBreakdownData[setNum] = {};
        setBreakdownData[setNum][p.winning_shot_name] = (setBreakdownData[setNum][p.winning_shot_name] || 0) + 1;
      }
    });
    
    const setBreakdown = Object.keys(setBreakdownData).length > 0
      ? { data: Object.entries(setBreakdownData)
          .flatMap(([setNum, shots]) => 
            Object.entries(shots).map(([shotName, wins]) => ({
              set_number: parseInt(setNum),
              shot_name: shotName,
              wins_in_set: wins
            }))
          )
          .sort((a, b) => a.set_number - b.set_number || b.wins_in_set - a.wins_in_set) }
      : { error: 'No data' };

    // 5. Category breakdown (performance by shot category)
    const categoryStats = {};
    userShots.forEach(shot => {
      // Find category for this shot
      const point = allPoints.find(p => 
        (p.winner === 'player' && p.winning_shot_name === shot.name) ||
        (p.winner === 'opponent' && p.other_shot_name === shot.name)
      );
      
      let category;
      if (point?.winner === 'player' && point.winning_shot_name === shot.name) {
        category = point.winning_shot_category;
      } else if (point?.winner === 'opponent' && point.other_shot_name === shot.name) {
        category = point.other_shot_category;
      }
      
      if (category) {
        if (!categoryStats[category]) {
          categoryStats[category] = { total: 0, wins: 0, losses: 0 };
        }
        categoryStats[category].total++;
        if (shot.result === 'win') categoryStats[category].wins++;
        if (shot.result === 'loss') categoryStats[category].losses++;
      }
    });
    
    const categoryBreakdown = Object.keys(categoryStats).length > 0
      ? { data: Object.entries(categoryStats)
          .map(([category, stats]) => ({
            category,
            total_shots: stats.total,
            percentage_of_total: userShots.length > 0 ? Math.round((stats.total / userShots.length) * 100) : 0,
            wins: stats.wins,
            losses: stats.losses,
            success_rate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0
          }))
          .sort((a, b) => b.total_shots - a.total_shots) }
      : { error: 'No data' };

    // 6. Tactical insights (performance against opponent shot types)
    const opponentShotStats = {};
    allPoints.forEach(p => {
      let opponentShot;
      if (p.winner === 'player' && p.other_shot_name) {
        opponentShot = p.other_shot_name;
        if (!opponentShotStats[opponentShot]) {
          opponentShotStats[opponentShot] = { encounters: 0, wins: 0, losses: 0 };
        }
        opponentShotStats[opponentShot].encounters++;
        opponentShotStats[opponentShot].wins++;
      } else if (p.winner === 'opponent' && p.winning_shot_name) {
        opponentShot = p.winning_shot_name;
        if (!opponentShotStats[opponentShot]) {
          opponentShotStats[opponentShot] = { encounters: 0, wins: 0, losses: 0 };
        }
        opponentShotStats[opponentShot].encounters++;
        opponentShotStats[opponentShot].losses++;
      }
    });
    
    const tacticalInsights = Object.keys(opponentShotStats).length > 0
      ? { data: Object.entries(opponentShotStats)
          .filter(([_, stats]) => stats.encounters >= 2) // Only show patterns with 2+ encounters
          .map(([opponentShot, stats]) => ({
            opponent_shot: opponentShot,
            total_encounters: stats.encounters,
            wins: stats.wins,
            losses: stats.losses,
            win_percentage: stats.encounters > 0 ? Math.round((stats.wins / stats.encounters) * 100) : 0
          }))
          .sort((a, b) => b.total_encounters - a.total_encounters) }
      : { error: 'No data' };

    // 7. Hand analysis (forehand vs backhand performance)
    const handStats = { fh: { total: 0, wins: 0, losses: 0 }, bh: { total: 0, wins: 0, losses: 0 } };
    
    allPoints.forEach(p => {
      if (p.winner === 'player' && p.winning_hand && (p.winning_hand === 'fh' || p.winning_hand === 'bh')) {
        handStats[p.winning_hand].total++;
        handStats[p.winning_hand].wins++;
      }
      if (p.winner === 'opponent' && p.other_hand && (p.other_hand === 'fh' || p.other_hand === 'bh')) {
        handStats[p.other_hand].total++;
        handStats[p.other_hand].losses++;
      }
    });
    
    const handAnalysis = (handStats.fh.total > 0 || handStats.bh.total > 0)
      ? { data: ['fh', 'bh']
          .filter(hand => handStats[hand].total > 0)
          .map(hand => ({
            hand,
            total_shots: handStats[hand].total,
            wins: handStats[hand].wins,
            losses: handStats[hand].losses,
            success_rate: handStats[hand].total > 0 ? Math.round((handStats[hand].wins / handStats[hand].total) * 100) : 0
          }))
          .sort((a, b) => b.total_shots - a.total_shots) }
      : { error: 'No data' };

    // 8. Match summary
    const matchResult = await pool.query(
      'SELECT opponent_name, date, match_score FROM matches WHERE id = $1',
      [id]
    );
    
    const matchData = matchResult.rows[0];
    const pointsWon = allPoints.filter(p => p.winner === 'player').length;
    const pointsLost = allPoints.filter(p => p.winner === 'opponent').length;
    
    const matchSummary = { 
      data: [{
        opponent_name: matchData.opponent_name,
        date: matchData.date,
        match_score: matchData.match_score,
        total_points: allPoints.length,
        points_won: pointsWon,
        points_lost: pointsLost,
        points_win_percentage: allPoints.length > 0 ? Math.round((pointsWon / allPoints.length) * 100) : 0
      }]
    };
    
    res.json({
      mostEffectiveShots,
      mostCostlyShots,
      shotDistribution,
      setBreakdown,
      categoryBreakdown,
      tacticalInsights,
      handAnalysis,
      matchSummary
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    // Enhanced debug logging
    console.log('Creating point with data (BEGIN):');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Creating point with data (END)');
    
    const { set_id, point_number, winner, notes } = req.body;
    
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
    
    // Initialize variables for shot data
    let winning_shot_id = null;
    let winning_hand = null;
    let other_shot_id = null;
    let other_hand = null;
    
    // Check if direct shot IDs are provided (ShotInfo format from client)
    if (req.body.winning_shot_id !== undefined) {
      console.log('Using direct winning_shot_id:', req.body.winning_shot_id);
      
      // Check if it's a valid UUID
      const isValidWinningUuid = req.body.winning_shot_id && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.winning_shot_id);
      
      // Skip UUID validation for special "no data" case
      const isNoDataUuid = req.body.winning_shot_id === '00000000-0000-0000-0000-000000000000';
      
      if (isValidWinningUuid || isNoDataUuid) {
        winning_shot_id = req.body.winning_shot_id;
        winning_hand = req.body.winning_hand;
        console.log('Valid winning shot ID provided:', winning_shot_id, winning_hand);
      } else {
        console.warn('Invalid winning shot ID format:', req.body.winning_shot_id);
        // Set to null to avoid database errors
        winning_shot_id = null;
      }
    } 
    
    if (req.body.other_shot_id !== undefined) {
      console.log('Using direct other_shot_id:', req.body.other_shot_id);
      
      // Check if it's a valid UUID
      const isValidOtherUuid = req.body.other_shot_id && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.other_shot_id);
      
      // Skip UUID validation for special "no data" case
      const isNoDataUuid = req.body.other_shot_id === '00000000-0000-0000-0000-000000000000';
      
      if (isValidOtherUuid || isNoDataUuid) {
        other_shot_id = req.body.other_shot_id;
        other_hand = req.body.other_hand;
        console.log('Valid other shot ID provided:', other_shot_id, other_hand);
      } else {
        console.warn('Invalid other shot ID format:', req.body.other_shot_id);
        // Set to null to avoid database errors
        other_shot_id = null;
      }
    }
    
    // Fallback to string format if direct IDs are not provided (legacy support)
    if (winning_shot_id === null && req.body.winning_shot) {
      console.log('Parsing winning_shot string:', req.body.winning_shot);
      if (req.body.winning_shot !== 'no_data') {
        const parts = req.body.winning_shot.split('_');
        winning_hand = parts[0]; // 'fh' or 'bh'
        // Join the rest in case shot names contain underscores
        const winning_shot_name = parts.slice(1).join('_');
        winning_shot_id = await getShotIdByName(winning_shot_name);
      }
    }
    
    if (other_shot_id === null && req.body.other_shot) {
      console.log('Parsing other_shot string:', req.body.other_shot);
      if (req.body.other_shot !== 'no_data') {
        const parts = req.body.other_shot.split('_');
        other_hand = parts[0]; // 'fh' or 'bh'
        // Join the rest in case shot names contain underscores
        const other_shot_name = parts.slice(1).join('_');
        other_shot_id = await getShotIdByName(other_shot_name);
      }
    }
    
    // If we're using the special "no data" UUID, set it to null for database storage
    if (winning_shot_id === '00000000-0000-0000-0000-000000000000') {
      winning_shot_id = null;
    }
    
    if (other_shot_id === '00000000-0000-0000-0000-000000000000') {
      other_shot_id = null;
    }
    
    console.log('Inserting point with values:', {
      set_id,
      point_number,
      winner,
      winning_shot_id,
      winning_hand,
      other_shot_id,
      other_hand,
      notes
    });
    
    const result = await pool.query(
      `INSERT INTO points (set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [set_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand, notes]
    );
    
    // Include detailed return information for debugging
    const pointResult = result.rows[0];
    console.log('Point created successfully with ID:', pointResult.id);
    console.log('Point data stored in database:', {
      id: pointResult.id,
      set_id: pointResult.set_id,
      point_number: pointResult.point_number,
      winner: pointResult.winner,
      winning_shot_id: pointResult.winning_shot_id,
      winning_hand: pointResult.winning_hand,
      other_shot_id: pointResult.other_shot_id,
      other_hand: pointResult.other_hand
    });
    
    res.status(201).json(pointResult);
  } catch (error) {
    console.error('Error creating point:', error);
    res.status(500).json({ 
      error: 'Failed to create point', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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