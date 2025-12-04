import { getRedisClient } from './redisClient.js';
import logger from '../../shared/logger/logger.js';

/**
 * Middleware para cachear GET requests
 * @param {number} ttl - Time to live en segundos
 */
export const cacheMiddleware =
  (ttl = 300) =>
  async (req, res, next) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const redis = getRedisClient();
      const cacheKey = `cache:${req.originalUrl || req.url}`;

      // Intentar obtener del caché
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        logger.info('Cache hit', { key: cacheKey });
        return res.json(JSON.parse(cachedData));
      }

      // Interceptar res.json para cachear la respuesta
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Solo cachear respuestas exitosas
        if (res.statusCode === 200) {
          redis
            .setEx(cacheKey, ttl, JSON.stringify(data))
            .catch((err) => logger.error('Cache set error', { error: err.message }));
          logger.info('Cache set', { key: cacheKey, ttl });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      // Continuar sin caché si hay error
      next();
    }
  };

/**
 * Invalidar caché por patrón
 */
export const invalidateCache = async (pattern = '*') => {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
    }
  } catch (error) {
    logger.error('Cache invalidation error', { error: error.message });
  }
};
