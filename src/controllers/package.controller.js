/**
 * @file package.controller.js
 * @description Controller for Package template and ClientPackage management.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const packageService = require('../services/package.service');

/**
 * @route   POST /api/v1/packages
 * @desc    Create a new session bundle package template
 * @access  Private (Therapist)
 */
const createPackage = asyncHandler(async (req, res) => {
  const { name, totalSessions, price } = req.body;
  if (!name || !totalSessions || price === undefined) {
    throw new ApiError(400, 'name, totalSessions, and price are required');
  }
  const pkg = await packageService.createPackage(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, pkg, 'Package created successfully'));
});

/**
 * @route   GET /api/v1/packages
 * @desc    Get all packages for the authenticated therapist
 * @access  Private (Therapist)
 */
const getPackages = asyncHandler(async (req, res) => {
  const packages = await packageService.getPackages(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, packages, 'Packages fetched'));
});

/**
 * @route   GET /api/v1/packages/public/:therapistId
 * @desc    Get public packages for a therapist's booking page
 * @access  Public
 */
const getPublicPackages = asyncHandler(async (req, res) => {
  const packages = await packageService.getPublicPackages(req.params.therapistId);
  res.status(200).json(new ApiResponse(200, packages, 'Public packages fetched'));
});

/**
 * @route   GET /api/v1/packages/:id
 * @desc    Get a single package
 * @access  Private (Therapist)
 */
const getPackageById = asyncHandler(async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, pkg, 'Package details fetched'));
});

/**
 * @route   PATCH /api/v1/packages/:id
 * @desc    Update a package template
 * @access  Private (Therapist)
 */
const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.user._id, req.body);
  res.status(200).json(new ApiResponse(200, pkg, 'Package updated successfully'));
});

/**
 * @route   DELETE /api/v1/packages/:id
 * @desc    Deactivate (soft delete) a package
 * @access  Private (Therapist)
 */
const deactivatePackage = asyncHandler(async (req, res) => {
  const pkg = await packageService.deactivatePackage(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, pkg, 'Package deactivated'));
});

/**
 * @route   POST /api/v1/packages/:id/assign
 * @desc    Gift / manually assign a package to a client (no payment)
 * @access  Private (Therapist)
 */
const assignPackageToClient = asyncHandler(async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) throw new ApiError(400, 'clientId is required');

  const clientPackage = await packageService.assignPackageToClient(req.user._id, {
    packageId: req.params.id,
    ...req.body,
  });
  res.status(201).json(new ApiResponse(201, clientPackage, 'Package assigned to client'));
});

/**
 * @route   GET /api/v1/packages/client/:clientId
 * @desc    Get all packages assigned/purchased by a client
 * @access  Private (Therapist)
 */
const getClientPackages = asyncHandler(async (req, res) => {
  const packages = await packageService.getClientPackages(req.params.clientId, req.user._id);
  res.status(200).json(new ApiResponse(200, packages, 'Client packages fetched'));
});

module.exports = {
  createPackage,
  getPackages,
  getPublicPackages,
  getPackageById,
  updatePackage,
  deactivatePackage,
  assignPackageToClient,
  getClientPackages,
};
