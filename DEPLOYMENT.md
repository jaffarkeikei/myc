# MYC Deployment Guide

## Prerequisites

1. Supabase account and project
2. Resend account for emails
3. Vercel account for deployment

## Step 1: Database Setup

1. Go to your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT/sql
   ```

2. Run the schema updates from `schema-updates.sql`:
   - Copy the entire file contents
   - Paste into SQL Editor
   - Click "Run"

This will create:
- New columns: `accepted_at`, `expires_at` on meetings
- New columns: `featured_until`, `last_featured` on profiles
- New tables: `request_tracking`, `request_history`
- Helper functions for limits and matching
- RLS policies

## Step 2: Resend Setup

1. Go to [Resend.com](https://resend.com) and create an account

2. Get your API key:
   - Dashboard → API Keys → Create API Key
   - Copy the key (starts with `re_`)

3. Configure sender domain (optional but recommended):
   - Go to Domains → Add Domain
   - Follow DNS setup instructions
   - Use format: `roasts@yourdomain.com`

## Step 3: Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your values:
   ```env
   # From Supabase Project Settings
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   # From Resend Dashboard
   RESEND_API_KEY=re_your_api_key

   # Your app URL (use localhost for dev)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 4: Test Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Test the flow:
   - Sign up as an applicant
   - Sign up as a roaster (use different browser/incognito)
   - Request a roast
   - Accept the request as roaster
   - Check emails are sent
   - Verify Google Meet link works

## Step 5: Deploy to Vercel

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Complete MYC matching system"
   git push
   ```

2. Go to [Vercel Dashboard](https://vercel.com)

3. Import your GitHub repository

4. Add environment variables in Vercel:
   - Settings → Environment Variables
   - Add all variables from `.env.local`
   - Make sure to update `NEXT_PUBLIC_APP_URL` to your Vercel URL

5. Deploy!

## Features Implemented

### ✅ Matching Algorithm
- Featured roaster (rotates daily)
- Industry-matched roasters
- Wildcard picks for diversity
- Priority queue for roasters

### ✅ Request Limits
- 3 requests per day per applicant
- 48-hour cooldown after rejections
- Can't request same roaster twice
- Visual limit counter on dashboard

### ✅ Meeting Flow
- Instant Google Meet link generation
- Email notifications to both parties
- 24-hour expiration on meetings
- Meeting completion tracking

### ✅ Email Notifications
- New request notification to roaster
- Confirmation emails with meeting link
- HTML email templates
- Resend integration

## Configuration

### Daily Limits

Edit in `lib/matching.ts`:
```typescript
export const DAILY_REQUEST_LIMIT = 3
export const COOLDOWN_HOURS = 48
```

### Featured Roaster Duration

Featured roasters are selected for 24 hours. They won't be featured again for 7 days.

Edit in `schema-updates.sql` (line in get_featured_roaster function):
```sql
featured_until = CURRENT_TIMESTAMP + INTERVAL '24 hours'
```

### Meeting Expiration

Meetings expire 24 hours after acceptance.

Edit in `lib/meetings.ts`:
```typescript
const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
```

## Troubleshooting

### Emails not sending

1. Check Resend API key is correct
2. Verify sender domain is verified
3. Check Resend dashboard for error logs
4. Make sure `NEXT_PUBLIC_APP_URL` is set correctly

### Database errors

1. Verify schema-updates.sql ran successfully
2. Check RLS policies are enabled
3. Verify Supabase connection in .env.local

### Matching not working

1. Make sure profiles have `industry` set
2. Verify `is_available` is true for roasters
3. Check request_tracking table is being updated

### Google Meet links not generating

- Links use `meet.google.com/{random-id}` format
- These create instant meetings
- No Google API key needed for MVP
- Consider Google Calendar API for scheduled meetings

## Next Steps (Optional Enhancements)

### Phase 2: Advanced Features

1. **Google Calendar Integration**
   - Let roasters share availability
   - Book specific time slots
   - Send calendar invites

2. **Feedback System**
   - Post-meeting ratings
   - Comments and testimonials
   - Quality scoring

3. **Analytics Dashboard**
   - Track successful roasts
   - Popular roasters
   - Success metrics

4. **Smart Matching**
   - ML-based recommendations
   - Historical success rates
   - Compatibility scoring

## Support

For issues:
1. Check this deployment guide
2. Review FLOW.md for system architecture
3. Check schema-updates.sql for database structure
4. Review lib/matching.ts for matching logic
5. Check lib/meetings.ts for meeting flow

## Security Notes

- RLS policies protect all database access
- Emails are sent server-side only
- API keys never exposed to client
- Meeting links are unique and random
- Request history prevents spam

## Performance

- Database indexes on key columns
- Real-time subscriptions for live updates
- Efficient matching queries
- Pagination ready (browse more limited to 10)

Enjoy building the best roast platform for YC applicants! 🔥
