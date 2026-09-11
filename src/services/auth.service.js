/**
 * @file auth.service.js
 * @description Service handling authentication, token generation, password management,
 * and Therapist profile updates.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { generateSlug } = require('../utils/generateSlug');
const { Therapist, Client } = require('../models');
const { seedDefaultAvailability } = require('./availability.service');

/**
 * Generate JWT token for an authenticated entity
 * @param {string} id - MongoDB ObjectId string
 * @param {string} role - 'therapist' | 'client'
 * @returns {string} Signed JWT token
 */
const generateToken = (id, role = 'therapist') => {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Helper to slugify a string into a clean, URL-safe slug
 * @param {string} text 
 * @returns {string} e.g. "Dr. Priya Sharma" -> "dr-priya-sharma"
 */
const slugify = (text) => generateSlug(text);

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

  // Seed default weekly working hours (Mon-Sat)
  try {
    await seedDefaultAvailability(therapist._id);
  } catch (err) {
    console.error('Failed to seed default availability on registration:', err);
  }

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
    // Clients must have portal access enabled before they can log in
    user = await Client.findOne({ email: email.toLowerCase(), hasPortalAccess: true }).select('+password');
    if (!user) {
      // Check if the client exists but hasn't activated their portal yet
      const clientExists = await Client.findOne({ email: email.toLowerCase() });
      if (clientExists) {
        throw new ApiError(403, 'Your portal account has not been activated yet. Please check your invite link.');
      }
    }
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

/**
 * Generate a portal invite token for a client.
 * Stores a hashed version on the Client document and returns the raw token
 * + the full invite URL for the therapist to share.
 *
 * @param {string} clientId - MongoDB ObjectId of the Client
 * @param {string} therapistId - MongoDB ObjectId of the Therapist (for access check)
 * @param {string} therapistSlug - Therapist workspace slug (used to build the URL)
 * @returns {{ inviteUrl: string, client: object }}
 */
const inviteClient = async (clientId, therapistId, therapistSlug) => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  // Generate a cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Store only the hash (never store raw tokens in DB)
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  client.portalInviteToken = hashedToken;
  client.portalInviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
  await client.save({ validateBeforeSave: false });

  // Build the full set-password URL
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const inviteUrl = `${frontendUrl}/client/${therapistSlug}/set-password?token=${rawToken}`;

  const clientObj = client.toObject();
  return { inviteUrl, client: clientObj };
};

/**
 * Validate an invite token and set the client's portal password.
 * On success, activates portal access and clears the one-time token.
 *
 * @param {string} rawToken - Raw token from the URL query param
 * @param {string} newPassword - Plaintext password chosen by the client
 * @returns {{ user: object, token: string, role: string }}
 */
const setClientPassword = async (rawToken, newPassword) => {
  // Hash the incoming token to compare with what's stored
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const client = await Client.findOne({
    portalInviteToken: hashedToken,
    portalInviteExpires: { $gt: new Date() }, // token must not be expired
  });

  if (!client) {
    throw new ApiError(400, 'Invite link is invalid or has expired. Please ask your therapist for a new one.');
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  client.password = await bcrypt.hash(newPassword, salt);
  client.hasPortalAccess = true;
  client.isEmailVerified = true;

  // Clear the one-time token
  client.portalInviteToken = undefined;
  client.portalInviteExpires = undefined;

  await client.save({ validateBeforeSave: false });

  // Immediately log the client in
  const jwtToken = generateToken(client._id, 'client');

  const clientObj = client.toObject();
  delete clientObj.password;

  return { user: clientObj, token: jwtToken, role: 'client' };
};

module.exports = {
  generateToken,
  slugify,
  registerTherapist,
  login,
  checkSlugAvailability,
  inviteClient,
  setClientPassword,
};
