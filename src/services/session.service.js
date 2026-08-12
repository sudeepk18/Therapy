/**
 * @file session.service.js
 * @description Service handling therapy appointment scheduling, booking, status updates, and cancellations.
 */

const ApiError = require('../utils/ApiError');
const { Session, Client, ClientPackage } = require('../models');

/**
 * Book a new therapy session
 */
const bookSession = async (sessionData) => {
  const { therapistId, clientId, scheduledAt, durationMinutes = 50, medium = 'video', sessionType = 'individual', clientPackageId, feeAmount, currency } = sessionData;

  // 1. Verify Client belongs to Therapist
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or does not belong to this therapist.');
  }

  const start = new Date(scheduledAt);
  if (isNaN(start.getTime())) {
    throw new ApiError(400, 'Invalid scheduledAt date format.');
  }

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  // 2. Check for conflicting scheduled sessions for this therapist
  const conflict = await Session.findOne({
    therapistId,
    status: { $in: ['scheduled', 'in_progress'] },
    $or: [
      { scheduledAt: { $lt: end, $gte: start } },
      { scheduledEndAt: { $gt: start, $lte: end } },
      { scheduledAt: { $lte: start }, scheduledEndAt: { $gte: end } },
    ],
  });

  if (conflict) {
    throw new ApiError(409, 'This time slot conflicts with an existing booked session.');
  }

  let isPaidViaPackage = false;
  let packageRef = null;

  // 3. If booking via a ClientPackage, deduct credit
  if (clientPackageId) {
    packageRef = await ClientPackage.findOne({
      _id: clientPackageId,
      clientId,
      therapistId,
    });

    if (!packageRef || !packageRef.isUsable) {
      throw new ApiError(400, 'The specified Client Package is expired, exhausted, or invalid.');
    }

    // Deduct 1 credit
    packageRef.sessionsUsed += 1;
    await packageRef.save(); // Pre-save hook updates sessionsRemaining & status automatically
    isPaidViaPackage = true;
  }

  // Calculate session number in therapist-client relationship
  const previousSessionCount = await Session.countDocuments({ therapistId, clientId });
  const sessionNumber = previousSessionCount + 1;

  // 4. Create Session
  const session = await Session.create({
    therapistId,
    clientId,
    clientPackageId: packageRef ? packageRef._id : null,
    scheduledAt: start,
    scheduledEndAt: end,
    durationMinutes,
    medium,
    sessionType,
    sessionNumber,
    isPaidViaPackage,
    feeAmount: feeAmount || 0,
    currency: currency || 'INR',
    status: 'scheduled',
  });

  return session;
};

/**
 * List sessions with filtering and pagination
 */
const getSessions = async (filterQuery = {}, pagination = {}) => {
  const { therapistId, clientId, status, startDate, endDate } = filterQuery;
  const { page = 1, limit = 20, sortBy = 'scheduledAt', sortOrder = 'asc' } = pagination;

  const filter = {};

  if (therapistId) filter.therapistId = therapistId;
  if (clientId) filter.clientId = clientId;
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.scheduledAt = {};
    if (startDate) filter.scheduledAt.$gte = new Date(startDate);
    if (endDate) filter.scheduledAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .populate('clientId', 'name email phone avatar tag')
      .populate('therapistId', 'name practiceName brandColor slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Session.countDocuments(filter),
  ]);

  return {
    sessions,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get session details by ID
 */
const getSessionById = async (sessionId, requesterId) => {
  const session = await Session.findById(sessionId)
    .populate('clientId', 'name email phone avatar gender dateOfBirth intake emergencyContact')
    .populate('therapistId', 'name practiceName brandColor avatar slug');

  if (!session) {
    throw new ApiError(404, 'Session appointment not found.');
  }

  // Ensure requester is either the therapist or client for this session
  if (
    session.therapistId._id.toString() !== requesterId.toString() &&
    session.clientId._id.toString() !== requesterId.toString()
  ) {
    throw new ApiError(403, 'Unauthorized access to session details.');
  }

  return session;
};

/**
 * Update session status (e.g. mark completed, in_progress, no_show)
 */
const updateSessionStatus = async (sessionId, therapistId, status) => {
  const session = await Session.findOne({ _id: sessionId, therapistId });
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }

  session.status = status;
  await session.save();
  return session;
};

/**
 * Cancel a session appointment
 */
const cancelSession = async (sessionId, cancelledBy, cancellationData = {}) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }

  if (session.status === 'cancelled') {
    throw new ApiError(400, 'Session is already cancelled.');
  }

  session.status = 'cancelled';
  session.cancellation = {
    cancelledBy,
    reason: cancellationData.reason || 'client_request',
    notes: cancellationData.notes || '',
    cancelledAt: new Date(),
    feeWaived: cancellationData.feeWaived || false,
  };

  // If session was paid via ClientPackage and fee is waived or cancelled by therapist, refund 1 credit back
  if (session.isPaidViaPackage && session.clientPackageId) {
    const pkg = await ClientPackage.findById(session.clientPackageId);
    if (pkg && pkg.sessionsUsed > 0) {
      pkg.sessionsUsed -= 1;
      if (pkg.status === 'exhausted') {
        pkg.status = 'active';
      }
      await pkg.save();
    }
  }

  await session.save();
  return session;
};

module.exports = {
  bookSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  cancelSession,
};
