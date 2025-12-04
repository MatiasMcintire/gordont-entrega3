import Joi from 'joi';

export const objectIdSchema = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

/**
 * Offset-based pagination (simple pero menos eficiente para páginas altas)
 * Use para: Admin panels, casos donde el usuario necesita saltar a páginas específicas
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'date', 'name')
    .default('createdAt'),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

/**
 * Cursor-based pagination (más eficiente y escalable)
 * Use para: Infinite scroll, feeds, listados grandes
 *
 * Ejemplo de uso:
 * GET /api/v1/entries?limit=20
 * GET /api/v1/entries?limit=20&cursor=2024-01-15T10:30:00.000Z
 */
export const cursorPaginationSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  cursor: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'Cursor must be a valid ISO date'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required'
    }),

  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required'
    })
});
