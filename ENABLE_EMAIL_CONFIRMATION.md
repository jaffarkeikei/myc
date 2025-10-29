# Enable Email Confirmation in Supabase

## 🚨 Issue: Users are auto-logged in without email confirmation

This happens when email confirmation is disabled in Supabase settings.

---

## ✅ How to Enable Email Confirmation

### Step 1: Go to Supabase Auth Settings

1. Open your Supabase Dashboard
2. Navigate to: **Authentication** → **Settings**
3. URL format: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/settings`

### Step 2: Enable Email Confirmation

Scroll down to find the **"Enable email confirmations"** setting:

1. Look for section: **"Email Auth"** or **"Email"**
2. Find the toggle: **"Enable email confirmations"**
3. **Turn it ON** ✅
4. Click **"Save"** at the bottom

### Step 3: Configure Email Settings

While you're there, also check:

1. **"Enable email change confirmations"** - ✅ ON
2. **"Enable signup"** - ✅ ON (if you want new users to sign up)
3. **Confirm email** - Set to **"required"** or **"enabled"**

---

## 📧 Verify SMTP is Configured

Make sure your SMTP settings are configured (from our previous setup):

### Go to: Project Settings → Auth → SMTP Settings

Should look like this:
```
✅ Enable Custom SMTP: ON

Host: smtp.resend.com
Port: 587
Username: resend
Password: re_••••••••••••••••
Sender email: roasts@myc.app
Sender name: MYC
```

If not configured, add these settings with your Resend API key.

---

## 🧪 Test the Flow

After enabling email confirmation:

### Test 1: New Signup
1. Go to your site: https://myc-roast.com
2. Click "Get Started"
3. Enter email and password
4. Click "Sign Up"
5. **Expected**: See message "Check your email for the confirmation link!"
6. **Expected**: Do NOT get logged in immediately
7. Check your email inbox
8. Click the confirmation link
9. **Expected**: Redirected to onboarding page
10. Complete onboarding
11. **Expected**: Redirected to dashboard

### Test 2: Sign In Before Confirmation
1. Try to sign in with unconfirmed account
2. **Expected**: Error message "Please verify your email before logging in"
3. **Expected**: Not allowed to proceed

### Test 3: Sign In After Confirmation
1. Confirm email (from test 1)
2. Try to sign in
3. **Expected**: Successful login → Dashboard (if onboarded) or Onboarding (if new)

---

## 🔍 Troubleshooting

### Issue: Still auto-logging in after enabling
**Solution:** 
1. Sign out completely
2. Clear browser cache/cookies
3. Try with incognito window
4. Make sure you saved the Supabase settings

### Issue: Not receiving confirmation emails
**Solution:**
1. Check SMTP settings are correct
2. Verify Resend API key is valid
3. Check Resend dashboard for delivery logs
4. Check spam folder
5. Verify sender email is authorized in Resend

### Issue: Confirmation link not working
**Solution:**
1. Check redirect URLs are whitelisted in Supabase:
   - Go to: Authentication → URL Configuration
   - Add: `https://myc-roast.com`, `http://localhost:3000`
2. Make sure email template has `{{ .ConfirmationURL }}` variable

### Issue: Users stuck in onboarding
**Solution:**
1. They need to complete the onboarding form fully (especially the "Name" field)
2. Or use the "Sign Out" button on the login page to start fresh

---

## ⚙️ Recommended Supabase Auth Settings

Here's the complete recommended configuration:

```
Authentication Settings
├── Email Auth
│   ├── ✅ Enable email confirmations
│   ├── ✅ Enable email change confirmations
│   └── ✅ Enable signup
│
├── Password Requirements
│   └── Minimum password length: 6
│
├── Email Rate Limits
│   └── Set reasonable limits (e.g., 3 emails per hour per user)
│
└── Auth Providers
    └── Email (enabled)
```

---

## 📱 What Users Will Experience

### Current Behavior (Email Confirmation OFF):
```
Sign Up → Immediately Logged In → Onboarding → Dashboard
```
❌ **Problem**: No email verification, anyone can use any email

### Correct Behavior (Email Confirmation ON):
```
Sign Up → "Check your email!" message → 
Check Email → Click Link → Onboarding → Dashboard
```
✅ **Benefit**: Email addresses are verified, more secure

---

## 🔐 Security Benefits

Enabling email confirmation provides:

1. **Email Verification**: Ensures users own the email address
2. **Prevents Spam**: Stops fake account creation
3. **Better Data**: Real, verified user emails
4. **Trust**: Users know their account is secure
5. **Compliance**: Required for many email marketing regulations

---

## 🚀 Quick Checklist

Before going live, verify:

- [ ] Email confirmation is **enabled** in Supabase
- [ ] SMTP is configured with Resend
- [ ] All 3 email templates are added (confirmation, password reset, email change)
- [ ] Sender domain is verified in Resend
- [ ] SPF/DKIM/DMARC records are set up (optional but recommended)
- [ ] Redirect URLs are whitelisted in Supabase
- [ ] Tested signup flow end-to-end
- [ ] Tested with different email providers (Gmail, Outlook, etc.)

---

## 📞 Still Having Issues?

If email confirmation still doesn't work after following this guide:

1. **Check Supabase Logs**
   - Go to: Authentication → Logs
   - Look for signup events
   - Check for any errors

2. **Check Resend Logs**
   - Go to: Resend Dashboard → Emails
   - Verify emails are being sent
   - Check delivery status

3. **Test with Different Email**
   - Some email providers are more strict
   - Try with Gmail first (usually most reliable)

4. **Verify Environment Variables**
   - Make sure production has same env vars as local
   - Check Vercel deployment settings

---

**After enabling email confirmation, your users will receive beautiful branded confirmation emails before they can access the app!** 🎉

