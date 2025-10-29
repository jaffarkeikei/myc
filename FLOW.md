# MYC Application Flow

## Current Issues
The current implementation is missing several critical features for a complete roasting platform.

## How It SHOULD Work

### 1. Request Flow
```
Applicant → Finds available reviewers → Clicks "Request Roast"
↓
System creates meeting request (status: "requested")
↓
Reviewer receives notification (email/in-app)
↓
Reviewer clicks "Accept" or "Decline"
```

### 2. Acceptance & Scheduling Flow
```
Reviewer accepts request
↓
System generates meeting link (options below)
↓
System sends email to BOTH parties with:
  - Meeting link
  - Time (could be immediate or scheduled)
  - Roast type (Application / Pitch Deck)
  - Context about the applicant
↓
Meeting status changes to "accepted"
↓
Applicant is REMOVED from the available pool (they're in an active session)
```

### 3. Meeting Options

**Option A: Instant Meetings (Current Simple Approach)**
- Generate a Google Meet / Zoom / Cal.com link immediately
- Both parties join when ready (within next 30 mins)
- Simple but less structured

**Option B: Scheduled Meetings (Better UX)**
- Integrate with calendaring (Cal.com API, Calendly, or custom)
- Reviewer shares availability
- Applicant picks a time slot
- Automated calendar invites sent to both
- More professional

### 4. During Meeting
```
10-minute timer starts when both join
↓
Roast happens (video call)
↓
System tracks meeting duration
```

### 5. Post-Meeting Flow
```
Meeting ends (10 mins elapsed or manually ended)
↓
Meeting status changes to "completed"
↓
CRITICAL: Applicant returns to available pool
  - Can request new roasts
  - Visible to other reviewers again
↓
Both parties prompted for feedback (optional):
  - "How was the session?"
  - "Rate the feedback quality"
  - Used to improve matching
↓
Roast count incremented for reviewer
```

### 6. Email Notifications Needed

**When request sent:**
- To Reviewer: "New roast request from [Name] - [Company]"

**When request accepted:**
- To Applicant: "Your roast request was accepted! Join here: [link]"
- To Reviewer: "Roast confirmed. Meeting link: [link]"

**Reminder (5 mins before):**
- To Both: "Your roast starts in 5 minutes"

**After meeting:**
- To Both: "Thanks for roasting! Please share feedback"

## What's Currently Missing

### Critical Features:
- ❌ Meeting link generation (Google Meet / Cal.com integration)
- ❌ Email notification system
- ❌ Removing users from pool during active sessions
- ❌ Returning users to pool after completion
- ❌ Calendar/scheduling integration
- ❌ Meeting timer/duration tracking

### Nice-to-Have:
- ❌ Feedback system after meetings
- ❌ Matching algorithm (based on industry, etc.)
- ❌ Reminder notifications
- ❌ Meeting history/analytics

## Recommended Implementation

### Phase 1: Basic Flow (MVP)
1. **Meeting Link Generation**
   - Use Google Meet API or simple Whereby.com rooms
   - Generate unique link when request accepted

2. **Email Notifications**
   - Set up Supabase Edge Functions
   - Use Resend/SendGrid for emails

3. **Pool Management**
   - Add `in_active_session` boolean to profiles table
   - Filter out users where `in_active_session = true`
   - Reset to `false` when meeting marked "completed"

### Phase 2: Enhanced UX
1. **Calendar Integration**
   - Integrate Cal.com or Calendly
   - Let reviewers set availability

2. **Feedback System**
   - Post-meeting ratings
   - Comments for improvement

### Phase 3: Advanced Features
1. **Smart Matching**
   - Match by industry
   - Match by experience level

2. **Analytics**
   - Track popular roasters
   - Success metrics

## Database Changes Needed

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN in_active_session BOOLEAN DEFAULT FALSE;

-- Add to meetings table
ALTER TABLE meetings ADD COLUMN started_at TIMESTAMP;
ALTER TABLE meetings ADD COLUMN ended_at TIMESTAMP;
ALTER TABLE meetings ADD COLUMN feedback_from_applicant TEXT;
ALTER TABLE meetings ADD COLUMN feedback_from_reviewer TEXT;
ALTER TABLE meetings ADD COLUMN rating_from_applicant INTEGER CHECK (rating_from_applicant BETWEEN 1 AND 5);
ALTER TABLE meetings ADD COLUMN rating_from_reviewer INTEGER CHECK (rating_from_reviewer BETWEEN 1 AND 5);
```

## Integration Options

### For Meeting Links:
1. **Google Meet API** - Professional, familiar
2. **Whereby** - Super simple, embeddable
3. **Cal.com** - Open source, great for scheduling
4. **Daily.co** - Built for 1:1 video calls

### For Emails:
1. **Resend** - Modern, great DX
2. **SendGrid** - Reliable, established
3. **Postmark** - Transactional focus

### For Scheduling:
1. **Cal.com API** - Open source, full-featured
2. **Calendly API** - Popular, easy
3. **Custom with Supabase** - Full control
