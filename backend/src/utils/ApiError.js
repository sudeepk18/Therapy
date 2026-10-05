/**
 * @file ApiError.js
 * @description Custom Error class for operational API errors.
 *
 * Provides structured error responses with HTTP status codes, error messages,
 * and optional validation error stacks.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP Status code (e.g. 400, 401, 403, 404, 500)
   * @param {string} message - Error description
   * @param {Array} errors - Optional array of specific field validation errors
   * @param {string} stack - Optional custom stack trace
   */
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
