/**
 * @file sessionNote.routes.js
 * @description Routes for clinical session note management.
 */

const express = require('express');
const router = express.Router();
const noteController = require('../controllers/sessionNote.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// ── Client Portal Route ──────────────────────────────────────────────────────
// Client can view notes that have been shared with them
router.get('/my-notes', restrictTo('client'), noteController.getMySharedNotes);

// ── Therapist Routes ─────────────────────────────────────────────────────────
router.post('/', restrictTo('therapist'), noteController.createNote);

// Fetch notes for a specific session or client
router.get('/session/:sessionId', restrictTo('therapist'), noteController.getNotesBySession);
router.get('/client/:clientId', restrictTo('therapist'), noteController.getNotesByClient);

// Single note operations (therapist OR shared client)
router.get('/:id', noteController.getNoteById);

// Therapist-only note management
router.patch('/:id', restrictTo('therapist'), noteController.updateNote);
router.delete('/:id', restrictTo('therapist'), noteController.deleteNote);

// Workflow actions
router.post('/:id/finalize', restrictTo('therapist'), noteController.finalizeNote);
router.post('/:id/sign', restrictTo('therapist'), noteController.signNote);
router.patch('/:id/share', restrictTo('therapist'), noteController.toggleClientSharing);

module.exports = router;
