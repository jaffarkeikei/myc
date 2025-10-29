# Email Templates Guide

## 📧 Email Templates Included

This project includes three professional email templates for user authentication:

1. **Confirmation Email** (`confirmation-email.html`) - For new user signups
2. **Reset Password Email** (`reset-password-email.html`) - For password recovery
3. **Change Email Email** (`change-email-email.html`) - For email address changes

All templates are:
- ✅ Fully responsive (mobile + desktop)
- ✅ Branded with MYC colors and style
- ✅ Professional and clean design
- ✅ Include clear calls-to-action
- ✅ Have security notes and best practices

---

## 🚀 How to Set Up in Supabase

### Step 1: Go to Email Templates

1. Open your Supabase project dashboard
2. Navigate to: **Authentication** → **Email Templates**
3. URL format: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates`

### Step 2: Configure Each Template

#### A. Confirm Signup Template

1. Click on **"Confirm signup"** template
2. Copy contents from `email-templates/confirmation-email.html`
3. Paste into the editor
4. **Important**: Make sure `{{ .ConfirmationURL }}` is preserved
5. Save changes

#### B. Reset Password Template

1. Click on **"Reset password"** template
2. Copy contents from `email-templates/reset-password-email.html`
3. Paste into the editor
4. **Important**: Make sure `{{ .ConfirmationURL }}` is preserved
5. Save changes

#### C. Change Email Template

1. Click on **"Change Email"** template
2. Copy contents from `email-templates/change-email-email.html`
3. Paste into the editor
4. **Important**: Make sure `{{ .ConfirmationURL }}` is preserved
5. Save changes

### Step 3: Configure SMTP (Resend)

1. Go to: **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **"Enable Custom SMTP"**
3. Fill in the settings:

```
Host: smtp.resend.com
Port: 587
Username: resend
Password: YOUR_RESEND_API_KEY
Sender email: roasts@myc.app
Sender name: MYC
```

4. Save settings

---

## 🎯 User Flows Explained

### Flow 1: New User Signup

```
User enters email/password
      ↓
Sign Up button clicked
      ↓
Supabase sends confirmation email (Template #1)
      ↓
User clicks "Confirm Your Email" button
      ↓
Redirected to /auth/callback
      ↓
No profile found → Onboarding page
      ↓
Complete onboarding → Dashboard
```

### Flow 2: Forgot Password

```
User clicks "Forgot?" link on login page
      ↓
Enters email address
      ↓
Supabase sends reset email (Template #2)
      ↓
User clicks "Reset My Password" button
      ↓
Redirected to /auth/reset-password page
      ↓
User enters new password
      ↓
Password updated → Dashboard
```

### Flow 3: Change Email

```
User goes to Profile page
      ↓
Clicks "Change Email" in Account Settings
      ↓
Enters new email address
      ↓
Supabase sends confirmation to NEW email (Template #3)
      ↓
User clicks "Confirm New Email" button (in new email inbox)
      ↓
Redirected to /auth/callback
      ↓
Email updated → Dashboard with success message
```

---

## 📂 File Structure

```
email-templates/
├── confirmation-email.html      # New user signup
├── reset-password-email.html    # Password recovery
└── change-email-email.html      # Email address change

app/
├── login/page.tsx               # Login/signup + forgot password
├── auth/
│   ├── callback/route.ts        # Handles all auth callbacks
│   └── reset-password/page.tsx  # Password reset form
└── profile/page.tsx             # Profile editing + email change
```

---

## 🎨 Customizing Templates

### Brand Colors

All templates use these MYC colors:
- Primary: `#FF6600` (Orange)
- Gradient: `#FF6600` to `#FF8533`
- Text: `#1A1A1A` (Dark gray)
- Background: `#F5F5F5` (Light gray)

### To Change Colors:

1. Open any template in `email-templates/`
2. Find the `<style>` section
3. Replace color values:
   ```css
   .header {
     background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR_LIGHTER 100%);
   }
   .button {
     background: #YOUR_COLOR;
   }
   ```

### To Change Text:

Just edit the HTML content between the `<div class="content">` tags. Keep the `{{ .ConfirmationURL }}` variable intact!

---

## 🔧 App Integration Details

### Auth Callback Route (`/auth/callback/route.ts`)

This route handles ALL auth callbacks and routes users appropriately:

```typescript
// Password reset → Reset password page
if (type === 'recovery') {
  return redirect('/auth/reset-password')
}

// Email change → Dashboard with success message
if (type === 'email_change') {
  return redirect('/dashboard?message=email_updated')
}

// Normal signup → Check if onboarded
if (profile has name) {
  return redirect('/dashboard')  // Already onboarded
} else {
  return redirect('/onboarding')  // New user
}
```

### Login Page (`/login/page.tsx`)

Features:
- ✅ Sign in / Sign up toggle
- ✅ "Forgot Password" link
- ✅ Forgot password form (slides in)
- ✅ Email confirmation handling
- ✅ Error messages

### Reset Password Page (`/auth/reset-password/page.tsx`)

Features:
- ✅ New password form
- ✅ Confirm password validation
- ✅ Success message
- ✅ Auto-redirect to dashboard
- ✅ Expired link handling

### Profile Page (`/profile/page.tsx`)

Features:
- ✅ All profile fields
- ✅ Account Settings section
- ✅ Current email display
- ✅ Change email form
- ✅ Email confirmation success message

---

## ✅ Testing Checklist

### Test 1: New Signup
- [ ] Create new account
- [ ] Receive confirmation email
- [ ] Email looks good on mobile/desktop
- [ ] Click confirmation link
- [ ] Lands on onboarding page
- [ ] Complete onboarding
- [ ] Lands on dashboard

### Test 2: Password Reset
- [ ] Click "Forgot?" on login
- [ ] Enter email
- [ ] Receive reset email
- [ ] Email looks good on mobile/desktop
- [ ] Click reset link
- [ ] Enter new password
- [ ] Password updated successfully
- [ ] Redirected to dashboard

### Test 3: Email Change
- [ ] Go to Profile page
- [ ] Click "Change Email"
- [ ] Enter new email
- [ ] Receive confirmation at NEW email
- [ ] Email looks good on mobile/desktop
- [ ] Click confirmation link
- [ ] Email updated successfully
- [ ] See success message on dashboard

### Test 4: Edge Cases
- [ ] Sign in → Dashboard (not onboarding)
- [ ] Sign in with existing user → Dashboard
- [ ] Click old signup confirmation link → Dashboard
- [ ] Try to reset with invalid email → Error shown
- [ ] Try to change to existing email → Error shown

---

## 🐛 Troubleshooting

### Email Not Sending?

1. **Check SMTP credentials**
   - Verify Resend API key is correct
   - Check sender email is verified in Resend

2. **Check Supabase logs**
   - Go to: Authentication → Logs
   - Look for email-related errors

3. **Check Resend dashboard**
   - Go to: Resend.com → Emails
   - Check delivery status

### Email Goes to Spam?

1. **Verify domain in Resend**
   - Add your domain
   - Set up SPF, DKIM, DMARC records

2. **Use professional sender address**
   - Don't use `noreply@`
   - Use `roasts@myc.app` or similar

### Links Not Working?

1. **Check redirect URLs in Supabase**
   - Go to: Authentication → URL Configuration
   - Add your production and local URLs
   - Format: `http://localhost:3000` and `https://yourdomain.com`

2. **Verify callback route**
   - Make sure `/auth/callback/route.ts` exists
   - Check no typos in the route

### Wrong Page After Clicking Link?

1. **Check callback logic**
   - Open `/app/auth/callback/route.ts`
   - Verify the type detection logic
   - Check profile query

2. **Check profile data**
   - Go to Supabase dashboard
   - Check profiles table
   - Verify `name` field exists for user

---

## 🎓 Email Template Variables

Supabase provides these variables you can use:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | The magic link | Required! |
| `{{ .Token }}` | Auth token | Optional |
| `{{ .Email }}` | User's email | `{{ .Email }}` |
| `{{ .Data.NAME }}` | Custom metadata | `{{ .Data.full_name }}` |

### Using Custom Data:

```javascript
// In signup:
await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
})
```

```html
<!-- In email template: -->
<p>Hi {{ .Data.full_name }},</p>
```

---

## 📊 Email Best Practices

### Design
- ✅ Keep it simple and focused
- ✅ Single clear call-to-action
- ✅ Mobile-first design
- ✅ Use web-safe fonts
- ✅ Inline CSS for compatibility

### Content
- ✅ Clear subject lines
- ✅ Explain what happens next
- ✅ Include security notes
- ✅ Add contact information
- ✅ Set expectations (expiry times)

### Security
- ✅ Always mention link expiry
- ✅ Tell users what to do if they didn't request it
- ✅ Never ask for passwords via email
- ✅ Use HTTPS links only

### Deliverability
- ✅ Verify sender domain
- ✅ Set up SPF/DKIM/DMARC
- ✅ Use consistent sender name
- ✅ Monitor bounce rates
- ✅ Don't use spam trigger words

---

## 🚀 Production Checklist

Before going live:

- [ ] All three email templates added to Supabase
- [ ] SMTP configured with Resend
- [ ] Sender domain verified in Resend
- [ ] DNS records (SPF, DKIM, DMARC) set up
- [ ] Tested all three email flows
- [ ] Checked emails on Gmail, Outlook, Apple Mail
- [ ] Verified mobile rendering
- [ ] Added production URL to Supabase redirect whitelist
- [ ] Environment variables set in production
- [ ] Monitored Resend dashboard for deliverability

---

## 📞 Support

If you run into issues:

1. Check this guide's troubleshooting section
2. Check Supabase auth logs
3. Check Resend delivery logs
4. Review the code comments in the app files
5. Test with a fresh incognito session

---

**All email templates are ready to use! Just paste them into Supabase and configure SMTP.** 🎉

