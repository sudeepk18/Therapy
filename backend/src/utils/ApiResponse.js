/**
 * @file ApiResponse.js
 * @description Standardized API response wrapper for consistent JSON payloads.
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP Status code (200, 201, etc.)
   * @param {any} data - Response payload data
   * @param {string} message - Success description message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
