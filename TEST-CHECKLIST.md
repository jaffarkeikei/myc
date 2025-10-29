# MYC End-to-End Testing Checklist

## ✅ Database Schema Verification

Run this in Supabase SQL Editor to verify tables exist:
```sql
-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('request_tracking', 'request_history');

-- Check if new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('featured_until', 'last_featured');

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'meetings'
AND column_name IN ('accepted_at', 'expires_at');

-- Check if helper functions exist
SELECT proname
FROM pg_proc
WHERE proname IN ('check_daily_request_limit', 'is_in_cooldown', 'has_requested_roaster', 'get_featured_roaster');
```

Expected: All tables, columns, and functions should exist.

---

## 🧪 Manual Testing Steps

### Test 1: Applicant Signup & Dashboard
**Goal:** Verify matching algorithm displays correctly

1. **Sign up as applicant:**
   - Go to http://localhost:3000
   - Click "Get Started"
   - Email: `test-applicant@example.com`
   - Password: `password123`
   - Select role: "Get Roasted"
   - Select roast types: "Application" and "Pitch Deck"
   - Name: "Test Applicant"
   - Industry: "B2B SaaS"
   - Company: "Test Startup"
   - What I'm building: "AI-powered roasting platform"

2. **Check Dashboard:**
   - ✅ Should see "Daily Requests: 0/3 used"
   - ✅ Should see progress bar (empty)
   - ✅ Should see "Featured Roaster" section (might be empty if no roasters)
   - ✅ Should see "Find Roasters" tab active

**Expected Result:** Dashboard loads without errors, shows limit counter

---

### Test 2: Roaster Signup
**Goal:** Create a roaster to test matching

1. **Sign up as roaster (use incognito/different browser):**
   - Go to http://localhost:3000
   - Click "Get Started"
   - Email: `test-roaster@example.com`
   - Password: `password123`
   - Select role: "Give Roasts"
   - Select roast types: "Application" and "Pitch Deck"
   - Name: "Test Roaster"
   - Industry: "B2B SaaS" (same as applicant for matching)
   - Company: "YC Alumni Corp"
   - YC Batch: "W23"

2. **Check Roaster Dashboard:**
   - ✅ Should see "Available" toggle (green)
   - ✅ Should see "Priority Queue" or "Roast Requests" tab
   - ✅ Should show "No pending requests" initially

**Expected Result:** Roaster dashboard loads, shows empty queue

---

### Test 3: Matching Algorithm Display
**Goal:** Verify applicant sees roaster in matched sections

**As Applicant (browser 1):**
1. Refresh dashboard
2. **Check sections:**
   - ✅ Featured Roaster: Should show "Test Roaster" OR another roaster
   - ✅ Industry Matches: Should show "Test Roaster" (same industry: B2B SaaS)
   - ✅ Browse More: Should show available roasters

**Expected Result:** Matching algorithm works, shows roasters based on industry

---

### Test 4: Request a Roast
**Goal:** Test request creation and limits

**As Applicant:**
1. Click "Request Roast" on any roaster
2. Select roast type: "Application"
3. Click "Send Request"
4. **Verify:**
   - ✅ Request counter updates to "1/3 used"
   - ✅ Progress bar shows 33% filled
   - ✅ Button changes to "Daily Limit Reached" if you try same roaster again

5. Go to "My Roast Requests" tab
   - ✅ Should see request with status "requested"
   - ✅ Should show roaster name and roast type

**Expected Result:** Request created, counter updated, roaster can't be requested twice

---

### Test 5: Request Limits
**Goal:** Verify 3/day limit works

**As Applicant:**
1. Request roast from 2 more different roasters
2. Counter should show "2/3 used", then "3/3 used"
3. Try to request 4th roast
   - ✅ All "Request Roast" buttons should be disabled
   - ✅ Should show "Daily Limit Reached"
   - ✅ Limit message: "Daily limit reached (3/day)"

**Expected Result:** Can't make more than 3 requests per day

---

### Test 6: Roaster Sees Request
**Goal:** Verify priority queue works

**As Roaster (browser 2):**
1. Refresh dashboard
2. Should see pending requests in priority queue
   - ✅ Shows applicant name: "Test Applicant"
   - ✅ Shows company: "Test Startup"
   - ✅ Shows roast type: "Application"
   - ✅ Shows "What I'm building" context
   - ✅ Has "Accept" and "Decline" buttons

**Expected Result:** Roaster sees requests in intelligent order

---

### Test 7: Accept Request & Email
**Goal:** Test meeting creation and email sending

**As Roaster:**
1. Click "Accept" on a request
2. Wait for processing...
3. **Verify:**
   - ✅ Success message: "Roast accepted! Meeting link sent via email"
   - ✅ Request moves to "accepted" status
   - ✅ Shows Google Meet link
   - ✅ Shows "Join the 10-minute session now →" button

4. **Check emails (both inboxes):**
   - ✅ Applicant receives: "Your MYC roast session is confirmed!"
   - ✅ Roaster receives: "Roast session confirmed - Ready to give feedback!"
   - ✅ Both emails contain Google Meet link
   - ✅ Meet link format: `https://meet.google.com/[unique-id]`

**Expected Result:** Meeting created, emails sent with Meet link

---

### Test 8: Google Meet Link
**Goal:** Verify link works

1. Click the Google Meet link from email or dashboard
2. **Verify:**
   - ✅ Opens Google Meet
   - ✅ Can join meeting
   - ✅ Link is unique (not reused)

**Expected Result:** Google Meet session works

---

### Test 9: Request Tracking
**Goal:** Verify request history prevents duplicates

**As Applicant (after daily limit resets OR with new account):**
1. Try to request same roaster again
2. **Verify:**
   - ✅ Button should be disabled OR
   - ✅ Error message: "You've already requested this roaster"

**Expected Result:** Can't request same roaster twice ever

---

### Test 10: Meeting Completion
**Goal:** Test completion flow

**As Roaster:**
1. Go to "Roast Requests" tab
2. Find accepted meeting
3. Click "Mark as Complete"
4. **Verify:**
   - ✅ Status changes to "completed"
   - ✅ Roast count increments by 1
   - ✅ Counter in header updates

**Expected Result:** Meeting marked complete, stats updated

---

## 🔍 Database Verification Queries

Run these in Supabase SQL Editor to check data:

```sql
-- Check request tracking
SELECT * FROM request_tracking ORDER BY created_at DESC LIMIT 5;

-- Check request history
SELECT * FROM request_history ORDER BY requested_at DESC LIMIT 5;

-- Check featured roaster
SELECT id, name, featured_until, last_featured
FROM profiles
WHERE featured_until > NOW()
LIMIT 1;

-- Check meetings with details
SELECT
  m.id,
  m.status,
  m.roast_type,
  m.meeting_link,
  m.accepted_at,
  m.expires_at,
  a.name as applicant_name,
  r.name as reviewer_name
FROM meetings m
JOIN profiles a ON m.applicant_id = a.id
JOIN profiles r ON m.reviewer_id = r.id
ORDER BY m.requested_at DESC
LIMIT 5;
```

---

## 🐛 Common Issues & Fixes

### Issue: "No roasters available"
**Fix:** Sign up as a roaster and set `is_available = true`

### Issue: "Daily limit reached" immediately
**Fix:** Check `request_tracking` table, delete test data:
```sql
DELETE FROM request_tracking WHERE applicant_id = '[your-user-id]';
```

### Issue: Emails not sending
**Fix:**
1. Check `RESEND_API_KEY` in `.env.local`
2. Check Resend dashboard for errors
3. Verify sender domain is configured

### Issue: No featured roaster
**Fix:** Normal! Featured roaster selected when first qualified roaster is available

### Issue: Google Meet link not working
**Fix:** Link format is correct - just click and join. No Google API needed.

---

## ✅ Success Criteria

All features working if:
- [ ] Applicant can sign up and see matched roasters
- [ ] Request counter works (0/3, 1/3, 2/3, 3/3)
- [ ] Can make 3 requests but not 4
- [ ] Can't request same roaster twice
- [ ] Roaster sees requests in priority queue
- [ ] Accept button creates meeting with Google Meet link
- [ ] Both parties receive confirmation emails
- [ ] Google Meet link is unique and works
- [ ] Can mark meeting as complete
- [ ] Roast count increments
- [ ] Industry matching works (same industry roasters appear in "Matched" section)
- [ ] Featured roaster rotates daily
- [ ] Request history persists (prevents duplicate requests)

---

## 📊 Performance Checks

- [ ] Dashboard loads in < 2 seconds
- [ ] Request creation is instant
- [ ] Emails sent within 5 seconds
- [ ] No console errors
- [ ] No database errors
- [ ] Matching algorithm runs fast

---

## 🎯 Next Steps After Testing

1. **If all tests pass:** Deploy to Vercel!
2. **If issues found:** Document them and fix priority issues
3. **Production setup:**
   - Update `NEXT_PUBLIC_APP_URL` to production domain
   - Verify Resend sender domain
   - Test with real emails
   - Monitor Resend dashboard for deliverability

---

**Testing completed by:** _______________
**Date:** _______________
**Result:** ✅ Pass / ❌ Fail
**Notes:** _______________
