/**
 * @file client.controller.js
 * @description Controller for Client management APIs.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const clientService = require('../services/client.service');

/**
 * @route   POST /api/v1/clients
 * @desc    Create a new client
 * @access  Private (Therapist)
 */
const createClient = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    throw new ApiError(400, 'Name and email are required fields');
  }

  const client = await clientService.createClient(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, client, 'Client created successfully'));
});

/**
 * @route   GET /api/v1/clients
 * @desc    Get list of clients with search & filter
 * @access  Private (Therapist)
 */
const getClients = asyncHandler(async (req, res) => {
  const result = await clientService.getClients(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Clients fetched successfully'));
});

/**
 * @route   GET /api/v1/clients/:id
 * @desc    Get client details by ID
 * @access  Private (Therapist)
 */
const getClientById = asyncHandler(async (req, res) => {
  const result = await clientService.getClientById(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, result, 'Client details fetched'));
});

/**
 * @route   PATCH /api/v1/clients/:id
 * @desc    Update client info
 * @access  Private (Therapist)
 */
const updateClient = asyncHandler(async (req, res) => {
  const client = await clientService.updateClient(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, client, 'Client updated successfully'));
});

/**
 * @route   PATCH /api/v1/clients/:id/intake
 * @desc    Update client clinical intake details
 * @access  Private (Therapist)
 */
const updateClientIntake = asyncHandler(async (req, res) => {
  const client = await clientService.updateClientIntake(req.user._id, req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, client, 'Client intake updated successfully'));
});

/**
 * @route   GET /api/v1/clients/:id/profile
 * @desc    Get aggregated client profile (basic info, session history, intake, consent, stats)
 * @access  Private (Therapist)
 */
const getClientProfile = asyncHandler(async (req, res) => {
  const result = await clientService.getClientProfile(req.user._id, req.params.id);
  res.status(200).json(new ApiResponse(200, result, 'Aggregated client profile fetched'));
});

/**
 * @route   GET /api/v1/clients/:id/intake
 * @desc    Get client intake responses
 * @access  Private (Therapist or Client)
 */
const getClientIntake = asyncHandler(async (req, res) => {
  const therapistId = req.userRole === 'therapist' ? req.user._id : req.user.therapistId;
  const intake = await clientService.getClientIntake(therapistId, req.params.id);
  res.status(200).json(new ApiResponse(200, intake, 'Client intake retrieved'));
});

/**
 * @route   GET /api/v1/clients/:id/consent
 * @desc    Get client digital consent status
 * @access  Private (Therapist or Client)
 */
const getClientConsent = asyncHandler(async (req, res) => {
  const therapistId = req.userRole === 'therapist' ? req.user._id : req.user.therapistId;
  const consent = await clientService.getClientConsent(therapistId, req.params.id);
  res.status(200).json(new ApiResponse(200, consent, 'Client consent status retrieved'));
});

/**
 * @route   POST /api/v1/clients/:id/consent
 * @desc    Submit digital consent
 * @access  Private (Therapist or Client)
 */
const submitConsent = asyncHandler(async (req, res) => {
  const therapistId = req.userRole === 'therapist' ? req.user._id : req.user.therapistId;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const client = await clientService.submitConsent(therapistId, req.params.id, req.body, clientIp);
  res.status(200).json(new ApiResponse(200, client.consent, 'Consent recorded successfully'));
});

/**
 * @route   POST /api/v1/clients/:id/discharge
 * @desc    Discharge client from care
 * @access  Private (Therapist)
 */
const dischargeClient = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const client = await clientService.dischargeClient(req.user._id, req.params.id, notes);
  res.status(200).json(new ApiResponse(200, client, 'Client discharged from care'));
});

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
