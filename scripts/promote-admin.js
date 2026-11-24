#!/usr/bin/env node

/**
 * CLI tool to promote a user to admin status
 * Usage: node scripts/promote-admin.js <email>
 * 
 * Requires environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (has admin privileges)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function promoteUserToAdmin(email) {
  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Error: SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  if (!email) {
    console.error('❌ Error: Email address is required');
    console.log('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('🔍 Looking for user with email:', email);

    // Debug: Check what's in the profiles table
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, email, is_admin');

    if (allProfilesError) {
      console.error('❌ Error fetching profiles:', allProfilesError.message);
    } else {
      console.log('📋 All profiles in database:', allProfiles);
    }

    // Also check auth.users table directly
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
    } else {
      console.log('👥 Auth users:', authUsers.users.map(u => ({ id: u.id, email: u.email, email_confirmed_at: u.email_confirmed_at })));
    }

    // First, find the user in the profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, is_admin')
      .eq('email', email);

    if (profileError) {
      console.error('❌ Database error:', profileError.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      // User exists in auth but not in profiles - let's find them and create the profile
      const authUser = authUsers.users.find(u => u.email === email);
      
      if (!authUser) {
        console.error('❌ No user found with email:', email);
        console.log('📝 Make sure the user has signed up and verified their email first.');
        process.exit(1);
      }

      if (!authUser.email_confirmed_at) {
        console.error('❌ User email is not confirmed yet');
        console.log('📧 Please check your email and click the confirmation link first.');
        process.exit(1);
      }

      console.log('🔧 User exists in auth but not in profiles table. Creating profile...');
      
      // Create the missing profile
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          is_admin: true, // Create as admin directly
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createError) {
        console.error('❌ Failed to create profile:', createError.message);
        process.exit(1);
      }

      console.log('🎉 Successfully created profile and promoted', email, 'to admin!');
      return;
    }

    const user = profiles[0];

    if (user.is_admin) {
      console.log('ℹ️  User is already an admin');
      process.exit(0);
    }

    console.log('✅ User found:', user.email);
    console.log('🔄 Promoting user to admin...');

    // Promote user to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to promote user:', updateError.message);
      process.exit(1);
    }

    console.log('🎉 Successfully promoted', email, 'to admin!');

    // Verify the change
    const { data: verifyData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (verifyData?.is_admin) {
      console.log('✅ Verification: User is now an admin');
    } else {
      console.log('⚠️  Warning: Could not verify admin status');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];
promoteUserToAdmin(email);
