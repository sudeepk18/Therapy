/**
 * @file seed.js
 * @description Seeds initial data for Therapists, Clients, and Sessions into MongoDB.
 * Usage: node src/scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Therapist, Client, Session, SubscriptionTierConfig } = require('../models');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  console.log('🌱 Starting database seeding...');

  try {
    // 1. Hash default password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // 2. Create / Upsert Seed Therapists
    const therapistsData = [
      {
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@example.com',
        password: passwordHash,
        phone: '+91 98765 43210',
        slug: 'dr-priya-sharma',
        practiceName: 'Inner Peace Wellness Clinic',
        brandColor: '#14B8A6',
        subscriptionTier: 'pro',
        isBookingOpen: true,
        professionalDetails: {
          licenseNumber: 'RCI/DEL/2018/9812',
          yearsOfExperience: 8,
          specializations: ['Cognitive Behavioral Therapy (CBT)', 'Anxiety & Depression', 'Trauma & PTSD', 'Mindfulness'],
          languages: ['English', 'Hindi', 'Punjabi'],
          bio: 'Licensed Clinical Psychologist with 8+ years of experience helping individuals navigate stress, anxiety, life transitions, and relationship challenges using evidence-based CBT and trauma-informed approaches.',
          qualifications: ['M.Phil Clinical Psychology', 'Ph.D. Psychology (AIIMS Delhi)'],
        },
        socialLinks: {
          website: 'https://innerpeacewellness.in',
          linkedin: 'https://linkedin.com/in/drpriyasharma',
        },
      },
      {
        name: 'Dr. Rohan Verma',
        email: 'rohan.verma@example.com',
        password: passwordHash,
        phone: '+91 98111 22334',
        slug: 'dr-rohan-verma',
        practiceName: 'Mindful Horizons Practice',
        brandColor: '#7C3AED',
        subscriptionTier: 'starter',
        isBookingOpen: true,
        professionalDetails: {
          licenseNumber: 'RCI/MUM/2020/4321',
          yearsOfExperience: 5,
          specializations: ['Couples Therapy', 'Family Counseling', 'Grief & Loss'],
          languages: ['English', 'Hindi', 'Marathi'],
          bio: 'Dedicated counselor specialized in systemic family therapy, couples communication, and adolescent mental wellness.',
          qualifications: ['M.Sc. Counseling Psychology (TISS Mumbai)'],
        },
      },
    ];

    const therapists = [];
    for (const tData of therapistsData) {
      let therapist = await Therapist.findOne({ email: tData.email });
      if (!therapist) {
        therapist = await Therapist.create(tData);
        console.log(`   Created Therapist: ${therapist.name} (/${therapist.slug})`);
      } else {
        console.log(`   Found existing Therapist: ${therapist.name} (/${therapist.slug})`);
      }
      therapists.push(therapist);
    }

    const primaryTherapist = therapists[0];

    // 3. Create / Upsert Seed Clients
    const clientsData = [
      {
        therapistId: primaryTherapist._id,
        name: 'Ananya Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 98201 54321',
        gender: 'Female',
        status: 'active',
        tag: 'moderate_risk',
        dateOfBirth: new Date('1994-06-15'),
        intake: {
          presentingConcerns: 'Work-related burnout, panic episodes, and sleep disruptions.',
          goals: 'Develop emotional regulation tools and work-life balance.',
          referralSource: 'google',
        },
      },
      {
        therapistId: primaryTherapist._id,
        name: 'Vikram Mehta',
        email: 'vikram.mehta@example.com',
        phone: '+91 99302 67890',
        gender: 'Male',
        status: 'active',
        tag: 'none',
        dateOfBirth: new Date('1988-11-20'),
        intake: {
          presentingConcerns: 'General anxiety and mild social phobia.',
          goals: 'Improve confidence in public speaking and social interactions.',
          referralSource: 'therapist_website',
        },
      },
      {
        therapistId: primaryTherapist._id,
        name: 'Sneha Kapoor',
        email: 'sneha.kapoor@example.com',
        phone: '+91 98403 78901',
        gender: 'Female',
        status: 'active',
        tag: 'vip',
        dateOfBirth: new Date('1996-03-08'),
        intake: {
          presentingConcerns: 'Relationship transitions and self-esteem.',
          goals: 'Build healthy boundaries and self-compassion.',
          referralSource: 'referral',
        },
      },
    ];

    const clients = [];
    for (const cData of clientsData) {
      let client = await Client.findOne({ therapistId: cData.therapistId, email: cData.email });
      if (!client) {
        client = await Client.create(cData);
        console.log(`   Created Client: ${client.name}`);
      } else {
        console.log(`   Found existing Client: ${client.name}`);
      }
      clients.push(client);
    }

    // 4. Create / Upsert Recurring Weekly Availability for Dr. Priya Sharma
    const { Availability } = require('../models');
    for (let day = 1; day <= 5; day++) {
      await Availability.findOneAndUpdate(
        { therapistId: primaryTherapist._id, isOverride: false, dayOfWeek: day },
        {
          therapistId: primaryTherapist._id,
          isOverride: false,
          dayOfWeek: day,
          isDayAvailable: true,
          bufferBetweenSessionsMinutes: 15,
          timezone: 'Asia/Kolkata',
          slots: [
            { startTime: '09:00', endTime: '13:00', isAvailable: true },
            { startTime: '14:00', endTime: '18:00', isAvailable: true },
          ],
        },
        { upsert: true, new: true }
      );
    }
    console.log('   Configured Weekly Working Hours (Mon-Fri 09:00-18:00)');

    // 5. Create / Upsert Seed Sessions
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(11, 0, 0, 0);

    const pastDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    pastDate.setHours(16, 0, 0, 0);

    const sessionsData = [
      {
        therapistId: primaryTherapist._id,
        clientId: clients[0]._id,
        scheduledAt: tomorrow,
        durationMinutes: 50,
        scheduledEndAt: new Date(tomorrow.getTime() + 50 * 60 * 1000),
        status: 'scheduled',
        medium: 'video',
        sessionType: 'individual',
        fee: 1500,
      },
      {
        therapistId: primaryTherapist._id,
        clientId: clients[1]._id,
        scheduledAt: pastDate,
        durationMinutes: 50,
        scheduledEndAt: new Date(pastDate.getTime() + 50 * 60 * 1000),
        status: 'completed',
        medium: 'video',
        sessionType: 'individual',
        fee: 1500,
      },
    ];

    for (const sData of sessionsData) {
      const existingSession = await Session.findOne({
        therapistId: sData.therapistId,
        clientId: sData.clientId,
        scheduledAt: sData.scheduledAt,
      });
      if (!existingSession) {
        const session = await Session.create(sData);
        console.log(`   Created Session: ${sData.sessionType} on ${sData.scheduledAt.toISOString()}`);
      } else {
        console.log(`   Found existing Session on ${sData.scheduledAt.toISOString()}`);
      }
    }

    console.log('\n✨ Database seeding completed successfully!\n');
    console.log('Login credentials for testing:');
    console.log('   Email:    priya.sharma@example.com');
    console.log('   Password: Password123!');
    console.log('   Profile:  http://localhost:5173/client/dr-priya-sharma\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
