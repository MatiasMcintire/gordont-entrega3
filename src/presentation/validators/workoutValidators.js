import Joi from 'joi';

const exerciseSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Exercise name cannot be empty',
      'string.max': 'Exercise name cannot exceed 100 characters',
      'any.required': 'Exercise name is required'
    }),

  sets: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Sets must be at least 1',
      'number.max': 'Sets cannot exceed 100',
      'any.required': 'Sets is required'
    }),

  reps: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Reps must be at least 1',
      'number.max': 'Reps cannot exceed 1000',
      'any.required': 'Reps is required'
    }),

  weight: Joi.number()
    .min(0)
    .max(1000)
    .allow(0)
    .messages({
      'number.min': 'Weight cannot be negative',
      'number.max': 'Weight cannot exceed 1000 kg'
    }),

  duration: Joi.number()
    .integer()
    .min(0)
    .max(86400)
    .allow(0)
    .messages({
      'number.min': 'Duration cannot be negative',
      'number.max': 'Duration cannot exceed 24 hours (86400 seconds)'
    }),

  notes: Joi.string()
    .max(200)
    .allow('')
    .trim()
    .default('')
    .messages({
      'string.max': 'Exercise notes cannot exceed 200 characters'
    })
});

export const createWorkoutSchema = Joi.object({
  date: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Workout date cannot be in the future',
      'any.required': 'Date is required'
    }),

  type: Joi.string()
    .valid('strength', 'cardio', 'flexibility', 'sports', 'other')
    .required()
    .messages({
      'any.only': 'Workout type must be one of: strength, cardio, flexibility, sports, other',
      'any.required': 'Workout type is required'
    }),

  exercises: Joi.array()
    .items(exerciseSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one exercise is required',
      'any.required': 'Exercises array is required'
    }),

  duration: Joi.number()
    .integer()
    .min(1)
    .max(86400)
    .required()
    .messages({
      'number.min': 'Duration must be at least 1 second',
      'number.max': 'Duration cannot exceed 24 hours',
      'any.required': 'Duration is required'
    }),

  caloriesBurned: Joi.number()
    .min(0)
    .max(10000)
    .allow(0)
    .messages({
      'number.min': 'Calories burned cannot be negative',
      'number.max': 'Calories burned seems unrealistic (max 10000)'
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

export const updateWorkoutSchema = Joi.object({
  type: Joi.string()
    .valid('strength', 'cardio', 'flexibility', 'sports', 'other')
    .messages({
      'any.only': 'Workout type must be one of: strength, cardio, flexibility, sports, other'
    }),

  exercises: Joi.array()
    .items(exerciseSchema)
    .min(1)
    .messages({
      'array.min': 'At least one exercise is required'
    }),

  duration: Joi.number()
    .integer()
    .min(1)
    .max(86400)
    .messages({
      'number.min': 'Duration must be at least 1 second',
      'number.max': 'Duration cannot exceed 24 hours'
    }),

  caloriesBurned: Joi.number()
    .min(0)
    .max(10000)
    .allow(0)
    .messages({
      'number.min': 'Calories burned cannot be negative',
      'number.max': 'Calories burned seems unrealistic (max 10000)'
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

export const getWorkoutByIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid workout ID format',
      'any.required': 'Workout ID is required'
    })
});

export const getWorkoutsByDateSchema = Joi.object({
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
