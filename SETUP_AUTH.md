# Setup Guide: User Authentication & Accounts

This guide explains how to set up user authentication and account features for the Political Compass application.

## Overview

We've added the following features:
- **User accounts** with email-based authentication (magic links)
- **Save results** - Users can save their survey results to their account
- **Results history** - View all past test results in one place
- **Improved sharing** - Share results via social media (Twitter, Facebook, LinkedIn, Reddit)

## Database Migration

### Step 1: Apply the Migration

Run the migration SQL in your Supabase SQL Editor:

```bash
# The migration file is located at:
supabase/migrations/001_add_user_accounts.sql
```

This migration adds:
- `user_id` column to `survey_results` table
- Row Level Security (RLS) policies for data access
- Helper functions: `link_result_to_user()` and `get_user_results()`

**Note:** User profiles are stored in the `public.profiles` table (see main schema.sql), which includes admin permissions and is auto-created via trigger when users sign up.

### Step 2: Enable Email Authentication

In your Supabase dashboard:

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure email templates (optional):
   - Go to **Authentication > Email Templates**
   - Customize the "Magic Link" template
4. Set up SMTP settings (optional for custom emails):
   - Go to **Project Settings > Auth**
   - Configure your SMTP server

### Step 3: Configure Environment Variables

Ensure these environment variables are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## Features Implemented

### 1. Improved Share Functionality (`src/components/ResultsActions.tsx`)

**What's new:**
- Social media sharing buttons (Twitter, Facebook, LinkedIn, Reddit)
- Copy link to clipboard with visual feedback
- Pre-filled share text with user's top political type
- Fixed SSR hydration issues with proper `useEffect` usage

**How it works:**
- Users can share results via social media platforms
- Each platform gets a custom share URL with appropriate parameters
- Copy link button provides instant feedback

### 2. Save Results Prompt (`src/components/SaveResultsPrompt.tsx`)

**What's new:**
- Collapsible prompt to save results
- Email-based magic link authentication
- Automatic result linking after authentication
- Clear benefits messaging

**How it works:**
1. User sees prompt on results page
2. Clicks to expand and enters email
3. Receives magic link via email
4. Clicks link to authenticate
5. Results are automatically linked to their account

### 3. User Profile/Dashboard (`src/app/profile/page.tsx`)

**What's new:**
- View all saved test results
- Account statistics (total tests, account age, last login)
- Click any result to view full details
- Sign out functionality

**How it works:**
- Protected route - redirects to home if not authenticated
- Fetches user's results using `get_user_results()` function
- Displays results in chronological order

### 4. Authentication Utilities (`src/lib/auth.ts`)

Helper functions for authentication:
- `signInWithEmail()` - Send magic link
- `signUpWithEmail()` - Create new account
- `signOut()` - Log out user
- `getCurrentUser()` - Get current session
- `linkResultToUser()` - Link result to account
- `getUserResults()` - Fetch all user results

## User Flow

### Anonymous User (Default)
1. Take survey
2. View results
3. Results accessible via session ID URL
4. Can share results publicly

### Authenticated User
1. Take survey
2. View results
3. **Option to save results** (new)
4. Enter email → Receive magic link
5. Click link → Results saved
6. Access all past results from profile page
7. Can retake test and compare over time

## Database Schema

### User Profile Table

#### `public.profiles`
```sql
- id: UUID (references auth.users)
- email: TEXT
- is_admin: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Note:** Profiles are automatically created via database trigger when users sign up through Supabase Auth.

### Updated Tables

#### `survey_results`
```sql
-- New column:
- user_id: UUID (optional, links to users.id)
```

## Security & Privacy

### Row Level Security (RLS) Policies

**Anonymous users:**
- Can create survey results
- Can view any result by session_id (results are public by default)

**Authenticated users:**
- Can view their own saved results
- Can link anonymous results to their account
- Can only update results they own

### Privacy Considerations

- Results remain **public by session URL** unless additional privacy features are added
- Email addresses are stored securely in Supabase Auth
- Magic links expire after use or timeout
- No passwords to manage or store

## Testing the Features

### Test Share Functionality
1. Complete a survey
2. View results page
3. Click social media buttons to test sharing
4. Use "Copy Link" to test clipboard functionality

### Test Account Creation
1. Complete a survey
2. Click "Save Your Results" on results page
3. Enter your email
4. Check email for magic link
5. Click magic link
6. Verify results are saved in profile

### Test Profile Dashboard
1. Sign in (if not already)
2. Navigate to `/profile` or click "My Results" in header
3. View saved results list
4. Click a result to view details
5. Test sign out

## Troubleshooting

### Magic Link Not Received
- Check spam/junk folder
- Verify email provider is configured in Supabase
- Check Supabase logs in dashboard

### Results Not Linking
- Check browser console for errors
- Verify migration was applied correctly
- Check RLS policies in Supabase

### Share Buttons Not Working
- Verify URL is correct in browser
- Check browser console for errors
- Test in incognito mode to rule out extensions

## Next Steps (Optional Enhancements)

1. **Private results** - Add option to make results private
2. **Result comparison** - Show how views changed over time
3. **Social features** - Compare results with friends
4. **Email notifications** - Remind users to retake test periodically
5. **Export results** - Download as PDF or CSV

## Support

For issues or questions:
1. Check Supabase dashboard logs
2. Review browser console for errors
3. Verify environment variables are set correctly
