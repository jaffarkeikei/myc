# MYC - Get Your YC Application Roasted 🔥

MYC is a platform that connects Y Combinator applicants with alumni and peers for brutally honest feedback through structured 10-minute sessions.

## Features

- **Quick Onboarding**: Sign up in 15 seconds
- **Role-based Experience**: Choose to get roasted (applicant) or give roasts (reviewer)
- **Roast Types**: Get feedback on applications, pitch decks, or ideas
- **Real-time Matching**: Connect with available reviewers instantly
- **10-Minute Sessions**: Quick, focused feedback sessions
- **Post-Roast Feedback**: Track helpful roasts and improve the community

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/myc.git
cd myc
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database:
Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor.

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/myc)

### Manual Deployment

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy!

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor

3. Enable Email Authentication:
   - Go to Authentication > Providers
   - Enable Email provider

4. (Optional) Enable Google OAuth:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

5. Configure URL settings:
   - Go to Authentication > URL Configuration
   - Add your production URL to Redirect URLs

## Project Structure

```
myc/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard
│   ├── login/            # Authentication
│   └── onboarding/       # User onboarding
├── components/            # React components
│   ├── RoastCard.tsx     # Reviewer card component
│   ├── MeetingList.tsx   # Meeting management
│   └── FeedbackModal.tsx # Post-roast feedback
├── lib/                   # Utilities and configuration
│   ├── supabase.ts       # Supabase client
│   ├── constants.ts      # App constants
│   └── database.types.ts # TypeScript types
└── supabase-schema.sql   # Database schema
```

## Key Features Implementation

### Authentication Flow
- Email/password authentication
- Google OAuth integration
- Protected routes with middleware
- Automatic profile creation on signup

### Roast Matching System
- Real-time availability status
- Roast type filtering (Application, Pitch, Idea)
- Industry-based matching
- Roast count tracking for social proof

### Meeting Management
- Request/accept/decline flow
- Automatic meeting link generation (using Jitsi)
- Real-time status updates
- Post-meeting feedback collection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For questions or issues, please open a GitHub issue or reach out on Twitter.

---
