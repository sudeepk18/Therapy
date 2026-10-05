/**
 * @file package.service.js
 * @description Service for managing session bundle Package templates created by therapists.
 */

const ApiError = require('../utils/ApiError');
const { Package, ClientPackage } = require('../models');

/**
 * Create a new Package template
 */
const createPackage = async (therapistId, packageData) => {
  const pkg = await Package.create({
    ...packageData,
    therapistId,
  });
  return pkg;
};

/**
 * Get all packages for a therapist (with optional active/public filter)
 */
const getPackages = async (therapistId, query = {}) => {
  const { isActive, isPublic } = query;
  const filter = { therapistId };
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (typeof isPublic === 'boolean') filter.isPublic = isPublic;
  if (isActive === 'true') filter.isActive = true;
  if (isPublic === 'true') filter.isPublic = true;

  const packages = await Package.find(filter)
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();
  return packages;
};

/**
 * Get public packages for a therapist's booking page (no auth required)
 */
const getPublicPackages = async (therapistId) => {
  const packages = await Package.find({ therapistId, isActive: true, isPublic: true })
    .sort({ displayOrder: 1 })
    .select('-purchaseCount')
    .lean();
  return packages;
};

/**
 * Get a single package by ID
 */
const getPackageById = async (packageId, therapistId) => {
  const filter = { _id: packageId };
  if (therapistId) filter.therapistId = therapistId;
  const pkg = await Package.findOne(filter);
  if (!pkg) throw new ApiError(404, 'Package not found.');
  return pkg;
};

/**
 * Update a package template
 */
const updatePackage = async (packageId, therapistId, updateData) => {
  const pkg = await Package.findOne({ _id: packageId, therapistId });
  if (!pkg) throw new ApiError(404, 'Package not found or access denied.');
  Object.assign(pkg, updateData);
  await pkg.save();
  return pkg;
};

/**
 * Soft-delete a package (mark as inactive)
 */
const deactivatePackage = async (packageId, therapistId) => {
  const pkg = await Package.findOne({ _id: packageId, therapistId });
  if (!pkg) throw new ApiError(404, 'Package not found or access denied.');
  pkg.isActive = false;
  pkg.isPublic = false;
  await pkg.save();
  return pkg;
};

/**
 * Manually assign/gift a ClientPackage to a client (no payment required)
 */
const assignPackageToClient = async (therapistId, assignData) => {
  const { packageId, clientId, acquisitionType = 'gifted', notes } = assignData;

  const pkg = await Package.findOne({ _id: packageId, therapistId });
  if (!pkg) throw new ApiError(404, 'Package not found or access denied.');

  const expiresAt = pkg.validityDays
    ? new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000)
    : null;

  const clientPackage = await ClientPackage.create({
    clientId,
    packageId,
    therapistId,
    paymentId: null,
    packageName: pkg.name,
    pricePaid: 0,
    currency: pkg.currency,
    totalSessions: pkg.totalSessions,
    sessionsUsed: 0,
    sessionsRemaining: pkg.totalSessions,
    status: 'active',
    validFrom: new Date(),
    expiresAt,
    acquisitionType,
    notes: notes || '',
  });

  // Increment purchase count on template
  await Package.findByIdAndUpdate(packageId, { $inc: { purchaseCount: 1 } });

  return clientPackage;
};

/**
 * Get all ClientPackages for a client
 */
const getClientPackages = async (clientId, therapistId) => {
  const filter = { clientId, therapistId };
  const packages = await ClientPackage.find(filter)
    .populate('packageId', 'name description totalSessions sessionDurationMinutes sessionMedium')
    .sort({ createdAt: -1 })
    .lean();
  return packages;
};

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
