/**
 * @file therapist.controller.js
 * @description Public-facing controller for therapist profile data.
 * These routes are accessible WITHOUT authentication (used by the Client Portal).
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const { Therapist } = require('../models');

/**
 * @route   GET /api/v1/therapist/public/:slug
 * @desc    Fetch a therapist's public profile by workspace slug.
 *          Used by the Client Portal landing page (/client/:slug).
 * @access  Public (no auth required)
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const therapist = await Therapist.findOne({ slug, isActive: true }).lean();

  if (!therapist) {
    throw new ApiError(404, 'Therapist profile not found');
  }

  const { Availability } = require('../models');
  const activeRules = await Availability.find({
    therapistId: therapist._id,
    isOverride: false,
    isDayAvailable: true,
  }).select('dayOfWeek');
  const availableDays = activeRules.map((r) => r.dayOfWeek);

  // Only expose fields that are safe to share publicly
  const publicProfile = {
    _id:              therapist._id,
    name:             therapist.name,
    availableDays,
    practiceName:     therapist.practiceName,
    slug:             therapist.slug,
    avatar:           therapist.avatar,
    brandColor:       therapist.brandColor,
    isBookingOpen:    therapist.isBookingOpen,
    email:            therapist.email,
    phone:            therapist.phone,
    // Flatten professional details for convenience
    bio:              therapist.professionalDetails?.bio,
    specializations:  therapist.professionalDetails?.specializations || [],
    languages:        therapist.professionalDetails?.languages || [],
    qualifications:   therapist.professionalDetails?.qualifications || [],
    yearsOfExperience: therapist.professionalDetails?.yearsOfExperience,
    // Session modes derived from availability config (fallback to common modes)
    sessionModes:     ['Online', 'In-Person'],
    city:             therapist.city,
    country:          therapist.country,
    socialLinks:      therapist.socialLinks,
  };

  res.status(200).json(
    new ApiResponse(200, publicProfile, 'Therapist public profile fetched')
  );
});

module.exports = {
  getPublicProfile,
};
