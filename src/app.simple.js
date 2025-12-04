import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import Redis from 'redis';
import { swaggerSpec } from './swagger/swagger.js';
import { createAuthRoutes } from './presentation/routes/auth.routes.js';
import { createEntryRoutes } from './presentation/routes/entry.routes.js';
import { createWorkoutRoutes } from './presentation/routes/workout.routes.js';
import { createAdminRoutes } from './presentation/routes/admin.routes.js';
import { healthRoutes } from './presentation/routes/health.routes.js';
import { User } from './infrastructure/persistence/schemas/userSchema.js';
import { Entry } from './infrastructure/persistence/schemas/entrySchema.js';
import { Workout } from './infrastructure/persistence/schemas/workoutSchema.js';
import { MongoUserRepository } from './infrastructure/repositories/MongoUserRepository.js';
import { MongoEntryRepository } from './infrastructure/repositories/MongoEntryRepository.js';
import { MongoWorkoutRepository } from './infrastructure/repositories/MongoWorkoutRepository.js';
import CacheService from './infrastructure/cache/CacheService.js';

/**
 * Mock cache service for when Redis is disabled or unavailable
 * Provides the same interface but no actual caching
 */
function createMockCacheService() {
  return {
    get: async () => null,
    set: async () => true,
    invalidate: async () => true,
    invalidateUser: async () => 0,
    invalidateEntryCache: async () => 0,
    invalidateWorkoutCache: async () => 0,
    delete: async () => true,
    clear: async () => true,
    getOrCompute: async (key, computeFn) => await computeFn(),
  };
}

/**
 * Create and configure Express application
 * Initializes middleware, routes, and services
 */
async function createApp() {
  console.log('Starting application initialization...');

  // Initialize Redis cache
  console.log('Initializing Redis cache...');
  let redisClient = null;
  let cacheService = null;

  const redisEnabled = process.env.REDIS_ENABLED === 'true';

  if (redisEnabled) {
    try {
      redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (attempts) => {
            if (attempts > 10) {
              console.error('Redis connection failed after 10 attempts');
              return false;
            }
            return Math.min(attempts * 100, 3000);
          },
        },
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
      });

      await redisClient.connect();
      cacheService = new CacheService(redisClient);
      console.log('Redis cache enabled');
    } catch (redisErr) {
      console.error('WARNING: Failed to connect to Redis');
      console.error('Error:', redisErr.message);
      console.error('Continuing without cache...');
      redisClient = null;
      cacheService = createMockCacheService();
    }
  } else {
    console.log('Redis cache disabled');
    cacheService = createMockCacheService();
  }

  // Initialize repositories
  console.log('Initializing repositories...');
  const userRepository = new MongoUserRepository(User);
  const entryRepository = new MongoEntryRepository(Entry);
  const workoutRepository = new MongoWorkoutRepository(Workout);

  // Create Express application
  const app = express();

  // Security middleware
  console.log('Configuring security middleware...');

  // Helmet - secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:', 'validator.swagger.io'],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  // CORS - Cross-Origin Resource Sharing
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  };
  app.use(cors(corsOptions));

  // Compression - gzip responses
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Sanitize data against NoSQL injection
  app.use(mongoSanitize());

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login/register requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting
  app.use('/api/', generalLimiter);
  app.use('/api/v1/auth/', authLimiter);

  // Routes
  console.log('Configuring routes...');

  // Health check route
  app.use('/health', healthRoutes);

  // API Documentation (Swagger)
  if (process.env.SWAGGER_ENABLED !== 'false') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Swagger documentation enabled at /api-docs');
  }

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', createAuthRoutes(userRepository, cacheService));
  apiRouter.use('/entries', createEntryRoutes(entryRepository, cacheService));
  apiRouter.use('/workouts', createWorkoutRoutes(workoutRepository, cacheService));
  apiRouter.use('/admin', createAdminRoutes(userRepository, cacheService));

  app.use('/api/v1', apiRouter);

  // Landing page
  app.get('/', (req, res) => {
    res.json({
      message: 'Gordont API - Nutrition and Fitness Tracker',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        documentation: '/api-docs',
        api: '/api/v1',
      },
      routes: {
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          me: 'GET /api/v1/auth/me',
        },
        entries: {
          list: 'GET /api/v1/entries',
          create: 'POST /api/v1/entries',
          stats: 'GET /api/v1/entries/stats/daily',
        },
        workouts: {
          list: 'GET /api/v1/workouts',
          create: 'POST /api/v1/workouts',
        },
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        path: req.path,
      },
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  });

  // Store Redis client in app locals for graceful shutdown
  app.locals.redisClient = redisClient;

  console.log('Application initialization completed');

  return app;
}

export default createApp;
