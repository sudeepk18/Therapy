/**
 * @file lead.controller.js
 * @description Controller for Lead & CRM pipeline APIs.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const leadService = require('../services/lead.service');

/**
 * @route   POST /api/v1/leads
 * @desc    Create a new lead (public enquiry or manual entry)
 * @access  Public / Private
 */
const createLead = asyncHandler(async (req, res) => {
  const { therapistId, name, email } = req.body;

  // If authenticated as therapist, default to req.user._id
  const targetTherapistId = therapistId || (req.user && req.userRole === 'therapist' ? req.user._id : null);

  if (!targetTherapistId) {
    throw new ApiError(400, 'Therapist ID is required to submit a lead enquiry');
  }

  if (!name || !email) {
    throw new ApiError(400, 'Name and email are required fields');
  }

  const lead = await leadService.createLead({
    ...req.body,
    therapistId: targetTherapistId,
  });

  res.status(201).json(new ApiResponse(201, lead, 'Enquiry submitted successfully'));
});

/**
 * @route   GET /api/v1/leads
 * @desc    Get therapist's lead pipeline
 * @access  Private (Therapist)
 */
const getLeads = asyncHandler(async (req, res) => {
  const result = await leadService.getLeads(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Lead pipeline fetched'));
});

/**
 * @route   GET /api/v1/leads/:id
 * @desc    Get lead details by ID
 * @access  Private (Therapist)
 */
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, lead, 'Lead details fetched'));
});

/**
 * @route   POST /api/v1/leads/:id/follow-up
 * @desc    Log a follow-up activity for a lead
 * @access  Private (Therapist)
 */
const addFollowUp = asyncHandler(async (req, res) => {
  const { type } = req.body;
  if (!type) {
    throw new ApiError(400, 'Follow-up activity type is required');
  }

  const lead = await leadService.addFollowUp(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, lead, 'Follow-up activity recorded'));
});

/**
 * @route   POST /api/v1/leads/:id/convert
 * @desc    Convert lead to full Client record
 * @access  Private (Therapist)
 */
const convertLeadToClient = asyncHandler(async (req, res) => {
  const result = await leadService.convertLeadToClient(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, result, 'Lead successfully converted to Client'));
});

/**
 * @route   PATCH /api/v1/leads/:id
 * @desc    Update lead status or details
 * @access  Private (Therapist)
 */
const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, lead, 'Lead updated successfully'));
});

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  addFollowUp,
  convertLeadToClient,
  updateLead,
};
