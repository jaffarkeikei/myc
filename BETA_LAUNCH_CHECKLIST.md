# MYC Beta Launch Checklist

## ✅ Data Cleanup (Completed)
- [x] Deleted ALL profiles (5 removed)
- [x] Deleted all test meetings (29 removed)
- [x] Deleted all queue entries (54 removed)
- [x] Deleted all live sessions (48 removed)
- [x] Cleared request tracking and history
- [x] **COMPLETE DATABASE WIPE - Starting from scratch**

## 🔍 Core Features to Verify

### 1. Authentication & Onboarding
- [ ] Sign up with Google OAuth works
- [ ] Email verification/login flow works
- [ ] Onboarding flow for applicants
- [ ] Onboarding flow for reviewers
- [ ] Profile setup (name, company, YC batch, industry, etc.)

### 2. Regular Roast Requests (Applicant → Reviewer)
- [ ] Applicant can browse available reviewers
- [ ] Applicant can request a roast (with 3 daily limit)
- [ ] Reviewer receives email notification
- [ ] Reviewer can see requests in dashboard
- [ ] Reviewer can accept/decline requests
- [ ] Google Meet link is generated (10 minutes)
- [ ] Both parties receive confirmation emails
- [ ] Both parties can see meeting link
- [ ] 10-minute countdown timer displays correctly
- [ ] Both parties can mark as complete
- [ ] Both parties can give feedback
- [ ] Roast count increments only when BOTH complete
- [ ] Completed meetings show in history with exact timestamps

### 3. Live Queue Sessions (Reviewer goes live)
- [ ] Reviewer can click "Go Live"
- [ ] Email sent to hello@myc-roast.com
- [ ] Live session appears on applicant's dashboard
- [ ] Applicants can join queue
- [ ] Queue position displays correctly
- [ ] Max 10 people in queue enforced
- [ ] Reviewer can "Process Next" person
- [ ] Applicant receives email notification when it's their turn
- [ ] 2-minute timeout for joining enforced
- [ ] Meeting link generated automatically
- [ ] Countdown timer shows during session
- [ ] Reviewer can skip people who don't join
- [ ] Reviewer can complete sessions
- [ ] Both parties give feedback
- [ ] Reviewer can end live session
- [ ] All waiting applicants notified when session ends

### 4. Rankings & Statistics
- [ ] Rankings page displays correctly
- [ ] Roast counts are accurate
- [ ] Featured reviewers system works
- [ ] Filtering by industry works

### 5. Email Notifications
- [ ] New roast request → Reviewer
- [ ] Roast accepted → Both parties
- [ ] Your turn in live queue → Applicant
- [ ] Alumni goes live → hello@myc-roast.com
- [ ] All emails have correct formatting
- [ ] Links in emails work

### 6. UI/UX Polish
- [ ] Mobile responsive design
- [ ] Loading states show properly
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Timer colors change correctly (green → yellow → orange → red)
- [ ] All buttons work
- [ ] Navigation works

## 🚀 Environment Variables Check

### Required Variables (check .env.local and Vercel):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hoevksqthngrlsmrancx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Email (Resend)
RESEND_API_KEY=re_CBr1oBNr_...

# Google Meet
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account"...}
GOOGLE_CALENDAR_ID=no-reply@pontifi.com
GOOGLE_WORKSPACE_USER_EMAIL=no-reply@pontifi.com

# App URL
NEXT_PUBLIC_APP_URL=https://myc-roast.com (or your production domain)
```

## 📊 Database Setup

### Tables & Columns Verified:
- [x] profiles (with dual feedback fields)
- [x] meetings (with scheduled_for, applicant_completed, reviewer_completed, etc.)
- [x] queue_entries
- [x] live_sessions
- [x] request_tracking
- [x] request_history

### Database Functions:
- [x] increment_queue_size
- [x] decrement_queue_size

### Row Level Security (RLS):
- Ensure policies are set up for all tables
- Users can only see their own data
- Appropriate access for service role

## 🔒 Security Checklist
- [ ] Google Workspace Domain-Wide Delegation enabled
- [ ] Service account has Calendar API access
- [ ] RLS policies tested
- [ ] API routes have proper authentication
- [ ] No sensitive data in client-side code
- [ ] Rate limiting configured (if applicable)

## 🎯 Beta Launch Strategy

### Initial Beta Users:
1. **Reviewers (Alumni):**
   - Target: 5-10 YC alumni
   - Mix of different batches
   - Various industries
   - Active and willing to give feedback

2. **Applicants:**
   - Target: 20-30 applicants
   - Mix of application stages (pre-YC, applying, post-rejection)
   - Different backgrounds

### Monitoring During Beta:
- [ ] Watch for any errors in Vercel logs
- [ ] Monitor email delivery (Resend dashboard)
- [ ] Check Google Meet link generation success rate
- [ ] Track completion rates
- [ ] Gather feedback from users
- [ ] Monitor database for any issues

### Success Metrics:
- [ ] At least 10 successful roast sessions completed
- [ ] Both applicants and reviewers give positive feedback
- [ ] No critical bugs reported
- [ ] Email notifications working reliably
- [ ] Live queue sessions run smoothly

## 🐛 Known Issues / Edge Cases to Test

1. **Timezone handling** - Ensure all times display correctly in user's timezone
2. **Google Meet access** - External participants may see "waiting room" (requires workspace settings)
3. **Concurrent live sessions** - Multiple reviewers can't overlap sessions
4. **Queue overflow** - What happens if 11th person tries to join?
5. **Network issues** - Graceful handling of connection problems
6. **Dual completion race condition** - Both parties click complete simultaneously

## 📝 Beta Feedback to Collect

Ask beta users:
1. How was the onboarding experience?
2. Was it easy to request/accept roasts?
3. How did the 10-minute timer work for you?
4. Was the feedback process clear?
5. Did emails arrive on time?
6. Any bugs or confusing parts?
7. What features would you like to see next?

## 🚀 Post-Beta Next Steps
- Address critical bugs
- Implement user feedback
- Consider adding:
  - Calendar integration for scheduling
  - Slack notifications
  - Video recording option
  - Follow-up sessions
  - Public profiles
  - Testimonials section

---

## Current Status
**Database completely wiped and ready for beta launch! ✅**

- Database: **COMPLETELY EMPTY** - 0 profiles, 0 meetings, 0 sessions
- Fresh start for all beta users
- No test data whatsoever
- Environment variables configured
- Latest code deployed to production

**Ready to invite beta users - they will be your first real users! 🚀**
