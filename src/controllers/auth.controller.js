/**
 * @file auth.controller.js
 * @description Controller handling authentication routes and therapist profile management.
 */

const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');
const { Therapist } = require('../models');

// Cookie options helper for JWT authentication
const getCookieOptions = () => ({
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  httpOnly: true, // Prevents client-side JS XSS attacks from reading the cookie
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
});

/**
 * @route   POST /api/v1/auth/register-therapist
 * @desc    Register a new Therapist account
 * @access  Public
 */
const registerTherapist = asyncHandler(async (req, res) => {
  const { name, email, password, practiceName, phone, slug } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields');
  }

  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }

  const result = await authService.registerTherapist({
    name,
    email,
    password,
    practiceName,
    phone,
    slug,
  });

  // Set HTTP-only cookie
  res.cookie('token', result.token, getCookieOptions());

  res
    .status(201)
    .json(new ApiResponse(201, result, 'Therapist registered successfully'));
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Log in therapist or client
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const userType = role === 'client' ? 'client' : 'therapist';
  const result = await authService.login(email, password, userType);

  // Set HTTP-only cookie
  res.cookie('token', result.token, getCookieOptions());

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Logged in successfully'));
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Log out user and clear auth cookie
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
  });
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user details
 * @access  Private (Therapist or Client)
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user, role: req.userRole }, 'Current user profile fetched')
  );
});

/**
 * @route   GET /api/v1/auth/check-slug/:slug
 * @desc    Check workspace slug availability for onboarding
 * @access  Public
 */
const checkSlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const result = await authService.checkSlugAvailability(slug);
  res.status(200).json(new ApiResponse(200, result, 'Slug availability checked'));
});

/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update therapist profile and professional details
 * @access  Private (Therapist)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const { name, phone, avatar, professionalDetails, socialLinks, payoutDetails } = req.body;

  const therapist = await Therapist.findById(therapistId);
  if (!therapist) {
    throw new ApiError(404, 'Therapist profile not found');
  }

  if (name) therapist.name = name;
  if (phone) therapist.phone = phone;
  if (avatar) therapist.avatar = avatar;

  if (professionalDetails) {
    therapist.professionalDetails = {
      ...therapist.professionalDetails?.toObject(),
      ...professionalDetails,
    };
  }

  if (socialLinks) {
    therapist.socialLinks = {
      ...therapist.socialLinks?.toObject(),
      ...socialLinks,
    };
  }

  if (payoutDetails) {
    therapist.payoutDetails = {
      ...therapist.payoutDetails?.toObject(),
      ...payoutDetails,
    };
  }

  await therapist.save();

  res.status(200).json(
    new ApiResponse(200, therapist, 'Profile updated successfully')
  );
});

/**
 * @route   PATCH /api/v1/auth/branding
 * @desc    Update therapist workspace branding (practice name, hex color, slug)
 * @access  Private (Therapist)
 */
const updateBranding = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const { practiceName, brandColor, slug, isBookingOpen } = req.body;

  const therapist = await Therapist.findById(therapistId);
  if (!therapist) {
    throw new ApiError(404, 'Therapist not found');
  }

  if (practiceName) therapist.practiceName = practiceName;
  if (brandColor) therapist.brandColor = brandColor;
  if (typeof isBookingOpen === 'boolean') therapist.isBookingOpen = isBookingOpen;

  if (slug && slug !== therapist.slug) {
    const formattedSlug = authService.slugify(slug);
    const slugTaken = await Therapist.findOne({ slug: formattedSlug });

    if (slugTaken) {
      throw new ApiError(400, 'This workspace slug is already taken. Please choose another.');
    }
    therapist.slug = formattedSlug;
  }

  await therapist.save();

  res.status(200).json(
    new ApiResponse(200, therapist, 'Branding updated successfully')
  );
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change current user password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long');
  }

  let user;
  if (req.userRole === 'therapist') {
    user = await Therapist.findById(req.user._id).select('+password');
  } else {
    user = await Client.findById(req.user._id).select('+password');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Password changed successfully')
  );
});

module.exports = {
  registerTherapist,
  login,
  logout,
  getMe,
  checkSlug,
  updateProfile,
  updateBranding,
  changePassword,
};
