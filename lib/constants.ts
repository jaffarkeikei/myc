// MYC Brand Colors & Configuration
export const COLORS = {
  primary: '#FF6600', // YC Orange
  primaryLight: '#FFF5EC', // Light orange background
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#DC2626',
  },
  background: '#FFFFFF',
  border: '#E5E5E5',
} as const

// Industry Options
export const INDUSTRIES = [
  'B2B SaaS',
  'Consumer',
  'Fintech',
  'Healthcare',
  'Education',
  'AI/ML',
  'Developer Tools',
  'Marketplace',
  'Hardware',
  'Biotech',
  'Climate',
  'Other',
] as const

// Roast Types
export const ROAST_TYPES = {
  application: {
    label: 'Application',
    icon: '📝',
    description: 'Get feedback on your YC application',
  },
  pitch: {
    label: 'Pitch Deck',
    icon: '📊',
    description: 'Practice and improve your pitch',
  },
} as const

// Meeting Configuration
export const MEETING_CONFIG = {
  duration: 10, // minutes
  maxRequestsPerDay: 3,
  autoAcceptThreshold: 5, // Auto-accept if reviewer has given 5+ roasts
} as const

// Copy & Messages
export const MESSAGES = {
  onboarding: {
    welcome: "Let's get you roasted! 🔥",
    selectRole: 'I want to:',
    selectType: 'Roast my:',
    context: "What I'm building (80 chars max):",
  },
  dashboard: {
    noRoasters: 'No roasters available right now. Check back soon!',
    requestSent: 'Your roast request has been sent! 🔥',
    requestAccepted: 'Your roast is cooking! Join the session now.',
  },
  email: {
    requestSubject: '🔥 New MYC roast request!',
    acceptedSubject: '🔥 Your MYC roast request was accepted!',
  },
} as const