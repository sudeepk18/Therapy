/**
 * @file validate.middleware.js
 * @description Helper middleware for executing validation schemas / rules.
 */

const ApiError = require('../utils/ApiError');

/**
 * Validates request body, query, or params against a custom validation function or schema
 * @param {Function} validatorFn - Function receiving (req.body) and returning { error, value }
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    const { error, value } = validatorFn(req);

    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message || 'Validation failed';
      const details = error.details || [];
      throw new ApiError(400, errorMessage, details);
    }

    if (value) {
      req.validatedData = value;
    }

    next();
  };
};

module.exports = validate;
