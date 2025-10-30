# Supabase Password Reset Email Configuration

## Problem
Password reset emails from Supabase may not redirect users to the correct password reset page.

## Solution

### 1. Update Supabase Email Templates

Go to your Supabase Dashboard:
1. Navigate to **Authentication** > **Email Templates**
2. Find the **Reset Password** template
3. Update the confirmation link to include the type parameter

**Change the link from:**
```
{{ .ConfirmationURL }}
```

**To:**
```
{{ .SiteURL }}/auth/callback?code={{ .Token }}&type=recovery
```

### 2. Update Site URL in Supabase

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (development) or your production URL
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   - Your production URLs

### 3. Verify Email Template (Optional Custom HTML)

If you want to customize the email, here's a template:

```html
<h2>Reset Your Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?code={{ .Token }}&type=recovery">Reset Password</a></p>
<p>This link will expire in {{ .TokenExpiryDuration }}.</p>
```

### 4. Test the Flow

1. Click "Forgot Password" on login page
2. Enter your email
3. Check your email inbox
4. Click the reset link
5. You should be redirected to `/auth/reset-password`
6. Enter new password

## Current Implementation

The app handles password reset in these files:
- `/app/login/page.tsx` - Forgot password form
- `/app/auth/callback/route.ts` - Handles email verification and routing
- `/app/auth/reset-password/page.tsx` - Password reset form

## Troubleshooting

If the link still goes to login page:
1. Check browser console for errors
2. Verify the email link includes `type=recovery` parameter
3. Check that your Supabase project has email confirmation enabled
4. Make sure the Site URL matches your app's URL exactly
