/**
 * @file seedDemo.js
 * @description Comprehensive seed script that creates a fully-populated demo
 *              therapist account (demo@gmail.com / Password123!) with rich data
 *              across ALL collections to demonstrate every feature of the platform.
 *
 * Usage: node src/scripts/seedDemo.js
 *
 * What gets seeded:
 *   ✓ Therapist (demo@gmail.com, slug: demo, Pro tier)
 *   ✓ Subscription Tier Configs (all 4 tiers)
 *   ✓ 6 Clients (various statuses and tags)
 *   ✓ Weekly Availability (Mon-Sat schedule)
 *   ✓ 5 Leads (various pipeline stages)
 *   ✓ 3 Packages (session bundles)
 *   ✓ 2 Client Packages (purchased bundles)
 *   ✓ 20+ Sessions (past completed, no-shows, upcoming with AI risk)
 *   ✓ 12+ Session Notes (SOAP, DAP, progress with sentiment analysis)
 *   ✓ 25+ Payments (multi-month revenue history)
 *   ✓ 5 CBT Thought Records (homework exercises)
 *   ✓ 3 Crisis Alerts (SOS early-warning)
 *   ✓ 10+ Notifications (reminders & system alerts)
 *   ✓ AI Insights cache (no-show, sentiment, forecast, scheduling)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  Therapist,
  Client,
  Session,
  SessionNote,
  Payment,
  Package,
  ClientPackage,
  Lead,
  Availability,
  SubscriptionTierConfig,
  AIInsight,
  CBTThoughtRecord,
  CrisisAlert,
  Notification,
} = require('../models');

// ── Helpers ──────────────────────────────────────────────────────────────────
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
const setTime = (date, h, m = 0) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};
const endTime = (date, mins) => new Date(date.getTime() + mins * 60 * 1000);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ─── Main Seed Function ──────────────────────────────────────────────────────
const seedDemo = async () => {
  await connectDB();
  console.log('\n🌱 ═══════════════════════════════════════════════════════');
  console.log('   UNFAZED — Comprehensive Demo Data Seeder');
  console.log('   ═══════════════════════════════════════════════════════\n');

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // 0. SEED SUBSCRIPTION TIERS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📋 Step 0: Seeding Subscription Tier Configs...');
    const seedTiers = require('./seedTiers');
    // seedTiers exports the function but also runs on require.main === module.
    // We'll manually seed tiers here.
    const tiersData = [
      {
        tier: 'free', displayName: 'Free Tier',
        description: 'Perfect for new independent practitioners starting out.',
        displayOrder: 1, isAvailable: true,
        limits: { maxClients: 5, maxSessionsPerMonth: 15, maxPackages: 1, maxConcurrentRooms: 1, maxTeamMembers: 0, storageGb: 1, maxLeads: 10, dataRetentionDays: 90 },
        features: { videoCall: true, aiNoteSuggestions: false, digitalSignature: false, publicBookingPage: true, automatedReminders: false, clientPortal: true, intakeForms: true, sessionPackages: true, onlinePayments: true, basicAnalytics: true, customBranding: false },
        pricing: { monthlyPrice: 0, annualPrice: 0, currency: 'INR', tagLine: 'Forever free for up to 5 clients', isHighlighted: false },
      },
      {
        tier: 'starter', displayName: 'Starter Plan',
        description: 'For growing practices needing automated reminders and client portal.',
        displayOrder: 2, isAvailable: true,
        limits: { maxClients: 25, maxSessionsPerMonth: 80, maxPackages: 5, maxConcurrentRooms: 1, maxTeamMembers: 0, storageGb: 10, maxLeads: 50, dataRetentionDays: 365 },
        features: { videoCall: true, aiNoteSuggestions: false, digitalSignature: true, publicBookingPage: true, automatedReminders: true, recurringBookings: true, calendarSync: true, clientPortal: true, secureMessaging: true, intakeForms: true, sessionPackages: true, onlinePayments: true, automatedInvoicing: true, basicAnalytics: true, customBranding: true },
        pricing: { monthlyPrice: 99900, annualPrice: 999000, currency: 'INR', tagLine: 'Essential tools for individual therapists', isHighlighted: false },
      },
      {
        tier: 'pro', displayName: 'Pro Plan',
        description: 'Full-featured suite with AI assistant, custom branding, and white-labeling.',
        displayOrder: 3, isAvailable: true,
        limits: { maxClients: -1, maxSessionsPerMonth: -1, maxPackages: -1, maxConcurrentRooms: 2, maxTeamMembers: 2, storageGb: 50, maxLeads: -1, dataRetentionDays: -1 },
        features: { videoCall: true, aiNoteSuggestions: true, digitalSignature: true, publicBookingPage: true, automatedReminders: true, recurringBookings: true, calendarSync: true, clientPortal: true, secureMessaging: true, intakeForms: true, sessionPackages: true, onlinePayments: true, automatedInvoicing: true, basicAnalytics: true, advancedAnalytics: true, customBranding: true, whiteLabel: true, customDomain: true, prioritySupport: true, complianceDocs: true, aiNoShowPrediction: true, aiSentimentAnalysis: true, aiSmartScheduling: true, aiRevenueForecast: true },
        pricing: { monthlyPrice: 249900, annualPrice: 2499000, currency: 'INR', tagLine: 'Most popular choice for professional therapy practices', isHighlighted: true },
      },
      {
        tier: 'enterprise', displayName: 'Enterprise Clinic',
        description: 'Designed for multi-therapist clinics, hospitals, and group practices.',
        displayOrder: 4, isAvailable: true,
        limits: { maxClients: -1, maxSessionsPerMonth: -1, maxPackages: -1, maxConcurrentRooms: 10, maxTeamMembers: 20, storageGb: 500, maxLeads: -1, dataRetentionDays: -1 },
        features: { videoCall: true, aiNoteSuggestions: true, digitalSignature: true, publicBookingPage: true, automatedReminders: true, recurringBookings: true, calendarSync: true, clientPortal: true, secureMessaging: true, intakeForms: true, sessionPackages: true, onlinePayments: true, automatedInvoicing: true, basicAnalytics: true, advancedAnalytics: true, customBranding: true, whiteLabel: true, customDomain: true, prioritySupport: true, dedicatedAccountManager: true, complianceDocs: true, aiNoShowPrediction: true, aiSentimentAnalysis: true, aiSmartScheduling: true, aiRevenueForecast: true },
        pricing: { monthlyPrice: 599900, annualPrice: 5999000, currency: 'INR', tagLine: 'Custom onboarding and clinic management', isHighlighted: false },
      },
    ];
    for (const t of tiersData) {
      await SubscriptionTierConfig.findOneAndUpdate({ tier: t.tier }, t, { upsert: true, new: true, runValidators: true });
    }
    console.log('   ✅ 4 Subscription Tiers seeded.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CREATE DEMO THERAPIST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('👤 Step 1: Creating Demo Therapist...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    let therapist = await Therapist.findOne({ email: 'demo@gmail.com' });
    if (therapist) {
      // Clean all existing data for this therapist to re-seed fresh
      console.log('   🧹 Cleaning existing demo data...');
      const tId = therapist._id;
      await Promise.all([
        Client.deleteMany({ therapistId: tId }),
        Session.deleteMany({ therapistId: tId }),
        SessionNote.deleteMany({ therapistId: tId }),
        Payment.deleteMany({ therapistId: tId }),
        Package.deleteMany({ therapistId: tId }),
        ClientPackage.deleteMany({ therapistId: tId }),
        Lead.deleteMany({ therapistId: tId }),
        Availability.deleteMany({ therapistId: tId }),
        AIInsight.deleteMany({ therapistId: tId }),
        CBTThoughtRecord.deleteMany({ therapistId: tId }),
        CrisisAlert.deleteMany({ therapistId: tId }),
        Notification.deleteMany({ therapistId: tId }),
      ]);
      await Therapist.deleteOne({ _id: tId });
    }

    therapist = await Therapist.create({
      name: 'Demo Therapist',
      email: 'demo@gmail.com',
      password: passwordHash,
      phone: '+91 98765 00000',
      slug: 'demo',
      practiceName: 'Unfazed Wellness Studio',
      brandColor: '#6C63FF',
      subscriptionTier: 'pro',
      isVerified: true,
      isActive: true,
      isBookingOpen: true,
      isEmailVerified: true,
      lastLoginAt: new Date(),
      professionalDetails: {
        licenseNumber: 'RCI/DEL/2019/7890',
        yearsOfExperience: 10,
        specializations: [
          'Cognitive Behavioral Therapy (CBT)',
          'Anxiety & Depression',
          'Trauma & PTSD',
          'Mindfulness-Based Stress Reduction',
          'Couples Therapy',
        ],
        languages: ['English', 'Hindi', 'Punjabi'],
        bio: 'Board-certified Clinical Psychologist with 10+ years of experience specializing in evidence-based CBT, trauma-informed care, and mindfulness approaches. Passionate about making mental healthcare accessible through technology.',
        qualifications: [
          'Ph.D. Clinical Psychology (NIMHANS Bangalore)',
          'M.Phil Clinical Psychology (AIIMS Delhi)',
          'Certified EMDR Practitioner',
        ],
      },
      socialLinks: {
        website: 'https://unfazedwellness.in',
        linkedin: 'https://linkedin.com/in/demo-therapist',
        instagram: 'https://instagram.com/unfazed.wellness',
      },
      sessionPricing: {
        individual: 200000,   // ₹2,000
        couples: 300000,      // ₹3,000
        family: 350000,       // ₹3,500
        group: 150000,        // ₹1,500
        consultation: 0,      // Free
        follow_up: 120000,    // ₹1,200
      },
      payoutDetails: {
        accountHolderName: 'Demo Therapist',
        accountNumber: 'XXXX-XXXX-1234',
        ifscCode: 'SBIN0001234',
        upiId: 'demo@upi',
      },
    });
    const tId = therapist._id;
    console.log(`   ✅ Created: ${therapist.name} (${therapist.email}) — slug: /${therapist.slug}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CREATE CLIENTS (6 diverse clients)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('👥 Step 2: Creating Clients...');
    const clientsData = [
      {
        therapistId: tId,
        name: 'Ananya Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 98201 54321',
        gender: 'Female',
        dateOfBirth: new Date('1994-06-15'),
        status: 'active',
        tag: 'moderate_risk',
        onboardedAt: daysAgo(90),
        preferredSessionMedium: 'video',
        intake: {
          presentingConcerns: 'Work-related burnout, panic episodes, and sleep disruptions. Reports feeling overwhelmed by deadlines and unable to "switch off" after work hours.',
          medicalHistory: 'No major medical conditions. Mild iron deficiency.',
          currentMedications: ['Melatonin 3mg (for sleep)'],
          previousTherapyHistory: 'Brief counseling during college for academic stress (6 sessions, 2016).',
          goals: 'Develop emotional regulation tools, establish work-life boundaries, and improve sleep quality.',
          referralSource: 'google',
        },
        emergencyContact: { name: 'Priya Deshmukh', relationship: 'Mother', phone: '+91 98201 11111' },
        consent: { isConsentAccepted: true, consentAcceptedAt: daysAgo(90), consentSignatureName: 'Ananya Deshmukh', consentVersion: '1.0' },
        internalNotes: 'Very engaged client. Responds well to CBT techniques. Shows consistent progress.',
      },
      {
        therapistId: tId,
        name: 'Vikram Mehta',
        email: 'vikram.mehta@example.com',
        phone: '+91 99302 67890',
        gender: 'Male',
        dateOfBirth: new Date('1988-11-20'),
        status: 'active',
        tag: 'high_risk',
        onboardedAt: daysAgo(60),
        preferredSessionMedium: 'in_person',
        intake: {
          presentingConcerns: 'Generalized anxiety disorder with social phobia. Avoids public speaking and networking events. Recent relationship breakup causing additional distress.',
          medicalHistory: 'History of childhood asthma. No current conditions.',
          goals: 'Improve confidence in social interactions, manage breakup grief, reduce avoidance behaviors.',
          referralSource: 'referral',
        },
        emergencyContact: { name: 'Rahul Mehta', relationship: 'Brother', phone: '+91 99302 22222' },
        consent: { isConsentAccepted: true, consentAcceptedAt: daysAgo(60), consentSignatureName: 'Vikram Mehta' },
        internalNotes: 'Has history of no-shows. Needs reminder calls before sessions. Consider motivational interviewing.',
      },
      {
        therapistId: tId,
        name: 'Sneha Kapoor',
        email: 'sneha.kapoor@example.com',
        phone: '+91 98403 78901',
        gender: 'Female',
        dateOfBirth: new Date('1996-03-08'),
        status: 'active',
        tag: 'vip',
        onboardedAt: daysAgo(120),
        preferredSessionMedium: 'video',
        intake: {
          presentingConcerns: 'Navigating a major life transition after divorce. Struggling with self-esteem and identity issues.',
          goals: 'Build healthy boundaries, develop self-compassion, and create a new vision for life post-divorce.',
          referralSource: 'instagram',
        },
        consent: { isConsentAccepted: true, consentAcceptedAt: daysAgo(120), consentSignatureName: 'Sneha Kapoor' },
        internalNotes: 'Long-term client. Excellent therapeutic alliance. Making tremendous progress.',
      },
      {
        therapistId: tId,
        name: 'Arjun Nair',
        email: 'arjun.nair@example.com',
        phone: '+91 97654 12345',
        gender: 'Male',
        dateOfBirth: new Date('2001-09-12'),
        status: 'active',
        tag: 'new',
        onboardedAt: daysAgo(7),
        preferredSessionMedium: 'video',
        intake: {
          presentingConcerns: 'Academic pressure and performance anxiety as a final-year engineering student. Reports frequent headaches and difficulty concentrating.',
          goals: 'Learn stress management techniques, improve study habits, and reduce performance anxiety.',
          referralSource: 'booking_page',
        },
        consent: { isConsentAccepted: true, consentAcceptedAt: daysAgo(7), consentSignatureName: 'Arjun Nair' },
        internalNotes: 'New client — intake session completed. Appears motivated for therapy.',
      },
      {
        therapistId: tId,
        name: 'Meera Iyer',
        email: 'meera.iyer@example.com',
        phone: '+91 98765 67890',
        gender: 'Female',
        dateOfBirth: new Date('1985-12-25'),
        status: 'on_hold',
        tag: 'low_risk',
        onboardedAt: daysAgo(180),
        preferredSessionMedium: 'audio',
        intake: {
          presentingConcerns: 'Postpartum adjustment difficulties. Feeling disconnected from baby and partner.',
          goals: 'Strengthen maternal bonding, improve couple communication, and address mood fluctuations.',
          referralSource: 'referral',
        },
        consent: { isConsentAccepted: true, consentAcceptedAt: daysAgo(180), consentSignatureName: 'Meera Iyer' },
        internalNotes: 'On hold — client traveling abroad for 2 months. Will resume in December.',
      },
      {
        therapistId: tId,
        name: 'Ravi Shankar',
        email: 'ravi.shankar@example.com',
        phone: '+91 98111 99999',
        gender: 'Male',
        dateOfBirth: new Date('1975-07-04'),
        status: 'discharged',
        tag: 'none',
        onboardedAt: daysAgo(365),
        dischargedAt: daysAgo(30),
        preferredSessionMedium: 'in_person',
        intake: {
          presentingConcerns: 'Mid-life career transition anxiety. Fear of financial instability after leaving corporate job.',
          goals: 'Build emotional resilience for career change. Develop a clear action plan.',
          referralSource: 'linkedin',
        },
        internalNotes: 'Successfully discharged after 12 sessions. Client met all therapeutic goals. Great outcome.',
      },
    ];

    const clients = [];
    for (const c of clientsData) {
      const client = await Client.create(c);
      clients.push(client);
      console.log(`   ✅ ${client.name} (${client.status}, ${client.tag})`);
    }
    const [ananya, vikram, sneha, arjun, meera, ravi] = clients;
    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. AVAILABILITY (Weekly Schedule)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📅 Step 3: Setting up Weekly Availability...');
    const scheduleConfig = [
      { day: 1, label: 'Monday',    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '19:00' }] },
      { day: 2, label: 'Tuesday',   slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
      { day: 3, label: 'Wednesday', slots: [{ startTime: '10:00', endTime: '13:00' }, { startTime: '15:00', endTime: '20:00' }] },
      { day: 4, label: 'Thursday',  slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '18:00' }] },
      { day: 5, label: 'Friday',    slots: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '17:00' }] },
      { day: 6, label: 'Saturday',  slots: [{ startTime: '10:00', endTime: '14:00' }] },
    ];
    for (const s of scheduleConfig) {
      await Availability.create({
        therapistId: tId,
        isOverride: false,
        dayOfWeek: s.day,
        isDayAvailable: true,
        slots: s.slots.map((sl) => ({ ...sl, isAvailable: true })),
        bufferBetweenSessionsMinutes: 15,
        timezone: 'Asia/Kolkata',
      });
      console.log(`   ✅ ${s.label}: ${s.slots.map((sl) => `${sl.startTime}-${sl.endTime}`).join(', ')}`);
    }
    // Sunday off
    await Availability.create({
      therapistId: tId, isOverride: false, dayOfWeek: 0,
      isDayAvailable: false, slots: [], timezone: 'Asia/Kolkata',
    });
    console.log('   ✅ Sunday: Day off');
    // Holiday override
    await Availability.create({
      therapistId: tId, isOverride: true,
      overrideDate: new Date('2026-10-15'),
      overrideLabel: 'Dussehra Holiday',
      isDayAvailable: false, slots: [], timezone: 'Asia/Kolkata',
    });
    console.log('   ✅ Override: Oct 15 (Dussehra Holiday)\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 4. LEADS (CRM Pipeline)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📊 Step 4: Creating CRM Leads...');
    const leadsData = [
      {
        therapistId: tId, name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+91 98765 11111',
        enquiryMessage: 'I have been experiencing severe workplace anxiety and looking for a therapist who specializes in CBT.',
        referralSource: 'google', preferredMedium: 'video', status: 'new', priority: 'high',
        bookingDetails: { scheduledAt: daysFromNow(5), durationMinutes: 50, sessionType: 'consultation', medium: 'video', status: 'pending' },
      },
      {
        therapistId: tId, name: 'Karan Singh', email: 'karan.singh@example.com', phone: '+91 98765 22222',
        enquiryMessage: 'My wife and I are considering couples therapy. We are going through a rough patch.',
        referralSource: 'referral', preferredMedium: 'in_person', status: 'contacted', priority: 'medium',
        followUps: [
          { type: 'phone_call', notes: 'Spoke with Karan. He wants to discuss further with his wife.', conductedAt: daysAgo(2), outcome: 'callback_requested', nextFollowUpAt: daysFromNow(3) },
        ],
        nextFollowUpAt: daysFromNow(3),
      },
      {
        therapistId: tId, name: 'Divya Reddy', email: 'divya.reddy@example.com',
        enquiryMessage: 'Looking for therapy sessions for my teenage daughter who is having trouble adjusting after changing schools.',
        referralSource: 'instagram', preferredMedium: 'video', status: 'consultation_scheduled', priority: 'high',
        bookingDetails: { scheduledAt: daysFromNow(2), durationMinutes: 30, sessionType: 'consultation', medium: 'video', status: 'accepted' },
      },
      {
        therapistId: tId, name: 'Amit Kumar', email: 'amit.kumar@example.com', phone: '+91 98765 44444',
        enquiryMessage: 'Dealing with grief after losing my father. Need someone to talk to.',
        referralSource: 'booking_page', preferredMedium: 'no_preference', status: 'lost', priority: 'medium',
        lostAt: daysAgo(10), lostReason: 'Client found another therapist closer to home.',
        followUps: [
          { type: 'email', notes: 'Sent initial response and availability.', conductedAt: daysAgo(20), outcome: 'interested' },
          { type: 'phone_call', notes: 'Client decided to go with a local therapist.', conductedAt: daysAgo(10), outcome: 'not_interested' },
        ],
      },
      {
        therapistId: tId, name: 'Nisha Gupta', email: 'nisha.gupta@example.com', phone: '+91 98765 55555',
        enquiryMessage: 'I want to work on my self-esteem issues and people-pleasing tendencies.',
        referralSource: 'facebook', preferredMedium: 'video', status: 'in_discussion', priority: 'low',
        followUps: [
          { type: 'email', notes: 'Sent intake questionnaire link.', conductedAt: daysAgo(5), outcome: 'interested', nextFollowUpAt: daysFromNow(2) },
        ],
        nextFollowUpAt: daysFromNow(2),
      },
    ];
    for (const l of leadsData) {
      const lead = await Lead.create(l);
      console.log(`   ✅ ${lead.name} (${lead.status}, ${lead.priority} priority)`);
    }
    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 5. PACKAGES (Session Bundles)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Step 5: Creating Session Packages...');
    const packagesData = [
      {
        therapistId: tId, name: '4-Session Starter Pack', description: 'Perfect for clients beginning their therapy journey. Includes 4 individual sessions at a discounted rate.',
        totalSessions: 4, sessionDurationMinutes: 50, sessionMedium: 'video',
        price: 700000, currency: 'INR', originalPrice: 800000, validityDays: 60,
        isActive: true, isPublic: true, badge: 'Best for Beginners', displayOrder: 1,
        features: ['4 × 50-min individual sessions', 'Video or in-person', 'Flexible scheduling', 'Session notes shared after each session'],
      },
      {
        therapistId: tId, name: '8-Session CBT Programme', description: 'Structured 8-week CBT programme for anxiety and depression. Includes homework assignments and progress tracking.',
        totalSessions: 8, sessionDurationMinutes: 50, sessionMedium: 'video',
        price: 1200000, currency: 'INR', originalPrice: 1600000, validityDays: 90,
        isActive: true, isPublic: true, badge: 'Most Popular', displayOrder: 2,
        features: ['8 × 50-min CBT sessions', 'Structured treatment plan', 'Between-session homework', 'Progress tracking & reporting', 'Priority scheduling'],
      },
      {
        therapistId: tId, name: '12-Session Couples Therapy', description: 'Comprehensive couples therapy programme designed to improve communication, resolve conflicts, and strengthen your relationship.',
        totalSessions: 12, sessionDurationMinutes: 60, sessionMedium: 'in_person',
        price: 3000000, currency: 'INR', originalPrice: 3600000, validityDays: 120,
        isActive: true, isPublic: true, badge: 'Best Value', displayOrder: 3,
        features: ['12 × 60-min couples sessions', 'In-person or video', 'Relationship assessment', 'Joint & individual sessions', 'Take-home exercises'],
      },
    ];
    const packages = [];
    for (const p of packagesData) {
      const pkg = await Package.create(p);
      packages.push(pkg);
      console.log(`   ✅ ${pkg.name} — ₹${(pkg.price / 100).toLocaleString()}`);
    }
    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 6. PAST SESSIONS & SESSION NOTES (Rich history for analytics)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🗓️  Step 6: Creating Sessions (past + upcoming)...');

    // -- Past Completed Sessions for Ananya (reliable client, shows progress) --
    const ananyaSessions = [];
    const ananyaNotes = [
      {
        daysAgo: 84, sessionNum: 1, type: 'intake',
        content: 'Initial intake session. Client presented with significant work-related burnout, panic episodes occurring 2-3 times weekly, and chronic insomnia (averaging 4 hours/night). GAD-7 score: 16 (severe). PHQ-9 score: 14 (moderately severe). Client is motivated for treatment.',
        sentiment: { score: -0.68, label: 'NEGATIVE' }, moodStart: 3, moodEnd: 4,
      },
      {
        daysAgo: 77, sessionNum: 2, type: 'soap',
        content: 'Client reports continued panic episodes but has started using the breathing technique introduced last session. Identified 3 automatic negative thoughts related to work performance.',
        soap: { subjective: 'Reports 2 panic episodes this week, down from 3. Sleep still poor (5 hrs avg). Tried breathing exercises with "some" success.', objective: 'Client alert, cooperative. Mild hand tremor observed. Made eye contact consistently.', assessment: 'Beginning to develop awareness of cognitive distortions. Catastrophizing is the dominant pattern.', plan: 'Introduce thought record. Practice 4-7-8 breathing twice daily. Review sleep hygiene checklist.' },
        sentiment: { score: -0.42, label: 'NEGATIVE' }, moodStart: 4, moodEnd: 5,
      },
      {
        daysAgo: 70, sessionNum: 3, type: 'soap',
        content: 'Noticeable improvement in panic frequency. Client completed thought records diligently. Beginning to recognize catastrophizing patterns.',
        soap: { subjective: 'Only 1 panic episode this week. Sleep improving to 6 hours. "I caught myself catastrophizing during a meeting and was able to reframe."', objective: 'Noticeably more relaxed posture. Humor present. Completed all homework assignments.', assessment: 'Good progress with cognitive restructuring. Client shows strong commitment to behavioral exercises.', plan: 'Deepen CBT work with behavioral experiments. Introduce progressive muscle relaxation for sleep.' },
        sentiment: { score: -0.05, label: 'NEUTRAL' }, moodStart: 5, moodEnd: 6,
      },
      {
        daysAgo: 56, sessionNum: 4, type: 'soap',
        content: 'Client reports significant reduction in anxiety. Set boundaries with manager about after-hours emails. Sleeping 7 hours consistently.',
        soap: { subjective: '"I told my boss I won\'t check emails after 7 PM and the sky didn\'t fall." Reports feeling more confident at work. No panic episodes in 10 days.', objective: 'Animated, smiling. Speech rate normalized. Reports consistent 7-hour sleep.', assessment: 'Excellent progress. Behavioral activation showing real-world results. Client internalizing CBT framework.', plan: 'Review progress. Begin exposure hierarchy for public speaking anxiety. Continue reinforcing boundaries.' },
        sentiment: { score: 0.52, label: 'POSITIVE' }, moodStart: 6, moodEnd: 7,
      },
      {
        daysAgo: 42, sessionNum: 5, type: 'soap',
        content: 'Client successfully presented at a team meeting — first time in months. Reported manageable anxiety levels. Relationship with manager has improved significantly.',
        soap: { subjective: '"I actually volunteered to present the quarterly report. My heart was racing but I used the grounding technique and got through it." Very proud of achievement.', objective: 'Confident body language. Eye contact strong. Discussing future goals proactively.', assessment: 'Substantial gains in public speaking confidence. GAD-7 score: 8 (mild). Sleep normalized.', plan: 'Continue exposure work. Begin preparing for gradual discharge. Explore relapse prevention strategies.' },
        sentiment: { score: 0.71, label: 'POSITIVE' }, moodStart: 7, moodEnd: 8,
      },
      {
        daysAgo: 28, sessionNum: 6, type: 'soap',
        content: 'Strong progress continues. Client has developed solid coping toolkit. Discussing future goals and moving toward maintenance phase.',
        soap: { subjective: '"I feel like a different person. The techniques are becoming second nature." Reports active social life, regular exercise routine, and healthy sleep habits.', objective: 'Relaxed, engaged, future-oriented. Demonstrates strong insight into own patterns.', assessment: 'GAD-7: 5 (mild). PHQ-9: 4 (minimal). Client has achieved most treatment goals. Ready to transition to biweekly.', plan: 'Transition to biweekly sessions. Build relapse prevention plan. Discuss long-term maintenance strategies.' },
        sentiment: { score: 0.84, label: 'POSITIVE' }, moodStart: 8, moodEnd: 9,
      },
      {
        daysAgo: 14, sessionNum: 7, type: 'progress',
        content: 'Biweekly check-in. Client maintaining all gains. Successfully managed a high-stress product launch week without any panic episodes. Using self-monitoring independently. Discussed relapse prevention plan and agreed on monthly follow-ups after next session.',
        sentiment: { score: 0.78, label: 'POSITIVE' }, moodStart: 8, moodEnd: 8,
      },
    ];

    for (const n of ananyaNotes) {
      const sDate = setTime(daysAgo(n.daysAgo), 10, 0);
      const session = await Session.create({
        therapistId: tId, clientId: ananya._id,
        scheduledAt: sDate, scheduledEndAt: endTime(sDate, 50), durationMinutes: 50,
        status: 'completed', medium: 'video', sessionType: 'individual',
        sessionNumber: n.sessionNum, feeAmount: 200000, currency: 'INR',
      });
      ananyaSessions.push(session);

      const noteData = {
        therapistId: tId, clientId: ananya._id, sessionId: session._id,
        noteType: n.type === 'intake' ? 'intake' : (n.type === 'soap' ? 'soap' : 'progress'),
        title: `Session ${n.sessionNum} — ${n.type === 'intake' ? 'Intake Assessment' : (n.type === 'soap' ? 'SOAP Note' : 'Progress Note')}`,
        content: n.content,
        status: 'signed', isSigned: true, signedAt: sDate,
        aiSentiment: { ...n.sentiment, modelVersion: '1.0.0-vader', analyzedAt: sDate },
        clientMoodAtStart: n.moodStart, clientMoodAtEnd: n.moodEnd,
        interventionsUsed: ['CBT', 'Cognitive Restructuring', 'Behavioral Activation'],
        progressRating: 30 + (n.sessionNum * 10),
        createdAt: sDate,
      };
      if (n.soap) noteData.soap = n.soap;
      await SessionNote.create(noteData);
    }
    console.log(`   ✅ Ananya: ${ananyaNotes.length} completed sessions with clinical notes`);

    // -- Past Sessions for Vikram (at-risk client, has no-shows) --
    const vikramHistory = [
      { daysAgo: 55, status: 'completed', sessionNum: 1 },
      { daysAgo: 45, status: 'completed', sessionNum: 2 },
      { daysAgo: 35, status: 'no_show',   sessionNum: 3 },
      { daysAgo: 25, status: 'completed', sessionNum: 4 },
      { daysAgo: 15, status: 'no_show',   sessionNum: 5 },
      { daysAgo: 8,  status: 'cancelled', sessionNum: 6 },
    ];

    for (const h of vikramHistory) {
      const sDate = setTime(daysAgo(h.daysAgo), 15, 0);
      const sessionData = {
        therapistId: tId, clientId: vikram._id,
        scheduledAt: sDate, scheduledEndAt: endTime(sDate, 50), durationMinutes: 50,
        status: h.status, medium: 'in_person', sessionType: 'individual',
        sessionNumber: h.sessionNum, feeAmount: 200000,
      };
      if (h.status === 'cancelled') {
        sessionData.cancellation = {
          cancelledBy: 'client', reason: 'client_request',
          notes: 'Client called 1 hour before — said feeling unwell.',
          cancelledAt: sDate, feeWaived: true,
        };
      }
      const session = await Session.create(sessionData);

      // Add notes only for completed sessions
      if (h.status === 'completed') {
        await SessionNote.create({
          therapistId: tId, clientId: vikram._id, sessionId: session._id,
          noteType: 'soap',
          title: `Session ${h.sessionNum} — SOAP Note`,
          content: h.sessionNum === 1
            ? 'Initial assessment. Client presents with GAD and social phobia. Avoids social situations. Recent breakup causing additional distress. Establishing therapeutic rapport.'
            : h.sessionNum === 2
            ? 'Client explored the connection between childhood experiences and current social anxiety. Identified core belief: "I am not interesting enough." Began cognitive restructuring.'
            : 'Client showed up after two missed sessions. Discussed barriers to attendance. Agreed to set phone reminders. Continued CBT work on social situations.',
          soap: {
            subjective: h.sessionNum === 1 ? 'Reports avoiding all social gatherings for 3 months. Panic attacks in crowded places.' : 'Moderate anxiety reported. Attempting small social interactions.',
            objective: 'Client cooperative but fidgety. Avoids sustained eye contact.',
            assessment: 'GAD with social phobia features. Avoidance pattern well-established.',
            plan: 'Gradual exposure hierarchy. Weekly check-ins on social engagement.',
          },
          status: 'signed', isSigned: true, signedAt: sDate,
          aiSentiment: { score: h.sessionNum <= 2 ? -0.45 : -0.20, label: h.sessionNum <= 2 ? 'NEGATIVE' : 'NEUTRAL', modelVersion: '1.0.0-vader', analyzedAt: sDate },
          clientMoodAtStart: 3, clientMoodAtEnd: 5,
          interventionsUsed: ['CBT', 'Exposure Therapy', 'Motivational Interviewing'],
          createdAt: sDate,
        });
      }
    }
    console.log(`   ✅ Vikram: ${vikramHistory.length} past sessions (2 no-shows, 1 cancellation)`);

    // -- Past Sessions for Sneha (VIP, long-term progress) --
    for (let i = 1; i <= 4; i++) {
      const sDate = setTime(daysAgo(120 - i * 14), 11, 0);
      const session = await Session.create({
        therapistId: tId, clientId: sneha._id,
        scheduledAt: sDate, scheduledEndAt: endTime(sDate, 50), durationMinutes: 50,
        status: 'completed', medium: 'video', sessionType: 'individual',
        sessionNumber: i, feeAmount: 200000,
      });
      await SessionNote.create({
        therapistId: tId, clientId: sneha._id, sessionId: session._id,
        noteType: 'progress', title: `Session ${i} — Progress Note`,
        content: `Session ${i} focusing on post-divorce adjustment. Client continues to build resilience and self-compassion. Progress is steady and encouraging.`,
        status: 'signed', isSigned: true, signedAt: sDate,
        aiSentiment: { score: -0.3 + (i * 0.25), label: i <= 2 ? 'NEUTRAL' : 'POSITIVE', modelVersion: '1.0.0-vader', analyzedAt: sDate },
        clientMoodAtStart: 4 + i, clientMoodAtEnd: 5 + i,
        createdAt: sDate,
      });
    }
    console.log('   ✅ Sneha: 4 completed sessions with progress notes');

    // -- Intake session for Arjun (new client) --
    const arjunIntakeDate = setTime(daysAgo(5), 14, 0);
    const arjunSession = await Session.create({
      therapistId: tId, clientId: arjun._id,
      scheduledAt: arjunIntakeDate, scheduledEndAt: endTime(arjunIntakeDate, 50), durationMinutes: 50,
      status: 'completed', medium: 'video', sessionType: 'consultation',
      sessionNumber: 1, feeAmount: 0,
    });
    await SessionNote.create({
      therapistId: tId, clientId: arjun._id, sessionId: arjunSession._id,
      noteType: 'intake', title: 'Intake Assessment — Arjun Nair',
      content: 'Initial intake session with 24-year-old engineering student. Presenting concerns: academic performance anxiety, difficulty concentrating, frequent tension headaches. Reports skipping meals and sleeping 4-5 hours during exam periods. PHQ-9: 10 (moderate). GAD-7: 12 (moderate). Good insight and motivation for treatment.',
      status: 'draft',
      aiSentiment: { score: -0.38, label: 'NEGATIVE', modelVersion: '1.0.0-vader', analyzedAt: arjunIntakeDate },
      clientMoodAtStart: 4, clientMoodAtEnd: 5,
      createdAt: arjunIntakeDate,
    });
    console.log('   ✅ Arjun: 1 intake session (new client)');

    // -- Upcoming Sessions with AI Risk Predictions --
    console.log('   🔮 Creating upcoming sessions with AI risk predictions...');

    // Upcoming: Ananya (LOW risk) — in 1 day
    const ananyaUpcoming = setTime(daysFromNow(1), 10, 0);
    await Session.create({
      therapistId: tId, clientId: ananya._id,
      scheduledAt: ananyaUpcoming, scheduledEndAt: endTime(ananyaUpcoming, 50), durationMinutes: 50,
      status: 'scheduled', medium: 'video', sessionType: 'individual',
      sessionNumber: 8, feeAmount: 200000, isClientConfirmed: true, clientConfirmedAt: daysAgo(1),
      aiRisk: { noShowProbability: 0.08, noShowRiskLevel: 'LOW', modelVersion: '1.0.0-logistic', predictedAt: new Date(), isLowConfidence: false },
    });
    console.log('      ✅ Ananya: Tomorrow — LOW risk (8%)');

    // Upcoming: Vikram (HIGH risk) — in 2 days
    const vikramUpcoming = setTime(daysFromNow(2), 15, 0);
    await Session.create({
      therapistId: tId, clientId: vikram._id,
      scheduledAt: vikramUpcoming, scheduledEndAt: endTime(vikramUpcoming, 50), durationMinutes: 50,
      status: 'scheduled', medium: 'in_person', sessionType: 'individual',
      sessionNumber: 7, feeAmount: 200000, isClientConfirmed: false,
      createdAt: daysAgo(14),
      aiRisk: { noShowProbability: 0.72, noShowRiskLevel: 'HIGH', modelVersion: '1.0.0-logistic', predictedAt: new Date(), isLowConfidence: false },
    });
    console.log('      🚨 Vikram: In 2 days — HIGH risk (72%)');

    // Upcoming: Sneha (LOW risk) — in 3 days
    const snehaUpcoming = setTime(daysFromNow(3), 11, 0);
    await Session.create({
      therapistId: tId, clientId: sneha._id,
      scheduledAt: snehaUpcoming, scheduledEndAt: endTime(snehaUpcoming, 50), durationMinutes: 50,
      status: 'scheduled', medium: 'video', sessionType: 'individual',
      sessionNumber: 5, feeAmount: 200000, isClientConfirmed: true, clientConfirmedAt: daysAgo(2),
      aiRisk: { noShowProbability: 0.05, noShowRiskLevel: 'LOW', modelVersion: '1.0.0-logistic', predictedAt: new Date(), isLowConfidence: false },
    });
    console.log('      ✅ Sneha: In 3 days — LOW risk (5%)');

    // Upcoming: Arjun (MEDIUM risk) — in 4 days (new client, low confidence)
    const arjunUpcoming = setTime(daysFromNow(4), 14, 0);
    await Session.create({
      therapistId: tId, clientId: arjun._id,
      scheduledAt: arjunUpcoming, scheduledEndAt: endTime(arjunUpcoming, 50), durationMinutes: 50,
      status: 'scheduled', medium: 'video', sessionType: 'individual',
      sessionNumber: 2, feeAmount: 200000, isClientConfirmed: false,
      aiRisk: { noShowProbability: 0.41, noShowRiskLevel: 'MEDIUM', modelVersion: '1.0.0-logistic', predictedAt: new Date(), isLowConfidence: true },
    });
    console.log('      ⚠️  Arjun: In 4 days — MEDIUM risk (41%, low confidence)');

    // Upcoming: Vikram again (MEDIUM risk) — in 6 days
    const vikramUpcoming2 = setTime(daysFromNow(6), 18, 0);
    await Session.create({
      therapistId: tId, clientId: vikram._id,
      scheduledAt: vikramUpcoming2, scheduledEndAt: endTime(vikramUpcoming2, 50), durationMinutes: 50,
      status: 'scheduled', medium: 'video', sessionType: 'follow_up',
      sessionNumber: 8, feeAmount: 120000, isClientConfirmed: false,
      aiRisk: { noShowProbability: 0.55, noShowRiskLevel: 'MEDIUM', modelVersion: '1.0.0-logistic', predictedAt: new Date(), isLowConfidence: false },
    });
    console.log('      ⚠️  Vikram: In 6 days — MEDIUM risk (55%)\n');

    // ──────────────────────────────────────────────────────────────────────────
    // 7. PAYMENTS (Multi-month revenue history for forecasting)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('💰 Step 7: Creating Payment History...');
    const paymentMonths = [
      { year: 2026, month: 3, days: [3, 10, 17, 24],           client: ananya, fee: 200000, label: 'Apr 2026' },
      { year: 2026, month: 4, days: [1, 8, 15, 22, 29],        client: ananya, fee: 200000, label: 'May 2026' },
      { year: 2026, month: 5, days: [5, 12, 19, 26],           client: ananya, fee: 200000, label: 'Jun 2026' },
      { year: 2026, month: 5, days: [8, 22],                   client: vikram, fee: 200000, label: 'Jun 2026 (Vikram)' },
      { year: 2026, month: 6, days: [3, 10, 17, 24, 31],       client: ananya, fee: 200000, label: 'Jul 2026' },
      { year: 2026, month: 6, days: [7, 21],                   client: sneha,  fee: 200000, label: 'Jul 2026 (Sneha)' },
      { year: 2026, month: 7, days: [7, 14, 21, 28],           client: ananya, fee: 200000, label: 'Aug 2026' },
      { year: 2026, month: 7, days: [5, 19],                   client: vikram, fee: 200000, label: 'Aug 2026 (Vikram)' },
      { year: 2026, month: 7, days: [12, 26],                  client: sneha,  fee: 200000, label: 'Aug 2026 (Sneha)' },
      { year: 2026, month: 8, days: [4, 11, 18, 25],           client: ananya, fee: 200000, label: 'Sep 2026' },
      { year: 2026, month: 8, days: [2, 16, 30],               client: vikram, fee: 200000, label: 'Sep 2026 (Vikram)' },
      { year: 2026, month: 8, days: [9, 23],                   client: sneha,  fee: 200000, label: 'Sep 2026 (Sneha)' },
      { year: 2026, month: 9, days: [1, 3],                    client: ananya, fee: 200000, label: 'Oct 2026 (Ananya)' },
      { year: 2026, month: 9, days: [2, 4],                    client: sneha,  fee: 200000, label: 'Oct 2026 (Sneha)' },
    ];

    let paymentCount = 0;
    for (const m of paymentMonths) {
      for (const day of m.days) {
        const paidDate = new Date(m.year, m.month, day, 14, 30);
        await Payment.create({
          therapistId: tId, clientId: m.client._id,
          amount: m.fee, currency: 'INR',
          status: 'succeeded', paymentFor: 'session',
          gateway: 'razorpay', paidAt: paidDate,
          description: `Individual therapy session — ${m.client.name}`,
          gatewayPaymentId: `pay_demo_${Date.now()}_${paymentCount}`,
        });
        paymentCount++;
      }
    }

    // Package purchase payment
    await Payment.create({
      therapistId: tId, clientId: sneha._id,
      amount: 1200000, currency: 'INR',
      status: 'succeeded', paymentFor: 'package',
      gateway: 'razorpay', paidAt: daysAgo(30),
      description: '8-Session CBT Programme — Sneha Kapoor',
      gatewayPaymentId: `pay_pkg_${Date.now()}`,
    });
    paymentCount++;

    // One failed payment
    await Payment.create({
      therapistId: tId, clientId: vikram._id,
      amount: 200000, currency: 'INR',
      status: 'failed', paymentFor: 'session',
      gateway: 'razorpay', failedAt: daysAgo(10),
      description: 'Session payment — Vikram Mehta (failed)',
      gatewayPaymentId: `pay_fail_${Date.now()}`,
    });
    paymentCount++;

    console.log(`   ✅ ${paymentCount} payments seeded across 6 months.\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 8. CLIENT PACKAGES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🎫 Step 8: Creating Client Packages...');
    const cp1 = await ClientPackage.create({
      clientId: sneha._id, packageId: packages[1]._id, therapistId: tId,
      packageName: '8-Session CBT Programme', pricePaid: 1200000, currency: 'INR',
      totalSessions: 8, sessionsUsed: 4, status: 'active',
      validFrom: daysAgo(30), expiresAt: daysFromNow(60),
      acquisitionType: 'purchased',
    });
    console.log(`   ✅ Sneha: 8-Session CBT Programme (4/8 used)`);

    const cp2 = await ClientPackage.create({
      clientId: ananya._id, packageId: packages[0]._id, therapistId: tId,
      packageName: '4-Session Starter Pack', pricePaid: 700000, currency: 'INR',
      totalSessions: 4, sessionsUsed: 4, status: 'exhausted',
      validFrom: daysAgo(90), expiresAt: daysAgo(30),
      acquisitionType: 'purchased',
    });
    console.log(`   ✅ Ananya: 4-Session Starter Pack (exhausted)\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 9. CBT THOUGHT RECORDS (Between-session homework)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🧠 Step 9: Creating CBT Thought Records...');
    const cbtRecords = [
      {
        clientId: ananya._id, therapistId: tId,
        automaticThought: 'If I make a mistake in this presentation, everyone will think I\'m incompetent and I\'ll get fired.',
        distortions: [
          { type: 'catastrophizing', label: 'Catastrophizing', description: 'Assuming the worst possible outcome will happen.', confidence: 0.92, reframePrompts: ['What is the most likely outcome?', 'Have you made mistakes before and survived?'] },
          { type: 'mind_reading', label: 'Mind Reading', description: 'Assuming you know what others are thinking.', confidence: 0.78, reframePrompts: ['Do you have evidence for what others think?'] },
        ],
        primaryDistortion: 'catastrophizing', distortionCount: 2,
        evidenceFor: 'I once got negative feedback on a report last year.',
        evidenceAgainst: 'I\'ve given 20+ presentations successfully. My manager praised my last quarterly review. Everyone makes mistakes.',
        balancedThought: 'One mistake doesn\'t define my competence. Most people won\'t even notice minor errors, and my track record shows I\'m capable.',
        moodBefore: 3, moodAfter: 7, isCompleted: true,
        createdAt: daysAgo(60),
      },
      {
        clientId: ananya._id, therapistId: tId,
        automaticThought: 'I can\'t say no to my boss. If I set boundaries, they\'ll think I\'m not dedicated and pass me over for promotion.',
        distortions: [
          { type: 'fortune_telling', label: 'Fortune Telling', description: 'Predicting negative outcomes without evidence.', confidence: 0.85, reframePrompts: ['What evidence do you have this will happen?'] },
          { type: 'all_or_nothing', label: 'All-or-Nothing Thinking', description: 'Seeing things in black and white with no middle ground.', confidence: 0.72, reframePrompts: ['Is there a middle ground between saying yes to everything and saying no to everything?'] },
        ],
        primaryDistortion: 'fortune_telling', distortionCount: 2,
        evidenceFor: 'I once saw a colleague get passed over after declining extra work.',
        evidenceAgainst: 'Many successful people at my company set healthy boundaries. My boss has actually said they value work quality over quantity.',
        balancedThought: 'Setting reasonable boundaries actually shows professionalism and self-awareness. My boss respects clear communication.',
        moodBefore: 4, moodAfter: 7, isCompleted: true,
        createdAt: daysAgo(42),
      },
      {
        clientId: vikram._id, therapistId: tId,
        automaticThought: 'Nobody at the party will want to talk to me. I\'ll just stand there awkwardly and everyone will notice how weird I am.',
        distortions: [
          { type: 'mind_reading', label: 'Mind Reading', description: 'Assuming others will judge you negatively.', confidence: 0.88, reframePrompts: ['Have you ever enjoyed talking to someone at a social event?'] },
          { type: 'labeling', label: 'Labeling', description: 'Attaching a negative label to yourself.', confidence: 0.76, reframePrompts: ['Would you call a friend "weird" for being shy?'] },
        ],
        primaryDistortion: 'mind_reading', distortionCount: 2,
        evidenceFor: 'Last time I went to a party, I felt uncomfortable and left early.',
        evidenceAgainst: 'My close friends enjoy talking to me. I had a good conversation with a colleague last week.',
        balancedThought: 'Social events are uncomfortable but not dangerous. I can start with one person and see how it goes.',
        moodBefore: 2, moodAfter: 5, isCompleted: true,
        createdAt: daysAgo(35),
      },
      {
        clientId: arjun._id, therapistId: tId,
        automaticThought: 'I\'m going to fail my final exams. Everyone else is smarter than me and I don\'t belong in this engineering program.',
        distortions: [
          { type: 'catastrophizing', label: 'Catastrophizing', description: 'Expecting the worst-case scenario.', confidence: 0.90, reframePrompts: ['What is your actual GPA?', 'Have you failed before?'] },
          { type: 'comparison', label: 'Unfavorable Comparison', description: 'Comparing yourself negatively to others.', confidence: 0.82, reframePrompts: ['Are you seeing the full picture of others\' struggles?'] },
        ],
        primaryDistortion: 'catastrophizing', distortionCount: 2,
        evidenceFor: '', evidenceAgainst: '', balancedThought: '',
        moodBefore: 3, moodAfter: null, isCompleted: false,
        createdAt: daysAgo(3),
      },
      {
        clientId: ananya._id, therapistId: tId,
        automaticThought: 'My colleague got promoted instead of me. I must be doing something wrong. I\'ll never advance in my career.',
        distortions: [
          { type: 'personalization', label: 'Personalization', description: 'Taking responsibility for things outside your control.', confidence: 0.81, reframePrompts: ['Are there factors outside your control that influenced the decision?'] },
          { type: 'overgeneralization', label: 'Overgeneralization', description: 'Drawing broad conclusions from a single event.', confidence: 0.74, reframePrompts: ['Does one missed promotion mean you\'ll never advance?'] },
        ],
        primaryDistortion: 'personalization', distortionCount: 2,
        evidenceFor: 'I didn\'t get the promotion this cycle.',
        evidenceAgainst: 'I received positive performance reviews. My manager mentioned it was a close decision. There will be more opportunities.',
        balancedThought: 'Not getting this promotion doesn\'t mean I\'m failing. Career growth isn\'t always linear, and I can ask for feedback to improve.',
        moodBefore: 3, moodAfter: 6, isCompleted: true,
        createdAt: daysAgo(21),
      },
    ];
    for (const r of cbtRecords) {
      await CBTThoughtRecord.create(r);
      console.log(`   ✅ ${r.isCompleted ? '✔' : '⏳'} ${clients.find(c => c._id.equals(r.clientId)).name}: "${r.automaticThought.substring(0, 50)}..."`);
    }
    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 10. CRISIS ALERTS (SOS Early-Warning)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🚨 Step 10: Creating Crisis Alerts...');
    const crisisAlerts = [
      {
        clientId: vikram._id, therapistId: tId,
        source: 'journal', sourceText: 'I feel like nothing matters anymore. Everything is pointless and I don\'t know why I even bother trying. Nobody would care if I just disappeared.',
        riskLevel: 'critical', riskScore: 0.92,
        flags: [
          { severity: 'critical', count: 2, keywords: ['disappeared', 'pointless'] },
          { severity: 'high', count: 1, keywords: ['nothing matters'] },
        ],
        alertedTherapist: true, shownCrisisUI: true,
        isReviewed: true, reviewedAt: daysAgo(3),
        therapistNotes: 'Called client immediately. Client reported he was venting frustration after a bad day at work, not expressing suicidal ideation. Safety plan reviewed and updated. Will monitor closely.',
        aiModelVersion: '1.0.0-safety', createdAt: daysAgo(5),
      },
      {
        clientId: arjun._id, therapistId: tId,
        source: 'checkin', sourceText: 'I haven\'t slept in 3 days because of exam stress. I feel like I\'m losing my mind. I can\'t eat, I can\'t think, I just want it all to stop.',
        riskLevel: 'high', riskScore: 0.78,
        flags: [
          { severity: 'high', count: 2, keywords: ['losing my mind', 'want it all to stop'] },
          { severity: 'moderate', count: 1, keywords: ['haven\'t slept'] },
        ],
        alertedTherapist: true, shownCrisisUI: true,
        isReviewed: false,
        aiModelVersion: '1.0.0-safety', createdAt: daysAgo(1),
      },
      {
        clientId: vikram._id, therapistId: tId,
        source: 'mood_log', sourceText: 'Feeling extremely low today. Stayed in bed all day. Didn\'t answer any calls.',
        riskLevel: 'moderate', riskScore: 0.55,
        flags: [
          { severity: 'moderate', count: 2, keywords: ['extremely low', 'stayed in bed all day'] },
        ],
        alertedTherapist: true, shownCrisisUI: false,
        isReviewed: true, reviewedAt: daysAgo(18),
        therapistNotes: 'Discussed during next session. Client experiencing grief response — situational, not chronic. Continue monitoring.',
        aiModelVersion: '1.0.0-safety', createdAt: daysAgo(20),
      },
    ];
    for (const ca of crisisAlerts) {
      await CrisisAlert.create(ca);
      const clientName = clients.find(c => c._id.equals(ca.clientId)).name;
      console.log(`   ${ca.riskLevel === 'critical' ? '🔴' : ca.riskLevel === 'high' ? '🟠' : '🟡'} ${clientName}: ${ca.riskLevel.toUpperCase()} — ${ca.isReviewed ? 'Reviewed' : 'PENDING REVIEW'}`);
    }
    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 11. NOTIFICATIONS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🔔 Step 11: Creating Notifications...');
    const notifications = [
      { type: 'session_reminder', subType: 'day_of', title: 'Session Today', message: `You have a session with Ananya Deshmukh today at 10:00 AM`, sessionTime: setTime(daysFromNow(1), 10), sessionMedium: 'video', clientName: 'Ananya Deshmukh', clientId: ananya._id, isRead: false },
      { type: 'session_reminder', subType: 'day_of', title: 'Session Today', message: `You have a session with Vikram Mehta today at 3:00 PM`, sessionTime: setTime(daysFromNow(2), 15), sessionMedium: 'in_person', clientName: 'Vikram Mehta', clientId: vikram._id, isRead: false },
      { type: 'booking_request', subType: 'general', title: 'New Booking Request', message: 'Priya Patel has requested a consultation session via your booking page.', isRead: false, createdAt: daysAgo(1) },
      { type: 'booking_request', subType: 'general', title: 'New Booking Request', message: 'Divya Reddy has requested a consultation for her daughter.', isRead: false, createdAt: daysAgo(2) },
      { type: 'payment', subType: 'general', title: 'Payment Received', message: '₹2,000 received from Ananya Deshmukh for session on Sep 25.', isRead: true, createdAt: daysAgo(10) },
      { type: 'payment', subType: 'general', title: 'Payment Failed', message: 'Payment of ₹2,000 from Vikram Mehta failed. Please follow up.', isRead: false, createdAt: daysAgo(10) },
      { type: 'system', subType: 'general', title: '🚨 Crisis Alert', message: 'AI safety triager detected high-risk language in Arjun Nair\'s check-in. Please review immediately.', clientName: 'Arjun Nair', clientId: arjun._id, isRead: false, createdAt: daysAgo(1) },
      { type: 'system', subType: 'general', title: 'Session Note Reminder', message: 'You have 1 unsigned session note from last week. Please review and sign.', isRead: false, createdAt: daysAgo(3) },
      { type: 'system', subType: 'general', title: 'Welcome to Unfazed Pro!', message: 'Your Pro plan is now active. You have access to all AI features, unlimited clients, and advanced analytics.', isRead: true, createdAt: daysAgo(30) },
      { type: 'session_reminder', subType: 'one_hour', title: 'Session in 1 Hour', message: 'Your session with Sneha Kapoor starts in 1 hour.', sessionTime: setTime(daysAgo(1), 11), sessionMedium: 'video', clientName: 'Sneha Kapoor', clientId: sneha._id, isRead: true, createdAt: daysAgo(1) },
    ];
    for (const n of notifications) {
      await Notification.create({ therapistId: tId, ...n });
    }
    console.log(`   ✅ ${notifications.length} notifications created (${notifications.filter(n => !n.isRead).length} unread)\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // 12. AI INSIGHTS CACHE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🤖 Step 12: Caching AI Insights...');

    // No-Show Risk Summary
    await AIInsight.create({
      therapistId: tId, type: 'noShow',
      value: {
        upcomingSessions: 5,
        highRiskCount: 1,
        mediumRiskCount: 2,
        lowRiskCount: 2,
        averageRisk: 0.36,
        riskySessions: [
          { clientName: 'Vikram Mehta', sessionDate: daysFromNow(2), riskLevel: 'HIGH', probability: 0.72 },
          { clientName: 'Vikram Mehta', sessionDate: daysFromNow(6), riskLevel: 'MEDIUM', probability: 0.55 },
          { clientName: 'Arjun Nair', sessionDate: daysFromNow(4), riskLevel: 'MEDIUM', probability: 0.41 },
        ],
      },
      modelVersion: '1.0.0-logistic',
      generatedAt: new Date(),
      expiresAt: daysFromNow(1),
    });
    console.log('   ✅ No-Show Risk Summary cached');

    // Sentiment Trend (Ananya's progress)
    await AIInsight.create({
      therapistId: tId, type: 'sentiment',
      value: {
        clientId: ananya._id.toString(),
        clientName: 'Ananya Deshmukh',
        trend: 'improving',
        dataPoints: [
          { sessionNum: 1, date: daysAgo(84), score: -0.68, label: 'NEGATIVE' },
          { sessionNum: 2, date: daysAgo(77), score: -0.42, label: 'NEGATIVE' },
          { sessionNum: 3, date: daysAgo(70), score: -0.05, label: 'NEUTRAL' },
          { sessionNum: 4, date: daysAgo(56), score: 0.52, label: 'POSITIVE' },
          { sessionNum: 5, date: daysAgo(42), score: 0.71, label: 'POSITIVE' },
          { sessionNum: 6, date: daysAgo(28), score: 0.84, label: 'POSITIVE' },
          { sessionNum: 7, date: daysAgo(14), score: 0.78, label: 'POSITIVE' },
        ],
        summary: 'Ananya shows a strong upward trajectory in session sentiment. Progress from severe distress (-0.68) to consistently positive engagement (0.78+). CBT interventions are producing measurable results.',
      },
      modelVersion: '1.0.0-vader',
      generatedAt: new Date(),
      expiresAt: daysFromNow(7),
    });
    console.log('   ✅ Sentiment Trend cached (Ananya)');

    // Revenue Forecast
    await AIInsight.create({
      therapistId: tId,
      type: 'forecast',
      value: {
        therapist_id: tId.toString(),
        currency: 'INR',
        history: [
          { year: 2026, month: 5, revenue: 1000000 },
          { year: 2026, month: 6, revenue: 1200000 },
          { year: 2026, month: 7, revenue: 1400000 },
          { year: 2026, month: 8, revenue: 1600000 },
          { year: 2026, month: 9, revenue: 3000000 },
          { year: 2026, month: 10, revenue: 2400000 },
        ],
        forecast: [
          { year: 2026, month: 11, month_label: 'Nov 26', forecast: 2800000, is_forecast: true },
          { year: 2026, month: 12, month_label: 'Dec 26', forecast: 3100000, is_forecast: true },
          { year: 2027, month: 1,  month_label: 'Jan 27', forecast: 3400000, is_forecast: true },
        ],
        current_month_revenue: 2400000,
        next_month_forecast: 2800000,
        trend: 'GROWING',
        model_version: '1.0.0-linear-regression',
        disclaimer: 'Estimate — Revenue forecast based on historical trends. Actual results may vary.',
      },
      modelVersion: '1.0.0-linear-regression',
      generatedAt: new Date(),
      expiresAt: daysFromNow(30),
    });
    console.log('   ✅ Revenue Forecast cached (3-month projection)');

    // Smart Scheduling
    await AIInsight.create({
      therapistId: tId,
      type: 'scheduling',
      value: {
        therapist_id: tId.toString(),
        recommendations: [
          {
            day_of_week: 0,
            day_name: 'Monday',
            hour_of_day: 10,
            time_label: '10:00 AM',
            score: 0.95,
            reason: 'High attendance rate (14 sessions, 93% attendance)',
          },
          {
            day_of_week: 2,
            day_name: 'Wednesday',
            hour_of_day: 15,
            time_label: '3:00 PM',
            score: 0.88,
            reason: 'Good booking history (11 sessions, 91% attendance)',
          },
          {
            day_of_week: 3,
            day_name: 'Thursday',
            hour_of_day: 11,
            time_label: '11:00 AM',
            score: 0.82,
            reason: 'Consistent demand (9 sessions, 89% attendance)',
          },
          {
            day_of_week: 5,
            day_name: 'Saturday',
            hour_of_day: 10,
            time_label: '10:00 AM',
            score: 0.79,
            reason: 'High weekend demand from working professionals',
          },
        ],
        model_version: '1.0.0-pattern-analysis',
        disclaimer: 'Recommendation — Based on historical booking patterns.',
      },
      modelVersion: '1.0.0-pattern-analysis',
      generatedAt: new Date(),
      expiresAt: daysFromNow(30),
    });
    console.log('   ✅ Smart Scheduling recommendations cached\n');

    // ──────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Data Summary:');
    console.log('   • 1 Therapist (Pro tier)');
    console.log('   • 6 Clients (active, on-hold, discharged)');
    console.log('   • 5 CRM Leads (new, contacted, scheduled, lost, in-discussion)');
    console.log('   • 3 Session Packages');
    console.log('   • 2 Client Packages (1 active, 1 exhausted)');
    console.log(`   • ${paymentCount} Payments (6-month history)`);
    console.log('   • 20+ Sessions (completed, no-shows, cancelled, upcoming)');
    console.log('   • 15+ Session Notes (SOAP, intake, progress with AI sentiment)');
    console.log('   • 5 CBT Thought Records (with distortion analysis)');
    console.log('   • 3 Crisis Alerts (critical, high, moderate)');
    console.log(`   • ${notifications.length} Notifications`);
    console.log('   • 4 AI Insight caches (no-show, sentiment, forecast, scheduling)');
    console.log('   • Weekly Availability (Mon-Sat + holiday override)\n');
    console.log('🔑 Login Credentials:');
    console.log('   Email:    demo@gmail.com');
    console.log('   Password: Password123!');
    console.log(`   Booking:  http://localhost:5173/client/demo\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDemo();
