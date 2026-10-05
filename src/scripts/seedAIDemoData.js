/**
 * @file seedAIDemoData.js
 * @description Seeds realistic historical payments, session notes, past session attendance,
 * and upcoming sessions with risk factors specifically for demo@gmail.com.
 * 
 * Usage: node src/scripts/seedAIDemoData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Therapist, Client, Session, SessionNote, Payment, AIInsight } = require('../models');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const seedAIData = async () => {
  await connectDB();
  console.log('\n🚀 Populating sample data for AI Intelligence Layer...');

  try {
    // 1. Find demo therapist
    let therapist = await Therapist.findOne({ email: 'demo@gmail.com' });
    if (!therapist) {
      therapist = await Therapist.findOne();
    }
    if (!therapist) {
      console.error('❌ No therapist found in database. Run npm run seed first.');
      process.exit(1);
    }

    console.log(`👤 Target therapist: ${therapist.name} (${therapist.email}) [ID: ${therapist._id}]`);

    // 2. Clear old cached AI insights
    await AIInsight.deleteMany({ therapistId: therapist._id });
    console.log('🧹 Cleared cached AI insights.');

    // 3. Ensure we have 2 demo clients
    let clientReliable = await Client.findOne({ therapistId: therapist._id, email: 'ananya.deshmukh@example.com' });
    if (!clientReliable) {
      clientReliable = await Client.create({
        therapistId: therapist._id,
        name: 'Ananya Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 98201 54321',
        gender: 'Female',
        status: 'active',
      });
    }

    let clientAtRisk = await Client.findOne({ therapistId: therapist._id, email: 'vikram.mehta@example.com' });
    if (!clientAtRisk) {
      clientAtRisk = await Client.create({
        therapistId: therapist._id,
        name: 'Vikram Mehta',
        email: 'vikram.mehta@example.com',
        phone: '+91 99302 67890',
        gender: 'Male',
        status: 'active',
      });
    }

    // Clean previous seed sessions & notes for these clients to prevent accumulation
    const demoClientIds = [clientReliable._id, clientAtRisk._id];
    await Session.deleteMany({ therapistId: therapist._id, clientId: { $in: demoClientIds } });
    await SessionNote.deleteMany({ therapistId: therapist._id, clientId: { $in: demoClientIds } });
    await Payment.deleteMany({ therapistId: therapist._id, description: 'Consultation fee - Demo Batch' });
    console.log('🧹 Cleaned previous demo sessions & notes.');

    // 4. Seed Multi-Month Payment History (May to September 2026)
    console.log('💰 Seeding multi-month payment history for Revenue Forecasting...');
    const pastMonths = [
      { year: 2026, month: 4, days: [5, 12, 18, 26], baseFee: 1500 },  // May: ~₹6,000
      { year: 2026, month: 5, days: [3, 10, 16, 22, 28], baseFee: 1800 }, // June: ~₹9,000
      { year: 2026, month: 6, days: [2, 8, 14, 21, 27], baseFee: 2000 },  // July: ~₹10,000
      { year: 2026, month: 7, days: [4, 11, 18, 25, 29], baseFee: 2200 }, // Aug: ~₹11,000
    ];

    for (const m of pastMonths) {
      for (const day of m.days) {
        const paidDate = new Date(m.year, m.month, day, 14, 30);
        await Payment.create({
          therapistId: therapist._id,
          clientId: clientReliable._id,
          amount: m.baseFee * 100, // paise
          currency: 'INR',
          status: 'succeeded',
          paymentFor: 'session',
          gateway: 'razorpay',
          paidAt: paidDate,
          description: 'Consultation fee - Demo Batch',
        });
      }
    }
    console.log('   ✅ Added historical payments across May, June, July, and August.');

    // 5. Seed Attendance History for Client Vikram Mehta (Has prior no-shows)
    console.log('📅 Seeding past session attendance history...');
    const pastDates = [
      { daysAgo: 45, status: 'completed' },
      { daysAgo: 30, status: 'no_show' },
      { daysAgo: 18, status: 'completed' },
      { daysAgo: 8,  status: 'no_show' },
    ];

    for (const p of pastDates) {
      const sDate = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
      await Session.create({
        therapistId: therapist._id,
        clientId: clientAtRisk._id,
        scheduledAt: sDate,
        scheduledEndAt: new Date(sDate.getTime() + 50 * 60 * 1000),
        durationMinutes: 50,
        status: p.status,
        medium: 'in_person',
        sessionType: 'individual',
        fee: 1500,
      });
    }

    // 6. Seed Upcoming Sessions (Next 7 Days) with AI Risk Pre-Calculated
    console.log('🔮 Creating upcoming sessions for No-Show Risk detection...');
    const now = new Date();

    // Session A: In 2 days - High Risk
    // (Client Vikram has 50% past no-show rate + 15 lead days)
    const highRiskDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    highRiskDate.setHours(15, 0, 0, 0);
    const bookingDateA = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const sHigh = await Session.create({
      therapistId: therapist._id,
      clientId: clientAtRisk._id,
      scheduledAt: highRiskDate,
      scheduledEndAt: new Date(highRiskDate.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'scheduled',
      medium: 'in_person',
      sessionType: 'individual',
      fee: 2000,
      createdAt: bookingDateA,
      aiRisk: {
        noShowProbability: 0.74,
        noShowRiskLevel: 'HIGH',
        modelVersion: '1.0.0-logistic',
        predictedAt: new Date(),
        isLowConfidence: false,
      },
    });
    console.log(`   🚨 Created HIGH-RISK upcoming session: ${sHigh._id} for ${clientAtRisk.name}`);

    // Session B: In 4 days - Medium Risk
    const mediumRiskDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    mediumRiskDate.setHours(18, 0, 0, 0);
    const bookingDateB = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const sMed = await Session.create({
      therapistId: therapist._id,
      clientId: clientAtRisk._id,
      scheduledAt: mediumRiskDate,
      scheduledEndAt: new Date(mediumRiskDate.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'scheduled',
      medium: 'video',
      sessionType: 'individual',
      fee: 2000,
      createdAt: bookingDateB,
      aiRisk: {
        noShowProbability: 0.48,
        noShowRiskLevel: 'MEDIUM',
        modelVersion: '1.0.0-logistic',
        predictedAt: new Date(),
        isLowConfidence: false,
      },
    });
    console.log(`   ⚠️ Created MEDIUM-RISK upcoming session: ${sMed._id} for ${clientAtRisk.name}`);

    // Session C: In 3 days - Low Risk
    const lowRiskDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    lowRiskDate.setHours(11, 0, 0, 0);

    const sLow = await Session.create({
      therapistId: therapist._id,
      clientId: clientReliable._id,
      scheduledAt: lowRiskDate,
      scheduledEndAt: new Date(lowRiskDate.getTime() + 50 * 60 * 1000),
      durationMinutes: 50,
      status: 'scheduled',
      medium: 'video',
      sessionType: 'individual',
      fee: 1500,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      aiRisk: {
        noShowProbability: 0.11,
        noShowRiskLevel: 'LOW',
        modelVersion: '1.0.0-logistic',
        predictedAt: new Date(),
        isLowConfidence: false,
      },
    });
    console.log(`   ✅ Created LOW-RISK upcoming session: ${sLow._id} for ${clientReliable.name}`);

    // 7. Seed Past Session Notes with Clinical Progress (for Sentiment & Engagement Trends)
    console.log('📝 Seeding session notes with clinical progress for Sentiment Trends...');
    const noteStages = [
      {
        daysAgo: 28,
        sessionNum: 1,
        content: 'Client arrived visibly distressed and anxious. Expresses severe panic attacks at work, feeling overwhelmed, exhausted, and struggling with insomnia.',
        aiSentiment: { score: -0.72, label: 'NEGATIVE', modelVersion: '1.0.0-vader', analyzedAt: new Date() },
      },
      {
        daysAgo: 21,
        sessionNum: 2,
        content: 'Client reported moderate stress. Practiced diaphragmatic breathing exercises. Client felt slightly calmer but still experiences hesitation in speaking up.',
        aiSentiment: { score: -0.15, label: 'NEUTRAL', modelVersion: '1.0.0-vader', analyzedAt: new Date() },
      },
      {
        daysAgo: 14,
        sessionNum: 3,
        content: 'Client showed noticeable improvement. Applied cognitive reframing at work with positive results. Felt hopeful and reported better sleep quality.',
        aiSentiment: { score: 0.58, label: 'POSITIVE', modelVersion: '1.0.0-vader', analyzedAt: new Date() },
      },
      {
        daysAgo: 7,
        sessionNum: 4,
        content: 'Great session. Client achieved work-life boundaries successfully. Demonstrated resilience, high confidence, optimistic mood, and active coping strategies.',
        aiSentiment: { score: 0.84, label: 'POSITIVE', modelVersion: '1.0.0-vader', analyzedAt: new Date() },
      },
    ];

    for (const n of noteStages) {
      const noteDate = new Date(now.getTime() - n.daysAgo * 24 * 60 * 60 * 1000);
      const session = await Session.create({
        therapistId: therapist._id,
        clientId: clientReliable._id,
        scheduledAt: noteDate,
        scheduledEndAt: new Date(noteDate.getTime() + 50 * 60 * 1000),
        durationMinutes: 50,
        status: 'completed',
        sessionNumber: n.sessionNum,
        medium: 'video',
        fee: 1500,
      });

      await SessionNote.create({
        therapistId: therapist._id,
        clientId: clientReliable._id,
        sessionId: session._id,
        noteType: 'soap',
        soap: {
          subjective: n.content,
          objective: 'Client was cooperative, alert, and engaged.',
          assessment: 'Progress observed in cognitive coping strategies.',
          plan: 'Continue weekly CBT interventions and tracking.',
        },
        content: n.content,
        aiSentiment: n.aiSentiment,
        createdAt: noteDate,
      });
    }

    console.log('\n✨ All sample data seeded successfully for demo@gmail.com!');
    console.log('👉 Refresh your browser dashboard to view the live AI updates.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedAIData();
