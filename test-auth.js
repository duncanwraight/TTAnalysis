// Simple test script for JWT verification with Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;

console.log('Environment variables:');
console.log('- VITE_SUPABASE_URL:', supabaseUrl || 'NOT SET');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET (value hidden)' : 'NOT SET');
console.log('- SUPABASE_JWT_SECRET:', jwtSecret ? 'SET (value hidden)' : 'NOT SET');

// Create Supabase admin client
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase credentials. Cannot continue.');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('Supabase admin client created');

// Function to check if a token is valid
async function checkToken(token) {
  try {
    console.log('Testing token verification...');
    console.log('Token to check (first 10 chars):', token.substring(0, 10) + '...');
    
    const { data, error } = await adminSupabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification failed:', error);
      return false;
    }
    
    console.log('Token is valid! User information:');
    console.log('- User ID:', data.user.id);
    console.log('- Email:', data.user.email);
    console.log('- Created at:', data.user.created_at);
    
    return true;
  } catch (err) {
    console.error('Unexpected error during token verification:', err);
    return false;
  }
}

// Test with the first command-line argument as the token
async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: node test-auth.js <JWT-TOKEN>');
    console.error('Please provide a JWT token to test');
    process.exit(1);
  }
  
  const token = process.argv[2];
  const isValid = await checkToken(token);
  
  console.log('\nToken verification result:', isValid ? 'VALID' : 'INVALID');
  process.exit(isValid ? 0 : 1);
}

main().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});