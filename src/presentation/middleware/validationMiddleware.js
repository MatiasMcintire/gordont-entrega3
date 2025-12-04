import logger from '../../shared/logger/logger.js';

/**
 * Validation middleware factory
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown properties
      convert: true, // Convert types (e.g., string '123' to number 123)
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation failed', {
        property,
        errors,
        path: req.path,
        method: req.method,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors,
        },
      });
    }

    // Replace request property with validated value (with defaults applied and type conversion)
    req[property] = value;
    next();
  };

/**
 * Validate multiple properties at once
 * @param {Object} schemas - Object with property names as keys and Joi schemas as values
 * @returns {Function} Express middleware function
 */
export const validateMultiple = (schemas) => (req, res, next) => {
  const allErrors = [];

  for (const [property, schema] of Object.entries(schemas)) {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        property,
        field: detail.path.join('.'),
        message: detail.message,
      }));
      allErrors.push(...errors);
    } else {
      req[property] = value;
    }
  }

  if (allErrors.length > 0) {
    logger.warn('Multiple validation failed', {
      errors: allErrors,
      path: req.path,
      method: req.method,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: allErrors,
      },
    });
  }

  next();
};
