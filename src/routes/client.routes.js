/**
 * @file client.routes.js
 * @description Client management routes for therapists.
 */

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { checkTierLimit } = require('../middleware/tierLimit.middleware');

// All routes require therapist authentication
router.use(protect);
router.use(restrictTo('therapist'));

router
  .route('/')
  .post(checkTierLimit('maxClients'), clientController.createClient)
  .get(clientController.getClients);

router
  .route('/:id')
  .get(clientController.getClientById)
  .patch(clientController.updateClient);

router.patch('/:id/intake', clientController.updateClientIntake);
router.post('/:id/discharge', clientController.dischargeClient);

module.exports = router;
