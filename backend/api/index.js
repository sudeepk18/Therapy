/**
 * @file api/index.js
 * @description Vercel Serverless Function entry point for Unfazed Backend.
 * Exports the Express application directly so Vercel's Node runtime handles routing.
 */

const app = require('../server');

module.exports = app;
