# Supabase Email Confirmation Setup

## Option 1: Use Supabase Email Templates (Easiest)

Supabase has built-in email templates that you can customize in your dashboard.

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to: `Authentication` → `Email Templates`
   - URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates`

2. **Configure Email Confirmation Template**
   - Find the "Confirm signup" template
   - Copy the contents from `email-templates/confirmation-email.html`
   - Paste it into the template editor
   - **Important**: Make sure to keep the `{{ .ConfirmationURL }}` variable - Supabase will replace this with the actual confirmation link

3. **Configure SMTP Settings (for Resend)**
   - Go to: `Project Settings` → `Auth` → `SMTP Settings`
   - Enable "Enable Custom SMTP"
   - Fill in the following:

   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: YOUR_RESEND_API_KEY (starts with re_)
   Sender email: roasts@myc.app (or your verified domain)
   Sender name: MYC
   ```

4. **Test the Email**
   - Create a new test account on your app
   - Check that the email arrives with your custom template
   - Verify the confirmation link works

---

## Option 2: Use Supabase Webhooks + Resend (Advanced)

If you want more control and want to send emails through Resend directly using their API (not SMTP), you can use webhooks.

### Steps:

1. **Create an API Route for the Webhook**

   The code is provided in `app/api/webhooks/auth/route.ts`

2. **Configure Webhook in Supabase**
   - Go to: `Database` → `Webhooks`
   - Click "Create a new hook"
   - Configure:
     ```
     Name: Send Confirmation Email
     Table: auth.users
     Events: INSERT
     Type: HTTP Request
     HTTP Method: POST
     URL: https://your-app.vercel.app/api/webhooks/auth
     HTTP Headers:
       Content-Type: application/json
       Authorization: Bearer YOUR_WEBHOOK_SECRET
     ```

3. **Add Webhook Secret to Environment Variables**
   ```env
   WEBHOOK_SECRET=your_random_secret_string
   ```

---

## Recommended Approach

**Use Option 1** (Supabase SMTP with Resend) because:
- ✅ Simpler setup
- ✅ Supabase handles confirmation URL generation
- ✅ Less code to maintain
- ✅ Built-in retry logic
- ✅ Resend's SMTP is reliable and fast

Only use Option 2 if you need:
- Complex email logic
- A/B testing different email templates
- Advanced analytics
- Custom confirmation flows

---

## Supabase Email Variables

When customizing the email template, you can use these Supabase variables:

- `{{ .ConfirmationURL }}` - The confirmation link (required!)
- `{{ .Token }}` - The confirmation token
- `{{ .Email }}` - User's email address
- `{{ .Data.* }}` - Any user metadata you added during signup

Example with user metadata:
```javascript
// When signing up, add metadata:
await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      full_name: 'John Doe',
      role: 'applicant'
    }
  }
})
```

Then in email template:
```html
<p>Hi {{ .Data.full_name }},</p>
```

---

## Testing Your Email Template

### Local Testing
1. Run your app locally: `npm run dev`
2. Use a test email service like [MailHog](https://github.com/mailhog/MailHog) or [Mailtrap](https://mailtrap.io)
3. Configure Supabase to use the test SMTP

### Production Testing
1. Send a test email from Supabase dashboard
2. Use your own email address
3. Verify:
   - ✅ Email arrives within seconds
   - ✅ Formatting looks good on desktop and mobile
   - ✅ Confirmation link works
   - ✅ Redirects to correct page (onboarding for new users, dashboard for returning users)

---

## Troubleshooting

### Email not sending?
- Check SMTP credentials are correct
- Verify Resend API key is valid
- Check Resend dashboard for delivery logs
- Make sure sender email is verified in Resend

### Confirmation link not working?
- Check that `emailRedirectTo` matches your domain
- Verify the domain is added to Supabase's redirect URL allowlist:
  - Go to: `Authentication` → `URL Configuration`
  - Add your production and local URLs

### Email goes to spam?
- Set up SPF, DKIM, and DMARC records for your domain in Resend
- Verify your domain in Resend
- Test with different email providers
- Use a professional "from" address (not no-reply@)

---

## Email Best Practices

1. **Always test on multiple email clients**
   - Gmail, Outlook, Apple Mail, Yahoo
   - Desktop and mobile

2. **Keep it simple**
   - Clear call-to-action button
   - Minimal text
   - Fast load times

3. **Mobile-first design**
   - Large buttons (min 44px height)
   - Readable text (min 14px)
   - Single column layout

4. **Include security info**
   - Link expiration time
   - What to do if they didn't request this
   - Contact information

5. **Brand consistency**
   - Use your brand colors
   - Include logo
   - Match your app's tone and style

---

## Ready to Deploy?

After setting up emails:

1. Test thoroughly in development
2. Update your `.env.local` with Resend credentials
3. Add the same env vars to Vercel
4. Configure Supabase SMTP settings
5. Deploy and test in production
6. Monitor Resend dashboard for delivery rates

Need help? Check the main DEPLOYMENT.md file for the full deployment guide.

