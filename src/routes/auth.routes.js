/**
 * @file auth.routes.js
 * @description Authentication and Workspace Profile routes.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public routes
router.post('/register-therapist', authController.registerTherapist);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/check-slug/:slug', authController.checkSlug);

// Protected routes (Requires valid JWT token)
router.use(protect);

router.get('/me', authController.getMe);
router.post('/change-password', authController.changePassword);

// Therapist-only profile management routes
router.patch('/profile', restrictTo('therapist'), authController.updateProfile);
router.patch('/branding', restrictTo('therapist'), authController.updateBranding);

module.exports = router;
