/**
 * @file therapist.routes.js
 * @description Public-facing routes for therapist profile data.
 * No authentication is required — used by the Client Portal.
 */

const express = require('express');
const router  = express.Router();
const therapistController = require('../controllers/therapist.controller');

// Public route — no auth middleware
router.get('/public/:slug', therapistController.getPublicProfile);

module.exports = router;
