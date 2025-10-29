import { Resend } from 'resend'

// Lazy load Resend to avoid client-side initialization
let resend: Resend | null = null

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

export interface RoastConfirmationEmailData {
  applicantName: string
  applicantEmail: string
  roasterName: string
  roasterEmail: string
  meetingLink: string
  roastType: string
}

/**
 * Send confirmation emails to both applicant and roaster
 */
export async function sendRoastConfirmationEmails(data: RoastConfirmationEmailData) {
  const { applicantName, applicantEmail, roasterName, roasterEmail, meetingLink, roastType } = data

  try {
    const client = getResendClient()

    // Email to applicant
    await client.emails.send({
      from: 'MYC <hello@myc-roast.com>',
      to: applicantEmail,
      subject: '🔥 Your MYC roast session is confirmed!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1A1A1A;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                color: #FF6600;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              .content {
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background: #FF6600;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 500;
              }
              .info {
                background: #F5F5F5;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
              }
              .footer {
                color: #666666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E5E5E5;
              }
            </style>
          </head>
          <body>
            <div class="header">MYC</div>

            <div class="content">
              <p>Hi ${applicantName},</p>

              <p><strong>Your roast session with ${roasterName} is confirmed!</strong></p>

              <div class="info">
                <strong>Roast Type:</strong> ${roastType}<br>
                <strong>Duration:</strong> 10 minutes<br>
                <strong>Roaster:</strong> ${roasterName}
              </div>

              <p>Join the meeting when you're ready:</p>

              <a href="${meetingLink}" class="button">Join Roast Session</a>

              <p><strong>Important:</strong> This is a strict 10-minute session. Come prepared with your ${roastType.toLowerCase()} ready to share!</p>

              <p>Remember: You're here for honest, brutal feedback. No sugar-coating!</p>
            </div>

            <div class="footer">
              <p>This link expires in 24 hours.</p>
              <p>By using MYC, you agree to receive brutally honest feedback.</p>
            </div>
          </body>
        </html>
      `
    })

    // Email to roaster
    await client.emails.send({
      from: 'MYC <hello@myc-roast.com>',
      to: roasterEmail,
      subject: '🔥 Roast session confirmed - Ready to give feedback!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1A1A1A;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                color: #FF6600;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              .content {
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background: #FF6600;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 500;
              }
              .info {
                background: #F5F5F5;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
              }
              .footer {
                color: #666666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E5E5E5;
              }
            </style>
          </head>
          <body>
            <div class="header">MYC</div>

            <div class="content">
              <p>Hi ${roasterName},</p>

              <p><strong>Your roast session with ${applicantName} is confirmed!</strong></p>

              <div class="info">
                <strong>Roast Type:</strong> ${roastType}<br>
                <strong>Duration:</strong> 10 minutes<br>
                <strong>Applicant:</strong> ${applicantName}
              </div>

              <p>Join the meeting when you're ready to give feedback:</p>

              <a href="${meetingLink}" class="button">Join Roast Session</a>

              <p><strong>Remember:</strong> Be honest and direct. That's what they're here for! Focus on constructive criticism that will help improve their ${roastType.toLowerCase()}.</p>
            </div>

            <div class="footer">
              <p>This link expires in 24 hours.</p>
              <p>Thank you for helping the YC community!</p>
            </div>
          </body>
        </html>
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending emails:', error)
    return { success: false, error }
  }
}

/**
 * Send notification email to roaster when they receive a new request
 */
export async function sendNewRequestNotification(
  roasterEmail: string,
  roasterName: string,
  applicantName: string,
  applicantCompany: string | null,
  roastType: string
) {
  try {
    const client = getResendClient()

    await client.emails.send({
      from: 'MYC <hello@myc-roast.com>',
      to: roasterEmail,
      subject: '🔥 New roast request from ' + applicantName,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1A1A1A;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                color: #FF6600;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              .info {
                background: #F5F5F5;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
              }
              .button {
                display: inline-block;
                background: #FF6600;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="header">MYC</div>

            <p>Hi ${roasterName},</p>

            <p><strong>You have a new roast request!</strong></p>

            <div class="info">
              <strong>From:</strong> ${applicantName}${applicantCompany ? ` from ${applicantCompany}` : ''}<br>
              <strong>Roast Type:</strong> ${roastType}
            </div>

            <p>Log in to your dashboard to accept or decline this request:</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://myc.app'}/dashboard" class="button">View Request</a>
          </body>
        </html>
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending notification:', error)
    return { success: false, error }
  }
}
