/**
 * @file auth.service.js
 * @description Service handling authentication, token generation, password management,
 * and Therapist profile updates.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { Therapist, Client } = require('../models');

/**
 * Generate JWT token for an authenticated entity
 * @param {string} id - MongoDB ObjectId string
 * @param {string} role - 'therapist' | 'client'
 * @returns {string} Signed JWT token
 */
const generateToken = (id, role = 'therapist') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Helper to slugify a string into a clean, URL-safe slug
 * @param {string} text 
 * @returns {string} e.g. "Dr. Priya Sharma" -> "dr-priya-sharma"
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
};

/**
 * Register a new Therapist tenant
 */
const registerTherapist = async (therapistData) => {
  const { name, email, password, practiceName, phone, slug } = therapistData;

  // 1. Check if email already exists
  const existingEmail = await Therapist.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(400, 'Email address is already registered');
  }

  // 2. Generate or validate slug
  let candidateSlug = slug ? slugify(slug) : slugify(practiceName || name);
  let slugExists = await Therapist.findOne({ slug: candidateSlug });

  if (slugExists) {
    // Append random numeric suffix if slug is taken
    candidateSlug = `${candidateSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // 3. Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 4. Create therapist record
  const therapist = await Therapist.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    practiceName: practiceName || `${name}'s Practice`,
    phone,
    slug: candidateSlug,
    subscriptionTier: 'free',
  });

  // 5. Generate token
  const token = generateToken(therapist._id, 'therapist');

  // Omit password from output
  const therapistObj = therapist.toObject();
  delete therapistObj.password;

  return { therapist: therapistObj, token };
};

/**
 * Universal login for Therapist or Client
 */
const login = async (email, password, userType = 'therapist') => {
  let user;

  if (userType === 'therapist') {
    user = await Therapist.findOne({ email: email.toLowerCase() }).select('+password');
  } else {
    user = await Client.findOne({ email: email.toLowerCase() }).select('+password');
  }

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isActive === false) {
    throw new ApiError(403, 'Account deactivated. Please contact support.');
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login
  if (userType === 'therapist') {
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
  }

  const token = generateToken(user._id, userType);

  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj, token, role: userType };
};

/**
 * Check if a workspace slug is available
 */
const checkSlugAvailability = async (candidateSlug) => {
  const formattedSlug = slugify(candidateSlug);
  const existing = await Therapist.findOne({ slug: formattedSlug });
  return {
    slug: formattedSlug,
    isAvailable: !existing,
  };
};

module.exports = {
  generateToken,
  slugify,
  registerTherapist,
  login,
  checkSlugAvailability,
};
