
/**
 * @file auth.middleware.js
 * @description Authentication & Authorization middleware for JWT verification.
 */

const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Therapist, Client } = require('../models');

/**
 * Protect routes - verifies JWT and attaches user (Therapist or Client) to req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract Bearer token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication token missing. Please log in.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists (can be Therapist or Client)
    let user;
    let role;

    if (decoded.role === 'therapist' || !decoded.role) {
      user = await Therapist.findById(decoded.id);
      role = 'therapist';
    }

    if (!user && (decoded.role === 'client' || !decoded.role)) {
      user = await Client.findById(decoded.id);
      role = 'client';
    }

    if (!user) {
      throw new ApiError(401, 'The user belonging to this token no longer exists.');
    }

    if (user.isActive === false) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    // Grant access to protected route
    req.user = user;
    req.userRole = role;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token. Access denied.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please log in again.');
    }
    throw error;
  }
});

/**
 * Restrict access to specific roles ('therapist', 'client', 'admin')
 * @param  {...string} roles 
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      throw new ApiError(403, `User role '${req.userRole}' is not authorized to access this resource.`);
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
