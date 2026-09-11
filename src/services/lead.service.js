/**
 * @file lead.service.js
 * @description Service handling Lead & CRM pipeline management.
 */

const ApiError = require('../utils/ApiError');
const { Lead, Client, Session } = require('../models');

/**
 * Create a new Lead (from booking page enquiry form or therapist entry)
 */
const createLead = async (leadData) => {
  const { therapistId, email } = leadData;

  // Check if lead already exists with this email for the therapist
  const existingLead = await Lead.findOne({
    therapistId,
    email: email.toLowerCase(),
    status: { $ne: 'converted' },
  });

  if (existingLead) {
    // Append enquiry message to existing lead
    if (leadData.enquiryMessage) {
      existingLead.enquiryMessage = `${existingLead.enquiryMessage}\n\n[New Enquiry - ${new Date().toISOString().split('T')[0]}]: ${leadData.enquiryMessage}`;
      await existingLead.save();
      return existingLead;
    }
    return existingLead;
  }

  const lead = await Lead.create({
    ...leadData,
    email: email.toLowerCase(),
  });

  return lead;
};

/**
 * Query leads for a therapist with status filter, search, and pagination
 */
const getLeads = async (therapistId, query = {}) => {
  const { status, priority, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { therapistId };

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

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

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get lead details by ID
 */
const getLeadById = async (therapistId, leadId) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }
  return lead;
};

/**
 * Log a follow-up activity for a lead
 */
const addFollowUp = async (therapistId, leadId, followUpData) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }

  const { type, notes, outcome, nextFollowUpAt } = followUpData;

  lead.followUps.push({
    type,
    notes,
    outcome,
    conductedAt: new Date(),
    nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
  });

  if (nextFollowUpAt) {
    lead.nextFollowUpAt = new Date(nextFollowUpAt);
  }

  if (outcome === 'converted') {
    lead.status = 'converted';
    lead.convertedAt = new Date();
  } else if (outcome === 'not_interested') {
    lead.status = 'lost';
    lead.lostAt = new Date();
  } else if (lead.status === 'new') {
    lead.status = 'contacted';
  }

  await lead.save();
  return lead;
};

/**
 * Convert a Lead into a full Client record
 */
const convertLeadToClient = async (therapistId, leadId, clientOverrideData = {}) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }

  if (lead.status === 'converted' && lead.clientId) {
    throw new ApiError(400, 'This lead has already been converted to a client.');
  }

  // Check if client with this email already exists
  let client = await Client.findOne({ therapistId, email: lead.email });

  if (!client) {
    client = await Client.create({
      therapistId,
      name: clientOverrideData.name || lead.name,
      email: lead.email,
      phone: clientOverrideData.phone || lead.phone,
      preferredSessionMedium: lead.preferredMedium !== 'no_preference' ? lead.preferredMedium : 'video',
      status: 'active',
      onboardedAt: new Date(),
      intake: {
        presentingConcerns: lead.enquiryMessage || '',
        referralSource: lead.referralSource || 'booking_page',
      },
      internalNotes: `Converted from Lead on ${new Date().toISOString().split('T')[0]}.\nEnquiry: ${lead.enquiryMessage || 'N/A'}`,
    });
  }

  // If the lead has requested booking details, also create the scheduled session
  let session = null;
  if (lead.bookingDetails && lead.bookingDetails.scheduledAt && lead.bookingDetails.status !== 'accepted') {
    const scheduledAt = new Date(lead.bookingDetails.scheduledAt);
    const durationMinutes = Number(lead.bookingDetails.durationMinutes) || 50;
    const scheduledEndAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    const conflict = await Session.findOne({
      therapistId,
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledAt: { $lt: scheduledEndAt },
      scheduledEndAt: { $gt: scheduledAt },
    });

    if (!conflict) {
      session = await Session.create({
        therapistId,
        clientId: client._id,
        scheduledAt,
        scheduledEndAt,
        durationMinutes,
        sessionType: lead.bookingDetails.sessionType || 'individual',
        medium: lead.bookingDetails.medium || 'video',
        status: 'scheduled',
        notes: lead.bookingDetails.notes || lead.enquiryMessage || '',
        isClientConfirmed: true,
        clientConfirmedAt: new Date(),
      });
      lead.bookingDetails.status = 'accepted';
      lead.bookingDetails.sessionId = session._id;
    }
  }

  // Mark lead as converted
  lead.status = 'converted';
  lead.clientId = client._id;
  lead.convertedAt = new Date();
  await lead.save();

  return { lead, client, session };
};

/**
 * Accept a booking appointment request from a Lead:
 * 1. Finds or creates the Client record
 * 2. Checks for scheduling conflicts
 * 3. Creates the scheduled Session (status: 'scheduled') -> automatically closes slot in calendar!
 * 4. Marks Lead as converted and accepted
 */
const acceptAppointment = async (therapistId, leadId) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }

  if (!lead.bookingDetails || !lead.bookingDetails.scheduledAt) {
    throw new ApiError(400, 'This lead does not have a requested appointment slot to accept.');
  }

  if (lead.bookingDetails.status === 'accepted' && lead.bookingDetails.sessionId) {
    throw new ApiError(400, 'This appointment has already been accepted and scheduled.');
  }

  // 1. Find or create Client
  let client = await Client.findOne({ therapistId, email: lead.email });
  if (!client) {
    client = await Client.create({
      therapistId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      preferredSessionMedium: lead.bookingDetails.medium || lead.preferredMedium || 'video',
      status: 'active',
      onboardedAt: new Date(),
      intake: {
        presentingConcerns: lead.bookingDetails.notes || lead.enquiryMessage || '',
        referralSource: lead.referralSource || 'booking_page',
      },
      internalNotes: `Converted from Lead via appointment acceptance on ${new Date().toISOString().split('T')[0]}.`,
    });
  }

  // 2. Conflict check
  const scheduledAt = new Date(lead.bookingDetails.scheduledAt);
  const durationMinutes = Number(lead.bookingDetails.durationMinutes) || 50;
  const scheduledEndAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

  const conflict = await Session.findOne({
    therapistId,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledAt: { $lt: scheduledEndAt },
    scheduledEndAt: { $gt: scheduledAt },
  });

  if (conflict) {
    throw new ApiError(409, 'This time slot is already booked by another scheduled session.');
  }

  // 3. Create Session with status: 'scheduled' (this closes the slot!)
  const session = await Session.create({
    therapistId,
    clientId: client._id,
    scheduledAt,
    scheduledEndAt,
    durationMinutes,
    sessionType: lead.bookingDetails.sessionType || 'individual',
    medium: lead.bookingDetails.medium || 'video',
    status: 'scheduled',
    notes: lead.bookingDetails.notes || lead.enquiryMessage || '',
    isClientConfirmed: true,
    clientConfirmedAt: new Date(),
  });

  // 4. Update Lead
  lead.status = 'converted';
  lead.clientId = client._id;
  lead.convertedAt = new Date();
  lead.bookingDetails.status = 'accepted';
  lead.bookingDetails.sessionId = session._id;
  await lead.save();

  return { lead, client, session };
};

/**
 * Reject / decline an appointment request
 */
const rejectAppointment = async (therapistId, leadId, reason) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }

  if (lead.bookingDetails) {
    lead.bookingDetails.status = 'rejected';
  }
  lead.status = 'lost';
  lead.lostAt = new Date();
  lead.lostReason = reason || 'Declined by therapist';
  await lead.save();

  return lead;
};

/**
 * Update lead details or status (e.g. mark lost)
 */
const updateLead = async (therapistId, leadId, updateData) => {
  const lead = await Lead.findOne({ _id: leadId, therapistId });
  if (!lead) {
    throw new ApiError(404, 'Lead not found or access denied.');
  }

  if (updateData.status === 'lost') {
    lead.lostAt = new Date();
  }

  Object.assign(lead, updateData);
  await lead.save();

  return lead;
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  addFollowUp,
  convertLeadToClient,
  acceptAppointment,
  rejectAppointment,
  updateLead,
};
