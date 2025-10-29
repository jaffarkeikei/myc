import { createClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client with service role (bypasses RLS)
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Mock data (without IDs - we'll get those from auth users)
const mockReviewers = [
  {
    role: 'reviewer' as const,
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    password: 'TestPassword123!',
    company: 'TechVentures',
    yc_batch: 'S19',
    industry: 'B2B SaaS',
    quick_context: 'Built a $50M ARR SaaS company, YC partner',
    roast_preferences: ['application', 'pitch'],
    roast_count: 23,
    is_available: true,
    linkedin: 'https://linkedin.com/in/sarahchen',
    x_twitter: '@sarahchen',
  },
  {
    role: 'reviewer' as const,
    name: 'Marcus Rodriguez',
    email: 'marcus.r@example.com',
    password: 'TestPassword123!',
    company: 'DataFlow AI',
    yc_batch: 'W21',
    industry: 'AI/ML',
    quick_context: 'AI researcher turned founder. Love technical deep-dives',
    roast_preferences: ['pitch', 'idea'],
    roast_count: 17,
    is_available: true,
    linkedin: 'https://linkedin.com/in/marcusrodriguez',
    x_twitter: '@marcusr',
  },
  {
    role: 'reviewer' as const,
    name: 'Emily Watson',
    email: 'emily.watson@example.com',
    password: 'TestPassword123!',
    company: 'HealthTech Labs',
    yc_batch: 'S20',
    industry: 'Healthcare',
    quick_context: 'Healthcare founder with 3 exits. Direct feedback style',
    roast_preferences: ['application', 'pitch'],
    roast_count: 31,
    is_available: false, // Currently not available
    linkedin: 'https://linkedin.com/in/emilywatson',
    x_twitter: '@emilywatson',
  },
  {
    role: 'reviewer' as const,
    name: 'Alex Kumar',
    email: 'alex.kumar@example.com',
    password: 'TestPassword123!',
    company: 'CloudScale',
    yc_batch: 'W22',
    industry: 'Developer Tools',
    quick_context: 'Ex-Google eng, scaled infra to 1B+ users',
    roast_preferences: ['application', 'pitch', 'idea'],
    roast_count: 12,
    is_available: true,
    linkedin: 'https://linkedin.com/in/alexkumar',
    x_twitter: '@alexkumar',
  },
  {
    role: 'reviewer' as const,
    name: 'Lisa Park',
    email: 'lisa.park@example.com',
    password: 'TestPassword123!',
    company: 'FinFlow',
    yc_batch: 'S18',
    industry: 'Fintech',
    quick_context: 'Fintech veteran, 2x YC founder, love finding product gaps',
    roast_preferences: ['pitch'],
    roast_count: 8,
    is_available: true,
    linkedin: 'https://linkedin.com/in/lisapark',
    x_twitter: '@lisapark',
  },
];

const mockApplicants = [
  {
    role: 'applicant' as const,
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    password: 'TestPassword123!',
    company: 'NextGen Analytics',
    yc_batch: null,
    industry: 'B2B SaaS',
    quick_context: 'Building analytics for modern data teams',
    roast_preferences: ['application', 'pitch'],
    roast_count: 3,
    is_available: false,
    linkedin: 'https://linkedin.com/in/jordanlee',
    x_twitter: '@jordanlee',
  },
  {
    role: 'applicant' as const,
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'TestPassword123!',
    company: 'EduConnect',
    yc_batch: null,
    industry: 'Education',
    quick_context: 'Making personalized learning accessible to everyone',
    roast_preferences: ['application'],
    roast_count: 1,
    is_available: false,
    linkedin: 'https://linkedin.com/in/priyasharma',
    x_twitter: '@priyasharma',
  },
  {
    role: 'applicant' as const,
    name: 'David Kim',
    email: 'david.kim@example.com',
    password: 'TestPassword123!',
    company: 'GreenTech Solutions',
    yc_batch: null,
    industry: 'Climate',
    quick_context: 'Carbon tracking for supply chains',
    roast_preferences: ['pitch', 'idea'],
    roast_count: 0,
    is_available: false,
    linkedin: 'https://linkedin.com/in/davidkim',
    x_twitter: '@davidkim',
  },
  {
    role: 'applicant' as const,
    name: 'Aisha Mohammed',
    email: 'aisha.mohammed@example.com',
    password: 'TestPassword123!',
    company: 'MediMatch',
    yc_batch: null,
    industry: 'Healthcare',
    quick_context: 'AI-powered patient-doctor matching platform',
    roast_preferences: ['application', 'pitch'],
    roast_count: 2,
    is_available: false,
    linkedin: 'https://linkedin.com/in/aishamohammed',
    x_twitter: '@aishamohammed',
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    const createdReviewers: any[] = [];
    const createdApplicants: any[] = [];

    // Create reviewer auth users and update their profiles
    console.log('📝 Creating reviewer users and profiles...');
    for (const reviewer of mockReviewers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: reviewer.email,
        password: reviewer.password,
        email_confirm: true,
        user_metadata: {
          name: reviewer.name,
        }
      });

      if (authError) {
        console.error(`Error creating auth user for ${reviewer.email}:`, authError);
        throw authError;
      }

      // Update the profile (auto-created by trigger) with additional data
      const { password, ...profileData } = reviewer;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update(profileData as any)
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) {
        console.error(`Error updating profile for ${reviewer.email}:`, profileError);
        throw profileError;
      }

      createdReviewers.push(profile);
      console.log(`   ✓ Created reviewer: ${reviewer.name}`);
    }
    console.log(`✅ Created ${createdReviewers.length} reviewer profiles\n`);

    // Create applicant auth users and update their profiles
    console.log('📝 Creating applicant users and profiles...');
    for (const applicant of mockApplicants) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: applicant.email,
        password: applicant.password,
        email_confirm: true,
        user_metadata: {
          name: applicant.name,
        }
      });

      if (authError) {
        console.error(`Error creating auth user for ${applicant.email}:`, authError);
        throw authError;
      }

      // Update the profile (auto-created by trigger) with additional data
      const { password, ...profileData } = applicant;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update(profileData as any)
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) {
        console.error(`Error updating profile for ${applicant.email}:`, profileError);
        throw profileError;
      }

      createdApplicants.push(profile);
      console.log(`   ✓ Created applicant: ${applicant.name}`);
    }
    console.log(`✅ Created ${createdApplicants.length} applicant profiles\n`);

    // Create mock meetings using the created user IDs
    const mockMeetings = [
      {
        applicant_id: createdApplicants[0].id,
        reviewer_id: createdReviewers[0].id,
        roast_type: 'application' as const,
        status: 'completed' as const,
        meeting_link: 'https://meet.google.com/abc-defg-hij',
        notes: 'Great traction, but need to clarify go-to-market strategy.',
        feedback_helpful: true,
        requested_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        scheduled_for: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        applicant_id: createdApplicants[1].id,
        reviewer_id: createdReviewers[1].id,
        roast_type: 'pitch' as const,
        status: 'accepted' as const,
        meeting_link: 'https://meet.google.com/xyz-uvwx-yz',
        notes: null,
        feedback_helpful: null,
        requested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        scheduled_for: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: null,
      },
      {
        applicant_id: createdApplicants[2].id,
        reviewer_id: createdReviewers[3].id,
        roast_type: 'application' as const,
        status: 'requested' as const,
        meeting_link: null,
        notes: null,
        feedback_helpful: null,
        requested_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        scheduled_for: null,
        completed_at: null,
      },
      {
        applicant_id: createdApplicants[3].id,
        reviewer_id: createdReviewers[0].id,
        roast_type: 'pitch' as const,
        status: 'completed' as const,
        meeting_link: 'https://meet.google.com/qrs-tuv-wxy',
        notes: 'Pitch deck needs work on market sizing. Technical approach is solid.',
        feedback_helpful: true,
        requested_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        scheduled_for: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        applicant_id: createdApplicants[0].id,
        reviewer_id: createdReviewers[4].id,
        roast_type: 'pitch' as const,
        status: 'cancelled' as const,
        meeting_link: null,
        notes: null,
        feedback_helpful: null,
        requested_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        scheduled_for: null,
        completed_at: null,
      },
    ];

    console.log('📝 Inserting meeting records...');
    const { data: meetings, error: meetingError } = await supabase
      .from('meetings')
      .insert(mockMeetings)
      .select();

    if (meetingError) {
      console.error('Error inserting meetings:', meetingError);
      throw meetingError;
    }
    console.log(`✅ Inserted ${meetings?.length} meeting records\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${createdReviewers.length} reviewers`);
    console.log(`   - ${createdApplicants.length} applicants`);
    console.log(`   - ${meetings?.length} meetings`);
    console.log('\n📝 You can log in with any of these test accounts:');
    console.log(`   Email: ${mockReviewers[0].email}`);
    console.log(`   Password: TestPassword123!`);
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
