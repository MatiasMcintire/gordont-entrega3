import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "GORDON'T",
      version: '1.0.0',
      description:
        'API profesional para gestión nutricional y deportiva personalizada.EN DESARROLLO',
      contact: {
        name: 'Matías & Alfredo',
        url: 'https://github.com/MatiasMcIntire/DDWGordont',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://gordont-api.onrender.com',
        description: 'Production server (Render)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        FoodItem: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            quantity: { type: 'number', default: 100 },
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fat'],
        },
        Entry: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            date: { type: 'string', format: 'date' },
            mealType: {
              type: 'string',
              enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            },
            foods: {
              type: 'array',
              items: { $ref: '#/components/schemas/FoodItem' },
            },
            notes: { type: 'string' },
            totalCalories: { type: 'number' },
            totalProtein: { type: 'number' },
            totalCarbs: { type: 'number' },
            totalFat: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Stats: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            totalEntries: { type: 'number' },
            totalCalories: { type: 'number' },
            totalProtein: { type: 'number' },
            totalCarbs: { type: 'number' },
            totalFat: { type: 'number' },
            mealBreakdown: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                  calories: { type: 'number' },
                },
              },
            },
          },
        },
        Exercise: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Sentadillas',
            },
            sets: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 4,
            },
            reps: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              example: 12,
            },
            weight: {
              type: 'number',
              minimum: 0,
              maximum: 1000,
              example: 80,
              description: 'Peso en kg (opcional)',
            },
            duration: {
              type: 'integer',
              minimum: 0,
              maximum: 86400,
              example: 0,
              description: 'Duración en segundos (opcional)',
            },
            notes: {
              type: 'string',
              maxLength: 200,
              example: 'Buen rango de movimiento',
            },
          },
          required: ['name', 'sets', 'reps'],
        },
        Workout: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            date: { type: 'string', format: 'date' },
            type: {
              type: 'string',
              enum: ['strength', 'cardio', 'flexibility', 'sports', 'other'],
              example: 'strength',
            },
            exercises: {
              type: 'array',
              items: { $ref: '#/components/schemas/Exercise' },
            },
            duration: {
              type: 'integer',
              minimum: 1,
              maximum: 86400,
              example: 3600,
              description: 'Duración total en segundos',
            },
            caloriesBurned: {
              type: 'number',
              minimum: 0,
              maximum: 10000,
              example: 450,
            },
            notes: {
              type: 'string',
              maxLength: 500,
              example: 'Excelente sesión de piernas',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                code: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [
    'src/presentation/routes/auth.routes.js',
    'src/presentation/routes/entry.routes.js',
    'src/presentation/routes/workout.routes.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
