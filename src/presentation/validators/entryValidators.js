import Joi from 'joi';

const foodItemSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Food name cannot be empty',
      'string.max': 'Food name cannot exceed 100 characters',
      'any.required': 'Food name is required'
    }),

  calories: Joi.number()
    .min(0)
    .max(10000)
    .required()
    .messages({
      'number.min': 'Calories cannot be negative',
      'number.max': 'Calories seems unrealistic (max 10000)',
      'any.required': 'Calories is required'
    }),

  protein: Joi.number()
    .min(0)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Protein cannot be negative',
      'number.max': 'Protein seems unrealistic (max 1000g)',
      'any.required': 'Protein is required'
    }),

  carbs: Joi.number()
    .min(0)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Carbs cannot be negative',
      'number.max': 'Carbs seems unrealistic (max 1000g)',
      'any.required': 'Carbs is required'
    }),

  fat: Joi.number()
    .min(0)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Fat cannot be negative',
      'number.max': 'Fat seems unrealistic (max 1000g)',
      'any.required': 'Fat is required'
    }),

  quantity: Joi.number()
    .min(0.1)
    .max(10000)
    .default(100)
    .messages({
      'number.min': 'Quantity must be greater than 0',
      'number.max': 'Quantity seems unrealistic (max 10000g)'
    })
});

export const createEntrySchema = Joi.object({
  date: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Entry date cannot be in the future',
      'any.required': 'Date is required'
    }),

  mealType: Joi.string()
    .valid('breakfast', 'lunch', 'dinner', 'snack')
    .required()
    .messages({
      'any.only': 'Meal type must be one of: breakfast, lunch, dinner, snack',
      'any.required': 'Meal type is required'
    }),

  foods: Joi.array()
    .items(foodItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one food item is required',
      'any.required': 'Foods array is required'
    }),

  notes: Joi.string()
    .max(500)
    .allow('')
    .trim()
    .default('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

export const updateEntrySchema = Joi.object({
  mealType: Joi.string()
    .valid('breakfast', 'lunch', 'dinner', 'snack')
    .messages({
      'any.only': 'Meal type must be one of: breakfast, lunch, dinner, snack'
    }),

  foods: Joi.array()
    .items(foodItemSchema)
    .min(1)
    .messages({
      'array.min': 'At least one food item is required'
    }),

  notes: Joi.string()
    .max(500)
    .allow('')
    .trim()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const getEntryByIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid entry ID format',
      'any.required': 'Entry ID is required'
    })
});

export const getEntriesByDateSchema = Joi.object({
  date: Joi.date()
    .required()
    .messages({
      'any.required': 'Date is required'
    }),

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
    })
});
