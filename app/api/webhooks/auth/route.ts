import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await request.json()
    
    // Check if this is a new user signup
    const { type, record } = payload
    
    if (type === 'INSERT' && record) {
      const { email, id, confirmation_token } = record
      
      // Generate confirmation URL
      const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${confirmation_token}`
      
      // Send confirmation email via Resend
      await resend.emails.send({
        from: 'MYC <hello@myc-roast.com>',
        to: email,
        subject: '🔥 Confirm your MYC account',
        html: generateConfirmationEmail(confirmationUrl)
      })
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ message: 'No action needed' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateConfirmationEmail(confirmationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm your MYC account</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1A1A1A;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #FF6600 0%, #FF8533 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .logo {
            font-size: 48px;
            font-weight: bold;
            color: white;
            margin: 0;
            letter-spacing: 2px;
          }
          .tagline {
            color: rgba(255, 255, 255, 0.95);
            font-size: 16px;
            margin-top: 8px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #1A1A1A;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .content p {
            margin: 15px 0;
            color: #4A4A4A;
          }
          .button {
            display: inline-block;
            background: #FF6600;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            margin: 30px 0;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
          }
          .button-container {
            text-align: center;
          }
          .info-box {
            background: #FFF5ED;
            border-left: 4px solid #FF6600;
            padding: 15px 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 5px 0;
            color: #1A1A1A;
          }
          .footer {
            background: #F5F5F5;
            padding: 30px;
            text-align: center;
            color: #666666;
            font-size: 14px;
          }
          .footer a {
            color: #FF6600;
            text-decoration: none;
          }
          .divider {
            height: 1px;
            background: #E5E5E5;
            margin: 30px 0;
          }
          .emoji {
            font-size: 32px;
            margin-bottom: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1 class="logo">MYC</h1>
            <p class="tagline">Get your YC application roasted</p>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="emoji">🔥</div>
            <h2>Welcome to MYC!</h2>
            
            <p>Thanks for joining the community where founders get brutally honest feedback on their YC applications.</p>
            
            <p>Click the button below to confirm your email and complete your profile:</p>

            <div class="button-container">
              <a href="${confirmationUrl}" class="button">
                Confirm Your Email
              </a>
            </div>

            <div class="info-box">
              <p><strong>What happens next?</strong></p>
              <p>• Complete your profile with your background and preferences</p>
              <p>• Get matched with founders and YC alumni</p>
              <p>• Participate in 10-minute roast sessions</p>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #666;">
              <strong>Note:</strong> This confirmation link will expire in 24 hours. If you didn't create an account with MYC, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>
              <strong>MYC</strong> - 10-minute sessions. No DMs. Just feedback.
            </p>
            <p style="margin-top: 10px;">
              Questions? Reply to this email or visit <a href="https://myc.app">myc.app</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

