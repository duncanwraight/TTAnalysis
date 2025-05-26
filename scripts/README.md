# Admin Management Scripts

## promote-admin.js

A secure CLI tool to promote existing users to admin status. This tool connects directly to the Supabase database using the service role key, bypassing client-side security limitations.

### Prerequisites

1. The user must have already signed up and verified their email
2. You need access to your Supabase project's service role key
3. Environment variables must be configured

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```bash
   # For production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # For local development
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Usage

**Method 1: Using npm script**
```bash
npm run promote-admin user@example.com
```

**Method 2: Direct node execution**
```bash
node scripts/promote-admin.js user@example.com
```

### Examples

```bash
# Promote a user to admin
npm run promote-admin john@example.com

# Output:
# 🔍 Looking for user with email: john@example.com
# ✅ User found: john@example.com
# 🔄 Promoting user to admin...
# 🎉 Successfully promoted john@example.com to admin!
# ✅ Verification: User is now an admin
```

### Error Handling

The script will provide clear error messages for common issues:

- **User not found**: Make sure the user has signed up and verified their email
- **Missing environment variables**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- **Database connection issues**: Check your network connection and credentials
- **User already admin**: Script will exit gracefully if user is already an admin

### Security Notes

- The service role key has full database access - keep it secure
- Never commit the service role key to version control
- This tool bypasses Row Level Security (RLS) policies
- Only run this tool from secure environments (your local machine or secure CI/CD)

### Finding Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (not the "anon" key)
4. The key should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

### Local Development

For local development with Supabase CLI:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. The service role key will be displayed in the startup output
3. Use `http://127.0.0.1:54321` as your SUPABASE_URL