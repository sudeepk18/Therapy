/**
 * @file sessionNote.service.js
 * @description Service handling clinical session note creation, SOAP/DAP formatting,
 * draft/finalized workflow, digital signatures, and client portal sharing.
 */

const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { SessionNote, Session } = require('../models');

/**
 * Create a new session note (starts in 'draft' status)
 */
const createNote = async (noteData) => {
  const { sessionId, therapistId, clientId, noteType } = noteData;

  // Verify session exists and belongs to this therapist
  const session = await Session.findOne({ _id: sessionId, therapistId });
  if (!session) {
    throw new ApiError(404, 'Session not found or access denied.');
  }

  // Verify client matches the session
  if (session.clientId.toString() !== clientId.toString()) {
    throw new ApiError(400, 'Client ID does not match the session record.');
  }

  // Auto-generate title if not provided
  const title = noteData.title || `${noteType.toUpperCase()} Note – Session #${session.sessionNumber || ''}`;

  const note = await SessionNote.create({
    ...noteData,
    title,
    status: 'draft',
  });

  return note;
};

/**
 * Get all notes for a specific session
 */
const getNotesBySession = async (sessionId, therapistId) => {
  const session = await Session.findOne({ _id: sessionId, therapistId });
  if (!session) {
    throw new ApiError(404, 'Session not found or access denied.');
  }

  const notes = await SessionNote.find({ sessionId, therapistId })
    .sort({ createdAt: -1 })
    .lean();

  return notes;
};

/**
 * Get all notes for a specific client (therapist's view — full note history)
 */
const getNotesByClient = async (clientId, therapistId, query = {}) => {
  const { noteType, status, page = 1, limit = 20 } = query;

  const filter = { clientId, therapistId };
  if (noteType) filter.noteType = noteType;
  if (status) filter.status = status;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);

  const [notes, total] = await Promise.all([
    SessionNote.find(filter)
      .populate('sessionId', 'scheduledAt sessionNumber medium sessionType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    SessionNote.countDocuments(filter),
  ]);

  return {
    notes,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get a single note by ID
 */
const getNoteById = async (noteId, requesterId) => {
  const note = await SessionNote.findById(noteId)
    .populate('sessionId', 'scheduledAt sessionNumber medium sessionType durationMinutes')
    .populate('clientId', 'name email avatar');

  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  // Access check: must be the authoring therapist or the shared client
  const isTherapist = note.therapistId.toString() === requesterId.toString();
  const isClient = note.clientId._id.toString() === requesterId.toString() && note.isSharedWithClient;

  if (!isTherapist && !isClient) {
    throw new ApiError(403, 'You do not have permission to view this note.');
  }

  return note;
};

/**
 * Update a draft note's content (only drafts can be edited)
 */
const updateNote = async (noteId, therapistId, updateData) => {
  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  if (note.status === 'signed') {
    throw new ApiError(400, 'Signed notes cannot be edited. Create an amendment instead.');
  }

  // Merge structured note fields carefully
  if (updateData.soap && note.noteType === 'soap') {
    note.soap = { ...note.soap?.toObject(), ...updateData.soap };
    delete updateData.soap;
  }

  if (updateData.dap && note.noteType === 'dap') {
    note.dap = { ...note.dap?.toObject(), ...updateData.dap };
    delete updateData.dap;
  }

  if (updateData.riskAssessment) {
    note.riskAssessment = { ...note.riskAssessment?.toObject(), ...updateData.riskAssessment };
    delete updateData.riskAssessment;
  }

  // Apply remaining flat fields
  Object.assign(note, updateData);
  await note.save();

  return note;
};

/**
 * Finalize a draft note (therapist marks it as complete but not yet signed)
 */
const finalizeNote = async (noteId, therapistId) => {
  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  if (note.status !== 'draft') {
    throw new ApiError(400, `Note is already '${note.status}'. Only draft notes can be finalized.`);
  }

  note.status = 'finalized';
  await note.save();

  return note;
};

/**
 * Digitally sign a finalized note (locks it from further editing)
 * Creates a SHA-256 hash of the note content as a tamper-evident signature.
 */
const signNote = async (noteId, therapistId) => {
  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  if (note.status === 'signed') {
    throw new ApiError(400, 'Note has already been signed.');
  }

  if (note.status === 'draft') {
    throw new ApiError(400, 'Please finalize the note before signing.');
  }

  // Build content payload for hashing
  const contentPayload = JSON.stringify({
    noteId: note._id.toString(),
    therapistId: therapistId.toString(),
    noteType: note.noteType,
    content: note.content || '',
    soap: note.soap || null,
    dap: note.dap || null,
    riskAssessment: note.riskAssessment || null,
    diagnosisCodes: note.diagnosisCodes || [],
    interventionsUsed: note.interventionsUsed || [],
    homework: note.homework || '',
    signedAt: new Date().toISOString(),
  });

  const signatureHash = crypto.createHash('sha256').update(contentPayload).digest('hex');

  note.status = 'signed';
  note.isSigned = true;
  note.signedAt = new Date();
  note.signatureHash = signatureHash;

  await note.save();

  return { note, signatureHash };
};

/**
 * Share or unshare a note with the client via their portal
 */
const toggleClientSharing = async (noteId, therapistId, share) => {
  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  if (note.status === 'draft') {
    throw new ApiError(400, 'Draft notes cannot be shared with clients. Please finalize or sign first.');
  }

  note.isSharedWithClient = share;
  note.sharedWithClientAt = share ? new Date() : null;

  await note.save();
  return note;
};

/**
 * Get notes shared with a client (client portal view)
 */
const getSharedNotesForClient = async (clientId, query = {}) => {
  const { page = 1, limit = 20 } = query;

  const filter = { clientId, isSharedWithClient: true };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);

  const [notes, total] = await Promise.all([
    SessionNote.find(filter)
      .populate('sessionId', 'scheduledAt sessionNumber medium')
      .select('-signatureHash -riskAssessment') // Hide sensitive fields from client view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    SessionNote.countDocuments(filter),
  ]);

  return {
    notes,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Delete a draft note (only drafts can be deleted — signed/finalized are immutable)
 */
const deleteNote = async (noteId, therapistId) => {
  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  if (note.status !== 'draft') {
    throw new ApiError(400, 'Only draft notes can be deleted. Signed/finalized notes are permanent records.');
  }

  await SessionNote.deleteOne({ _id: noteId });
  return true;
};

module.exports = {
  createNote,
  getNotesBySession,
  getNotesByClient,
  getNoteById,
  updateNote,
  finalizeNote,
  signNote,
  toggleClientSharing,
  getSharedNotesForClient,
  deleteNote,
};
