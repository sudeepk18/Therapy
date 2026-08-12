/**
 * @file package.routes.js
 * @description Routes for session bundle package templates and client package management.
 */

const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { checkTierLimit, checkFeatureEnabled } = require('../middleware/tierLimit.middleware');

// ── Public Routes ────────────────────────────────────────────────────────────
// Booking page: show available packages for a therapist
router.get('/public/:therapistId', packageController.getPublicPackages);

// ── Protected Therapist Routes ───────────────────────────────────────────────
router.use(protect);
router.use(restrictTo('therapist'));

router
  .route('/')
  .post(
    checkTierLimit('maxPackages'),
    checkFeatureEnabled('sessionPackages'),
    packageController.createPackage
  )
  .get(packageController.getPackages);

router
  .route('/:id')
  .get(packageController.getPackageById)
  .patch(packageController.updatePackage)
  .delete(packageController.deactivatePackage);

// Gift / manually assign a package to a client
router.post('/:id/assign', packageController.assignPackageToClient);

// Get all packages owned by a specific client
router.get('/client/:clientId', packageController.getClientPackages);

module.exports = router;
