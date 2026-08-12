/**
 * @file seedTiers.js
 * @description Database seeding script for SubscriptionTierConfig.
 *
 * Populates the 4 standard SaaS subscription tiers:
 *  - Free
 *  - Starter
 *  - Pro (Recommended)
 *  - Enterprise
 *
 * Usage:
 *   node src/scripts/seedTiers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { SubscriptionTierConfig } = require('../models');

const tiers = [
  {
    tier: 'free',
    displayName: 'Free Tier',
    description: 'Perfect for new independent practitioners starting out.',
    displayOrder: 1,
    isAvailable: true,
    limits: {
      maxClients: 5,
      maxSessionsPerMonth: 15,
      maxPackages: 1,
      maxConcurrentRooms: 1,
      maxTeamMembers: 0,
      storageGb: 1,
      maxLeads: 10,
      dataRetentionDays: 90,
    },
    features: {
      videoCall: true,
      aiNoteSuggestions: false,
      digitalSignature: false,
      publicBookingPage: true,
      automatedReminders: false,
      recurringBookings: false,
      calendarSync: false,
      clientPortal: true,
      secureMessaging: false,
      intakeForms: true,
      sessionPackages: true,
      onlinePayments: true,
      automatedInvoicing: false,
      basicAnalytics: true,
      advancedAnalytics: false,
      customBranding: false,
      whiteLabel: false,
      customDomain: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      complianceDocs: false,
    },
    pricing: {
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'INR',
      tagLine: 'Forever free for up to 5 clients',
      isHighlighted: false,
    },
  },
  {
    tier: 'starter',
    displayName: 'Starter Plan',
    description: 'For growing practices needing automated reminders and client portal.',
    displayOrder: 2,
    isAvailable: true,
    limits: {
      maxClients: 25,
      maxSessionsPerMonth: 80,
      maxPackages: 5,
      maxConcurrentRooms: 1,
      maxTeamMembers: 0,
      storageGb: 10,
      maxLeads: 50,
      dataRetentionDays: 365,
    },
    features: {
      videoCall: true,
      aiNoteSuggestions: false,
      digitalSignature: true,
      publicBookingPage: true,
      automatedReminders: true,
      recurringBookings: true,
      calendarSync: true,
      clientPortal: true,
      secureMessaging: true,
      intakeForms: true,
      sessionPackages: true,
      onlinePayments: true,
      automatedInvoicing: true,
      basicAnalytics: true,
      advancedAnalytics: false,
      customBranding: true,
      whiteLabel: false,
      customDomain: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      complianceDocs: false,
    },
    pricing: {
      monthlyPrice: 99900, // ₹999 / month in paise
      annualPrice: 999000, // ₹9,990 / year
      currency: 'INR',
      tagLine: 'Essential tools for individual therapists',
      isHighlighted: false,
    },
  },
  {
    tier: 'pro',
    displayName: 'Pro Plan',
    description: 'Full-featured suite with AI assistant, custom branding, and white-labeling.',
    displayOrder: 3,
    isAvailable: true,
    limits: {
      maxClients: -1, // Unlimited
      maxSessionsPerMonth: -1,
      maxPackages: -1,
      maxConcurrentRooms: 2,
      maxTeamMembers: 2,
      storageGb: 50,
      maxLeads: -1,
      dataRetentionDays: -1,
    },
    features: {
      videoCall: true,
      aiNoteSuggestions: true,
      digitalSignature: true,
      publicBookingPage: true,
      automatedReminders: true,
      recurringBookings: true,
      calendarSync: true,
      clientPortal: true,
      secureMessaging: true,
      intakeForms: true,
      sessionPackages: true,
      onlinePayments: true,
      automatedInvoicing: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customBranding: true,
      whiteLabel: true,
      customDomain: true,
      prioritySupport: true,
      dedicatedAccountManager: false,
      complianceDocs: true,
    },
    pricing: {
      monthlyPrice: 249900, // ₹2,499 / month in paise
      annualPrice: 2499000, // ₹24,990 / year
      currency: 'INR',
      tagLine: 'Most popular choice for professional therapy practices',
      isHighlighted: true,
    },
  },
  {
    tier: 'enterprise',
    displayName: 'Enterprise Clinic',
    description: 'Designed for multi-therapist clinics, hospitals, and group practices.',
    displayOrder: 4,
    isAvailable: true,
    limits: {
      maxClients: -1,
      maxSessionsPerMonth: -1,
      maxPackages: -1,
      maxConcurrentRooms: 10,
      maxTeamMembers: 20,
      storageGb: 500,
      maxLeads: -1,
      dataRetentionDays: -1,
    },
    features: {
      videoCall: true,
      aiNoteSuggestions: true,
      digitalSignature: true,
      publicBookingPage: true,
      automatedReminders: true,
      recurringBookings: true,
      calendarSync: true,
      clientPortal: true,
      secureMessaging: true,
      intakeForms: true,
      sessionPackages: true,
      onlinePayments: true,
      automatedInvoicing: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customBranding: true,
      whiteLabel: true,
      customDomain: true,
      prioritySupport: true,
      dedicatedAccountManager: true,
      complianceDocs: true,
    },
    pricing: {
      monthlyPrice: 599900, // ₹5,999 / month in paise
      annualPrice: 5999000, // ₹59,990 / year
      currency: 'INR',
      tagLine: 'Custom onboarding and clinic management',
      isHighlighted: false,
    },
  },
];

async function seedTiers() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || mongoUri.includes('<user>')) {
      console.warn('⚠️ MONGO_URI is not configured in .env yet. Running offline mock verification.');
      console.log('Tier configurations defined successfully:');
      tiers.forEach((t) => console.log(`  - [${t.tier.toUpperCase()}] ${t.displayName}`));
      return;
    }

    console.log('Connecting to MongoDB…');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    for (const item of tiers) {
      await SubscriptionTierConfig.findOneAndUpdate(
        { tier: item.tier },
        item,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`✅ Tier seeded/updated: ${item.displayName}`);
    }

    console.log('🎉 Subscription tier seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding tiers:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// Execute if run directly from CLI
if (require.main === module) {
  seedTiers();
}

module.exports = seedTiers;
