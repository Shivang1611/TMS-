const ApiError = require('../utils/ApiError');

/**
 * Validates request body, query, or params against a Joi schema
 * @param {Object} schema - Joi schema
 * @param {string} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    // Replace with sanitized/coerced values
    req[source] = value;
    next();
  };
};

module.exports = validate;
