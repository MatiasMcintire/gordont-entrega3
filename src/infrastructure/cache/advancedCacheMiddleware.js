import logger from '../../shared/logger/logger.js';

/**
 * Advanced cache middleware with smart TTL selection
 * Uses CacheService for intelligent caching based on route patterns
 *
 * @param {CacheService} cacheService - Instance of CacheService
 * @param {Object} options - Middleware options
 * @param {number} options.defaultTTL - Default TTL if route not matched (default: 300)
 * @param {boolean} options.skipOnError - Skip caching on error (default: true)
 * @returns {Function} Express middleware
 */
export const advancedCacheMiddleware = (cacheService, options = {}) => {
  const {
    defaultTTL = 300,
    skipOnError = true
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if cacheService is not available (Redis disabled)
    if (!cacheService || !cacheService.redis) {
      return next();
    }

    try {
      const userId = req.user?.id;

      // Determine TTL based on route pattern
      const ttl = determineTTL(req.path, cacheService.TTL, defaultTTL);

      // Build cache key from URL and user
      const cacheKey = buildCacheKey(req, userId);

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug('Cache middleware HIT', { key: cacheKey, path: req.path });
        return res.status(200).json(cachedData);
      }

      // Cache MISS - intercept res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache asynchronously (don't block response)
          cacheService.set(cacheKey, data, ttl)
            .catch(err => {
              if (!skipOnError) {
                logger.error('Cache set error', { error: err.message, key: cacheKey });
              }
            });

          logger.debug('Cache middleware SET', { key: cacheKey, ttl, path: req.path });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message, path: req.path });
      // Continue without cache on error
      next();
    }
  };
};

/**
 * Determine TTL based on route pattern
 * @param {string} path - Request path
 * @param {Object} TTL - TTL config from CacheService
 * @param {number} defaultTTL - Fallback TTL
 * @returns {number} - TTL in seconds
 */
function determineTTL(path, TTL, defaultTTL) {
  // User profile
  if (path.includes('/auth/me')) {
    return TTL.USER_PROFILE;
  }

  // Single entry/workout
  if (path.match(/\/entries\/[a-f0-9]{24}$/i) || path.match(/\/workouts\/[a-f0-9]{24}$/i)) {
    return TTL.ENTRY_SINGLE; // or WORKOUT_SINGLE (same value)
  }

  // Paginated lists
  if (path.includes('/list/paginated') || path.includes('/list/page')) {
    return TTL.PAGINATED_LIST;
  }

  // Stats endpoints
  if (path.includes('/stats/daily')) {
    return TTL.ENTRY_DAILY_STATS;
  }

  if (path.includes('/stats/weekly')) {
    return TTL.WEEKLY_STATS;
  }

  if (path.includes('/stats/monthly')) {
    return TTL.MONTHLY_STATS;
  }

  // Entry/Workout lists
  if (path.includes('/entries') && !path.includes('stats')) {
    return TTL.ENTRY_LIST;
  }

  if (path.includes('/workouts')) {
    return TTL.WORKOUT_LIST;
  }

  // Default
  return defaultTTL;
}

/**
 * Build cache key from request and user
 * @param {Object} req - Express request
 * @param {string} userId - User ID
 * @returns {string} - Cache key
 */
function buildCacheKey(req, userId) {
  // Include user ID in key for user-specific data
  const userPrefix = userId ? `user:${userId}:` : 'public:';

  // Include path and query params
  const path = req.path;
  const query = req.query;

  // Sort query params for consistent keys
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');

  const queryString = sortedQuery ? `?${sortedQuery}` : '';

  return `cache:${userPrefix}${path}${queryString}`;
}

/**
 * Cache middleware factory for specific TTL
 * Shorthand for common use cases
 */
export const cacheFor = (cacheService, seconds) =>
  advancedCacheMiddleware(cacheService, { defaultTTL: seconds });

/**
 * Pre-configured cache middleware for common scenarios
 */
export const createCacheMiddlewares = (cacheService) => ({
  // Short cache for frequently changing data (3 minutes)
  short: cacheFor(cacheService, 180),

  // Medium cache for moderately changing data (10 minutes)
  medium: cacheFor(cacheService, 600),

  // Long cache for rarely changing data (1 hour)
  long: cacheFor(cacheService, 3600),

  // Stats cache (30 minutes)
  stats: cacheFor(cacheService, 1800),

  // Advanced with automatic TTL selection
  smart: advancedCacheMiddleware(cacheService)
});

export default advancedCacheMiddleware;
