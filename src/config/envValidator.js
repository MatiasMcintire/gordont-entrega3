import Joi from 'joi';

/**
 * Schema de validación completo para variables de entorno
 */
const envSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),

  // Server
  PORT: Joi.number().port().default(3000),

  HOST: Joi.string().hostname().default('localhost'),

  // Database
  MONGODB_URI: Joi.string().uri().required().messages({
    'string.uri': 'MONGODB_URI must be a valid MongoDB connection string',
    'any.required': 'MONGODB_URI is required',
  }),

  // Redis
  REDIS_URL: Joi.string().uri().allow('').messages({
    'string.uri': 'REDIS_URL must be a valid Redis connection string',
  }),

  REDIS_ENABLED: Joi.string().valid('true', 'false').default('false'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_SECRET is required',
  }),

  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[hdms]$/)
    .default('24h')
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must be in format: 1h, 24h, 7d, etc.',
    }),

  REFRESH_TOKEN_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'REFRESH_TOKEN_SECRET must be at least 32 characters',
    'any.required': 'REFRESH_TOKEN_SECRET is required',
  }),

  REFRESH_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[hdms]$/)
    .default('7d'),

  // CORS
  CORS_ORIGIN: Joi.string().required().messages({
    'any.required': 'CORS_ORIGIN is required',
  }),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),

  // Swagger
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),

  // Optional: External services
  SENTRY_DSN: Joi.string().uri().allow(''),

  // Optional: Deployment
  RENDER_STAGING_DEPLOY_HOOK: Joi.string().uri().allow(''),
  RENDER_PRODUCTION_DEPLOY_HOOK: Joi.string().uri().allow(''),
  RAILWAY_TOKEN: Joi.string().allow(''),
  HEROKU_API_KEY: Joi.string().allow(''),
  HEROKU_STAGING_APP_NAME: Joi.string().allow(''),
  HEROKU_PRODUCTION_APP_NAME: Joi.string().allow(''),
  DOCKERHUB_USERNAME: Joi.string().allow(''),
  DOCKERHUB_TOKEN: Joi.string().allow(''),
  CODECOV_TOKEN: Joi.string().allow(''),

  // Optional: Staging environment
  STAGING_PORT: Joi.number().port().allow(''),
  STAGING_MONGODB_URI: Joi.string().uri().allow(''),
  STAGING_REDIS_URL: Joi.string().uri().allow(''),
  STAGING_JWT_SECRET: Joi.string().min(32).allow(''),
  STAGING_REFRESH_TOKEN_SECRET: Joi.string().min(32).allow(''),
  STAGING_CORS_ORIGIN: Joi.string().allow(''),

  // Optional: Production environment
  PRODUCTION_PORT: Joi.number().port().allow(''),
  PRODUCTION_MONGODB_URI: Joi.string().uri().allow(''),
  PRODUCTION_REDIS_URL: Joi.string().uri().allow(''),
  PRODUCTION_JWT_SECRET: Joi.string().min(32).allow(''),
  PRODUCTION_REFRESH_TOKEN_SECRET: Joi.string().min(32).allow(''),
  PRODUCTION_CORS_ORIGIN: Joi.string().allow(''),
}).unknown(true); // Allow other env vars

/**
 * Valida las variables de entorno con Joi
 * @returns {Object} Variables de entorno validadas
 * @throws {Error} Si la validación falla
 */
export function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false, // Return all errors
  });

  if (error) {
    const errors = error.details.map((detail) => `   ${detail.message}`).join('\n');

    console.error('\n╔════════════════════════════════════════════════════════╗');
    console.error('║   Environment Validation Failed                        ║');
    console.error('╚════════════════════════════════════════════════════════╝\n');
    console.error(errors);
    console.error('\n Tips:');
    console.error('  - Check your .env file');
    console.error('  - See .env.example for reference');
    console.error('  - Generate secure secrets with:');
    console.error(
      "    node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    );

    throw new Error('Environment validation failed');
  }

  console.log(' Environment variables validated successfully');

  // Log configuration summary in development
  if (value.NODE_ENV === 'development') {
    console.log('\n Configuration Summary:');
    console.log(`  Environment: ${value.NODE_ENV}`);
    console.log(`  Port: ${value.PORT}`);
    console.log(`  MongoDB: ${value.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    console.log(`  Redis: ${value.REDIS_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`  CORS Origin: ${value.CORS_ORIGIN}`);
    console.log(`  Log Level: ${value.LOG_LEVEL}`);
    console.log(`  Swagger: ${value.SWAGGER_ENABLED === 'true' ? 'Enabled' : 'Disabled'}\n`);
  }

  return value;
}

/**
 * Valida configuración específica de producción
 * @param {Object} env - Variables de entorno validadas
 * @throws {Error} Si faltan configuraciones críticas para producción
 */
export function validateProductionConfig(env) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const productionChecks = [];

  // Verificar que los secrets de producción sean diferentes a los de desarrollo
  if (env.JWT_SECRET && env.JWT_SECRET.includes('change-this')) {
    productionChecks.push('JWT_SECRET appears to use a default development value');
  }

  if (env.REFRESH_TOKEN_SECRET && env.REFRESH_TOKEN_SECRET.includes('change-this')) {
    productionChecks.push('REFRESH_TOKEN_SECRET appears to use a default development value');
  }

  // Verificar CORS no sea wildcard
  if (env.CORS_ORIGIN === '*') {
    productionChecks.push('CORS_ORIGIN should not be * in production');
  }

  // Verificar HTTPS en MongoDB URI (production)
  if (
    env.MONGODB_URI &&
    !env.MONGODB_URI.startsWith('mongodb+srv://') &&
    !env.MONGODB_URI.includes('localhost')
  ) {
    productionChecks.push('MONGODB_URI should use mongodb+srv:// (MongoDB Atlas) in production');
  }

  if (productionChecks.length > 0) {
    console.error('\n  Production Configuration Warnings:');
    productionChecks.forEach((check) => console.error(`  - ${check}`));
    console.error('');
  }
}

export default { validateEnv, validateProductionConfig };
