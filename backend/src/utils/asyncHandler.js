/**
 * @file asyncHandler.js
 * @description Wrapper utility for async Express route handlers.
 * Eliminates the need for try-catch blocks in every controller function.
 *
 * @param {Function} requestHandler - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

module.exports = asyncHandler;
