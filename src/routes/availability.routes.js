/**
 * @file availability.routes.js
 * @description Routes for availability schedules and free booking slots.
 */

const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availability.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public endpoint to query free booking slots for a therapist on a date
router.get('/slots', availabilityController.getAvailableSlots);

// Protected therapist routes
router.use(protect);
router.use(restrictTo('therapist'));

router
  .route('/weekly')
  .get(availabilityController.getWeeklyAvailability)
  .put(availabilityController.setWeeklyAvailability);

router.post('/override', availabilityController.setOverride);
router.delete('/override/:id', availabilityController.deleteOverride);

module.exports = router;
