import logger from '../../shared/logger/logger.js';
import { AppError } from '../../shared/errors/AppError.js';

/**
 * Middleware de manejo de errores centralizado
 * DEBE SER EL ÚLTIMO MIDDLEWARE registrado
 */
export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  // Si es AppError, usar status y codigo
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Errores de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: Object.entries(err.errors).map(([field, error]) => ({
          field,
          message: error.message
        }))
      }
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        message: 'Invalid ID format',
        code: 'INVALID_ID',
        statusCode: 400
      }
    });
  }

  // Error genérico
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Wrapper para async route handlers
 * Atrapa errores async automáticamente
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};