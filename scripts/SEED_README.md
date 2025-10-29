# Database Seeding

This directory contains scripts to seed your database with test data.

## Running the Seed Script

```bash
npm run seed
```

## What Gets Created

### Reviewers (5 users)
- **Sarah Chen** - B2B SaaS expert, YC S19
- **Marcus Rodriguez** - AI/ML researcher, YC W21
- **Emily Watson** - Healthcare founder, YC S20 (currently unavailable)
- **Alex Kumar** - Developer Tools expert, YC W22
- **Lisa Park** - Fintech veteran, YC S18

### Applicants (4 users)
- **Jordan Lee** - NextGen Analytics (B2B SaaS)
- **Priya Sharma** - EduConnect (Education)
- **David Kim** - GreenTech Solutions (Climate)
- **Aisha Mohammed** - MediMatch (Healthcare)

### Meetings (5 records)
- Various meeting statuses: completed, accepted, requested, cancelled
- Different roast types: application, pitch
- Realistic timestamps spanning the last 10 days

## Test Login Credentials

All test accounts use the same password:
- **Password**: `TestPassword123!`

Example logins:
- Reviewer: `sarah.chen@example.com` / `TestPassword123!`
- Applicant: `jordan.lee@example.com` / `TestPassword123!`

## Complete Test Account List

### Reviewers
- sarah.chen@example.com
- marcus.r@example.com
- emily.watson@example.com
- alex.kumar@example.com
- lisa.park@example.com

### Applicants
- jordan.lee@example.com
- priya.sharma@example.com
- david.kim@example.com
- aisha.mohammed@example.com

## Notes

- The script uses Supabase Auth Admin API to create users
- Profiles are automatically created via database trigger
- All users have confirmed emails
- Meeting data includes realistic feedback and timestamps
