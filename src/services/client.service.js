/**
 * @file client.service.js
 * @description Service handling Client management business logic.
 */

const ApiError = require('../utils/ApiError');
const { Client, Session } = require('../models');

/**
 * Create a new Client record for a therapist
 */
const createClient = async (therapistId, clientData) => {
  const { email, name } = clientData;

  // Check duplicate email under this specific therapist
  const existingClient = await Client.findOne({
    therapistId,
    email: email.toLowerCase(),
  });

  if (existingClient) {
    throw new ApiError(400, `A client with email '${email}' already exists in your practice.`);
  }

  const client = await Client.create({
    ...clientData,
    therapistId,
    email: email.toLowerCase(),
    onboardedAt: new Date(),
  });

  return client;
};

/**
 * Query clients for a therapist with filtering, search, and pagination
 */
const getClients = async (therapistId, query = {}) => {
  const { status, tag, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { therapistId };

  if (status) {
    filter.status = status;
  }

  if (tag && tag !== 'none') {
    filter.tag = tag;
  }

  // Search by name, email, or phone
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = parseInt(limit, 10);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Client.countDocuments(filter),
  ]);

  return {
    clients,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get single client by ID including session stats
 */
const getClientById = async (therapistId, clientId) => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  // Summary stats
  const totalSessions = await Session.countDocuments({ clientId, therapistId });
  const completedSessions = await Session.countDocuments({ clientId, therapistId, status: 'completed' });
  const upcomingSession = await Session.findOne({
    clientId,
    therapistId,
    status: 'scheduled',
    scheduledAt: { $gte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .select('scheduledAt medium sessionType durationMinutes');

  return {
    client,
    stats: {
      totalSessions,
      completedSessions,
      upcomingSession,
    },
  };
};

/**
 * Update client details
 */
const updateClient = async (therapistId, clientId, updateData) => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  // Prevent email collision if email is updated
  if (updateData.email && updateData.email.toLowerCase() !== client.email) {
    const existing = await Client.findOne({
      therapistId,
      email: updateData.email.toLowerCase(),
      _id: { $ne: clientId },
    });
    if (existing) {
      throw new ApiError(400, 'Another client already uses this email address.');
    }
    updateData.email = updateData.email.toLowerCase();
  }

  Object.assign(client, updateData);
  await client.save();

  return client;
};

/**
 * Update client intake record
 */
const updateClientIntake = async (therapistId, clientId, intakeData) => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  client.intake = {
    ...client.intake?.toObject(),
    ...intakeData,
  };

  await client.save();
  return client;
};

/**
 * Submit / Update Digital Consent
 */
const submitConsent = async (therapistId, clientId, consentData, clientIp = '') => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  const { isConsentAccepted, consentSignatureName, consentVersion = '1.0' } = consentData;

  client.consent = {
    isConsentAccepted: Boolean(isConsentAccepted),
    consentAcceptedAt: isConsentAccepted ? new Date() : null,
    consentSignatureName: consentSignatureName || client.name,
    consentVersion,
    consentIp: clientIp,
  };

  await client.save();
  return client;
};

/**
 * Get Client Intake Information
 */
const getClientIntake = async (therapistId, clientId) => {
  const client = await Client.findOne({ _id: clientId, therapistId }).select('name email intake');
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }
  return client.intake;
};

/**
 * Get Client Digital Consent Status
 */
const getClientConsent = async (therapistId, clientId) => {
  const client = await Client.findOne({ _id: clientId, therapistId }).select('name email consent');
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }
  return client.consent;
};

/**
 * Aggregated full client profile (basic info, session history, intake, consent, stats)
 */
const getClientProfile = async (therapistId, clientId) => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  const sessions = await Session.find({ clientId, therapistId }).sort({ scheduledAt: -1 });
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) >= new Date());

  return {
    client,
    intake: client.intake,
    consent: client.consent,
    sessions,
    stats: {
      totalSessions: sessions.length,
      completedCount: completedSessions.length,
      upcomingCount: upcomingSessions.length,
      nextSession: upcomingSessions[0] || null,
    },
  };
};

/**
 * Discharge client from active care
 */
const dischargeClient = async (therapistId, clientId, dischargeNotes = '') => {
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found or access denied.');
  }

  client.status = 'discharged';
  client.dischargedAt = new Date();
  if (dischargeNotes) {
    client.internalNotes = client.internalNotes
      ? `${client.internalNotes}\n\nDischarge Note (${new Date().toISOString().split('T')[0]}): ${dischargeNotes}`
      : `Discharge Note (${new Date().toISOString().split('T')[0]}): ${dischargeNotes}`;
  }

  await client.save();
  return client;
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  getClientProfile,
  updateClient,
  updateClientIntake,
  getClientIntake,
  submitConsent,
  getClientConsent,
  dischargeClient,
};
