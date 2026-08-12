/**
 * @file tierLimit.middleware.js
 * @description Middleware to enforce Subscription Tier limits and feature flags.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { SubscriptionTierConfig, Client, Package, Lead } = require('../models');

/**
 * Check numeric limit against therapist's subscription tier
 * @param {'maxClients' | 'maxPackages' | 'maxLeads'} limitField 
 */
const checkTierLimit = (limitField) => {
  return asyncHandler(async (req, res, next) => {
    // Only applies to therapist accounts
    if (req.userRole !== 'therapist') {
      return next();
    }

    const therapist = req.user;
    const tierName = therapist.subscriptionTier || 'free';

    // Fetch config for therapist's tier
    const config = await SubscriptionTierConfig.findOne({ tier: tierName });

    if (!config) {
      // If config not seeded yet, log warning and bypass
      console.warn(`[TierLimit] Configuration missing for tier '${tierName}'`);
      return next();
    }

    const limit = config.limits ? config.limits[limitField] : -1;

    // -1 represents unlimited limit
    if (limit === -1 || limit === undefined) {
      return next();
    }

    let currentCount = 0;
    if (limitField === 'maxClients') {
      currentCount = await Client.countDocuments({ therapistId: therapist._id });
    } else if (limitField === 'maxPackages') {
      currentCount = await Package.countDocuments({ therapistId: therapist._id });
    } else if (limitField === 'maxLeads') {
      currentCount = await Lead.countDocuments({ therapistId: therapist._id });
    }

    if (currentCount >= limit) {
      throw new ApiError(
        403,
        `Your '${tierName}' subscription plan limit (${limit}) for ${limitField} has been reached. Please upgrade your plan.`
      );
    }

    next();
  });
};

/**
 * Check feature flag enablement against therapist's subscription tier
 * @param {string} featureName - e.g. 'videoCall', 'clientPortal', 'aiNoteSuggestions'
 */
const checkFeatureEnabled = (featureName) => {
  return asyncHandler(async (req, res, next) => {
    if (req.userRole !== 'therapist') {
      return next();
    }

    const therapist = req.user;
    const tierName = therapist.subscriptionTier || 'free';

    const config = await SubscriptionTierConfig.findOne({ tier: tierName });

    if (!config || !config.features) {
      return next();
    }

    const isEnabled = config.features[featureName];

    if (!isEnabled) {
      throw new ApiError(
        403,
        `The feature '${featureName}' is not available on your current '${tierName}' plan. Upgrade to unlock this feature.`
      );
    }

    next();
  });
};

module.exports = {
  checkTierLimit,
  checkFeatureEnabled,
};
