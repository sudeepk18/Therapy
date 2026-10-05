/**
 * @file sessionNote.controller.js
 * @description Controller for clinical session note endpoints.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const sessionNoteService = require('../services/sessionNote.service');

/**
 * @route   POST /api/v1/session-notes
 * @desc    Create a new session note (draft)
 * @access  Private (Therapist)
 */
const createNote = asyncHandler(async (req, res) => {
  const { sessionId, clientId, noteType } = req.body;

  if (!sessionId || !clientId || !noteType) {
    throw new ApiError(400, 'sessionId, clientId, and noteType are required');
  }

  const note = await sessionNoteService.createNote({
    ...req.body,
    therapistId: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, note, 'Session note created as draft'));
});

/**
 * @route   GET /api/v1/session-notes/session/:sessionId
 * @desc    Get all notes for a session
 * @access  Private (Therapist)
 */
const getNotesBySession = asyncHandler(async (req, res) => {
  const notes = await sessionNoteService.getNotesBySession(req.params.sessionId, req.user._id);
  res.status(200).json(new ApiResponse(200, notes, 'Session notes fetched'));
});

/**
 * @route   GET /api/v1/session-notes/client/:clientId
 * @desc    Get full note history for a client
 * @access  Private (Therapist)
 */
const getNotesByClient = asyncHandler(async (req, res) => {
  const result = await sessionNoteService.getNotesByClient(req.params.clientId, req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Client note history fetched'));
});

/**
 * @route   GET /api/v1/session-notes/my-notes
 * @desc    Get notes shared with the currently logged-in client (client portal)
 * @access  Private (Client)
 */
const getMySharedNotes = asyncHandler(async (req, res) => {
  const result = await sessionNoteService.getSharedNotesForClient(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Your shared notes fetched'));
});

/**
 * @route   GET /api/v1/session-notes/:id
 * @desc    Get a single note by ID
 * @access  Private (Therapist or shared Client)
 */
const getNoteById = asyncHandler(async (req, res) => {
  const note = await sessionNoteService.getNoteById(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, note, 'Session note details fetched'));
});

/**
 * @route   PATCH /api/v1/session-notes/:id
 * @desc    Update a draft note's content
 * @access  Private (Therapist)
 */
const updateNote = asyncHandler(async (req, res) => {
  const note = await sessionNoteService.updateNote(req.params.id, req.user._id, req.body);
  res.status(200).json(new ApiResponse(200, note, 'Session note updated'));
});

/**
 * @route   POST /api/v1/session-notes/:id/finalize
 * @desc    Finalize a draft note
 * @access  Private (Therapist)
 */
const finalizeNote = asyncHandler(async (req, res) => {
  const note = await sessionNoteService.finalizeNote(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, note, 'Session note finalized'));
});

/**
 * @route   POST /api/v1/session-notes/:id/sign
 * @desc    Digitally sign a finalized note (locks it permanently)
 * @access  Private (Therapist)
 */
const signNote = asyncHandler(async (req, res) => {
  const result = await sessionNoteService.signNote(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, result, 'Session note digitally signed and locked'));
});

/**
 * @route   PATCH /api/v1/session-notes/:id/share
 * @desc    Share or unshare a note with the client portal
 * @access  Private (Therapist)
 */
const toggleClientSharing = asyncHandler(async (req, res) => {
  const { share } = req.body;
  if (typeof share !== 'boolean') {
    throw new ApiError(400, '"share" field must be a boolean (true/false)');
  }

  const note = await sessionNoteService.toggleClientSharing(req.params.id, req.user._id, share);
  const msg = share ? 'Note shared with client portal' : 'Note unshared from client portal';
  res.status(200).json(new ApiResponse(200, note, msg));
});

/**
 * @route   DELETE /api/v1/session-notes/:id
 * @desc    Delete a draft note
 * @access  Private (Therapist)
 */
const deleteNote = asyncHandler(async (req, res) => {
  await sessionNoteService.deleteNote(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, null, 'Draft note deleted'));
});

module.exports = {
  createNote,
  getNotesBySession,
  getNotesByClient,
  getMySharedNotes,
  getNoteById,
  updateNote,
  finalizeNote,
  signNote,
  toggleClientSharing,
  deleteNote,
};
