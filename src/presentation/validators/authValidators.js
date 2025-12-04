import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),

  weight: Joi.number()
    .min(1)
    .max(500)
    .required()
    .messages({
      'number.min': 'Weight must be at least 1 kg',
      'number.max': 'Weight cannot exceed 500 kg',
      'any.required': 'Weight is required'
    }),

  height: Joi.number()
    .min(50)
    .max(300)
    .required()
    .messages({
      'number.min': 'Height must be at least 50 cm',
      'number.max': 'Height cannot exceed 300 cm',
      'any.required': 'Height is required'
    }),

  age: Joi.number()
    .integer()
    .min(13)
    .max(120)
    .required()
    .messages({
      'number.min': 'Must be at least 13 years old',
      'number.max': 'Age cannot exceed 120 years',
      'any.required': 'Age is required'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});
