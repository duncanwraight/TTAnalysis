const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT verification middleware
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
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ error: 'Failed to authenticate token' });
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
    // Set the is_admin flag to true for the user
    const { error } = await adminSupabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId);
    
    if (error) {
      console.error('Error setting admin status:', error);
      return res.status(500).json({ error: 'Failed to set admin status' });
    }
    
    res.status(200).json({ success: true, message: 'Admin status set successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Default route for testing
app.get('/api', (req, res) => {
  res.json({ message: 'API running' });
});

const PORT = process.env.SERVER_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});