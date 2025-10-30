# Supabase Authentication Configuration Fix

## Issue: Email Confirmation Links Redirecting to Reset Password

### Problem
When users click the email confirmation link for the first time, they're being redirected to the reset password page instead of login/onboarding. On the second click, they go to the login page.

### Root Cause
The auth callback handler was checking for password recovery too broadly, causing false positives for regular email confirmations.

### Code Fix Applied
Updated `/app/auth/callback/route.ts` to:
1. **Stricter recovery detection**: Now requires BOTH `type === 'recovery'` AND `next === 'reset-password'`
2. **Removed hash checking**: The previous code checked `requestUrl.hash?.includes('type=recovery')` which caused false positives
3. **Added logging**: Console logs to help debug auth flow issues

### Supabase Dashboard Configuration

To ensure this works correctly, verify these settings in your Supabase dashboard:

#### 1. Email Templates (Authentication > Email Templates)

**Confirm signup email:**
```html
Confirmation URL should be:
{{ .ConfirmationURL }}

NOT:
{{ .ConfirmationURL }}?type=recovery
```

**Magic Link email:**
```html
URL should be:
{{ .ConfirmationURL }}

NOT include any type parameter
```

**Reset Password email:**
```html
URL should be:
{{ .ConfirmationURL }}?type=recovery&next=reset-password
```

#### 2. URL Configuration (Authentication > URL Configuration)

**Site URL:**
```
https://myc-roast.com (or your production domain)
http://localhost:3000 (for local development)
```

**Redirect URLs (add these):**
```
https://myc-roast.com/auth/callback
https://myc-roast.com/auth/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

#### 3. Auth Settings (Authentication > Settings)

**Enable Email Confirmations:**
- ✅ Enable email confirmations
- ✅ Enable email change confirmations

**Email Auth Settings:**
- Confirm email: **Enabled**
- Secure email change: **Enabled** (requires confirmation)

### Testing the Fix

1. **Sign up with a new email**
   - Should receive confirmation email
   - First click should take to onboarding (new user) or dashboard (existing user)
   - Should NOT go to reset password

2. **Password reset flow**
   - Click "Forgot Password" on login page
   - Enter email
   - Reset email should have `type=recovery&next=reset-password` in URL
   - Click should take to reset password page

3. **Second click behavior**
   - Clicking confirmation link again after it's used should show "invalid_link" error
   - This is expected behavior (one-time use tokens)

### Monitoring

Check Vercel logs for these messages after deploying:
```
[Auth Callback] Received: { code: true, type: null, next: null }
[Auth Callback] Session created for user: [user-id]
[Auth Callback] Regular signup/confirmation flow
```

If you see `type: 'recovery'` for a regular signup, the email template in Supabase needs to be updated.

### What Changed in Code

**Before:**
```typescript
const isRecovery = type === 'recovery' ||
                  next === 'reset-password' ||
                  requestUrl.hash?.includes('type=recovery')  // ❌ Too broad
```

**After:**
```typescript
const isPasswordRecovery = type === 'recovery' && next === 'reset-password'  // ✅ Explicit
```

This ensures only ACTUAL password reset links trigger the reset password flow.
