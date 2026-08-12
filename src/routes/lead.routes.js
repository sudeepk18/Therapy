/**
 * @file lead.routes.js
 * @description Lead & CRM pipeline routes.
 */

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { checkTierLimit } = require('../middleware/tierLimit.middleware');

// Public route to submit an enquiry lead from the booking page
router.post('/public', leadController.createLead);

// Protected therapist-only CRM routes
router.use(protect);
router.use(restrictTo('therapist'));

router
  .route('/')
  .post(checkTierLimit('maxLeads'), leadController.createLead)
  .get(leadController.getLeads);

router
  .route('/:id')
  .get(leadController.getLeadById)
  .patch(leadController.updateLead);

router.post('/:id/follow-up', leadController.addFollowUp);
router.post('/:id/convert', checkTierLimit('maxClients'), leadController.convertLeadToClient);

module.exports = router;
