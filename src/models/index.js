/**
 * @file index.js (models)
 * @description Central barrel export for all Mongoose models.
 *
 * Import from this file throughout the application to keep import paths
 * clean and to ensure models are registered with Mongoose in a consistent order.
 *
 * Usage:
 *   const { Therapist, Client, Session } = require('../models');
 */

const Therapist           = require('./Therapist');
const Client              = require('./Client');
const Session             = require('./Session');
const Availability        = require('./Availability');
const SessionNote         = require('./SessionNote');
const Payment             = require('./Payment');
const Package             = require('./Package');
const ClientPackage       = require('./ClientPackage');
const Lead                = require('./Lead');
const SubscriptionTierConfig = require('./SubscriptionTierConfig');

module.exports = {
  Therapist,
  Client,
  Session,
  Availability,
  SessionNote,
  Payment,
  Package,
  ClientPackage,
  Lead,
  SubscriptionTierConfig,
};
