# Google Meet Integration Setup Guide

This guide will help you set up Google Meet integration for MYC roast sessions using Google Calendar API.

## Prerequisites
- Google Workspace account (required for creating Meet links via API)
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name (e.g., "myc-roast-meetings")
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and click **Enable**

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Enter details:
   - Service account name: `myc-roast-meet-creator`
   - Service account ID: (auto-generated)
4. Click **Create and Continue**
5. Skip the optional "Grant this service account access to project" step
6. Skip the optional "Grant users access to this service account" step
7. Click **Done**

## Step 4: Create Service Account Key (JSON)

1. In **Credentials**, find the service account you just created
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. The JSON file will download automatically
8. **Keep this file secure!** It contains sensitive credentials

## Step 5: Grant Calendar Access to Service Account

The service account needs permission to create calendar events:

1. Copy the service account email from the JSON file (it looks like: `myc-roast-meet-creator@your-project.iam.gserviceaccount.com`)

2. Go to [Google Calendar](https://calendar.google.com)

3. **Option A: Use Primary Calendar**
   - Click on "Settings" (gear icon)
   - Click "Settings" in the menu
   - Scroll to "Share with specific people or groups"
   - Click "+ Add people and groups"
   - Paste the service account email
   - Set permission to **"Make changes to events"**
   - Click "Send"

   **Option B: Create Dedicated Calendar (Recommended)**
   - In the left sidebar, click the "+" next to "Other calendars"
   - Click "Create new calendar"
   - Name it "MYC Roast Meetings"
   - Click "Create calendar"
   - Find the new calendar in the left sidebar
   - Click the three dots → "Settings and sharing"
   - Scroll to "Share with specific people or groups"
   - Click "+ Add people and groups"
   - Paste the service account email
   - Set permission to **"Make changes to events"**
   - Click "Send"
   - **Note the Calendar ID** from the "Integrate calendar" section (you'll need this)

## Step 6: Add Credentials to Environment Variables

1. Open the JSON credentials file you downloaded

2. Copy the **entire JSON content** (it should be one long line)

3. Open your `.env.local` file

4. Add the credentials:

```bash
# Google Meet Configuration (via Calendar API)
# Paste the entire JSON content as a single line
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'

# Optional: Specific calendar ID (if you created a dedicated calendar)
# If not set, it defaults to 'primary'
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

**Important Notes:**
- Wrap the entire JSON in single quotes
- Do NOT add line breaks in the JSON
- If using a dedicated calendar, get the Calendar ID from Calendar Settings → "Integrate calendar" section

## Step 7: Test the Integration

1. Restart your development server:
```bash
npm run dev
```

2. Try accepting a roast request or processing someone from the live queue

3. Check the console for any errors related to Google Calendar API

4. Verify that:
   - A Google Meet link is generated
   - A calendar event appears in your Google Calendar
   - The meeting link works and allows guests to join

## Troubleshooting

### Error: "Calendar API access denied"
- Check that the service account has permission to access the calendar
- Verify the service account email is correctly added to calendar sharing

### Error: "Calendar not found"
- If using a dedicated calendar, check the `GOOGLE_CALENDAR_ID` is correct
- Try using `primary` as the calendar ID

### Error: "Failed to parse Google credentials"
- Ensure the JSON is valid and wrapped in quotes
- Check there are no line breaks in the JSON string
- Verify all special characters are properly escaped

### No Google Meet link in calendar event
- Ensure you're using a Google Workspace account (not free Gmail)
- Check that `conferenceData` is being requested in the API call

## Meeting Behavior

- **Duration**: Each meeting is set to 15 minutes by default
- **Attendees**: Both applicant and roaster are added as attendees
- **Auto-deletion**: Calendar events expire after 24 hours
- **Multiple Meetings**: Each roast session gets its own unique Google Meet link
- **External Participants**: Guests can join without a Google account

## Cost

- **Google Calendar API**: Free (1 million queries/day)
- **Google Workspace**: Paid subscription required ($6-18/user/month)
- **Google Meet**: Included with Google Workspace

## Security Best Practices

1. **Never commit** the service account JSON file to git
2. Add `.env.local` to `.gitignore`
3. Use environment variables in production (Vercel, etc.)
4. Regularly rotate service account keys
5. Limit service account permissions to only Calendar API

## Alternative: Daily.co

If you prefer a free alternative without Google Workspace:
- Uncomment the Daily.co integration code
- Sign up at [Daily.co](https://www.daily.co/)
- Get your API key
- Add `DAILY_API_KEY` to `.env.local`

Daily.co provides 10,000 free minutes/month and doesn't require a paid subscription.
