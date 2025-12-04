import logger from '../../shared/logger/logger.js';

/**
 * Advanced Cache Service with TTL strategies, warming, and intelligent invalidation
 */
export default class CacheService {
  constructor(redisClient) {
    this.redis = redisClient;

    // TTL Strategies (in seconds)
    this.TTL = {
      // User data - changes infrequently
      USER_PROFILE: 3600, // 1 hour
      USER_STATS: 1800, // 30 minutes

      // Entries - updates frequently
      ENTRY_SINGLE: 600, // 10 minutes
      ENTRY_LIST: 300, // 5 minutes
      ENTRY_DAILY_STATS: 1800, // 30 minutes

      // Workouts - similar to entries
      WORKOUT_SINGLE: 600, // 10 minutes
      WORKOUT_LIST: 300, // 5 minutes

      // Paginated lists - short TTL due to frequent changes
      PAGINATED_LIST: 180, // 3 minutes

      // Aggregations - can be cached longer
      MONTHLY_STATS: 7200, // 2 hours
      WEEKLY_STATS: 3600, // 1 hour

      // Auth tokens - very short
      AUTH_TOKEN: 900, // 15 minutes
    };

    // Cache key prefixes
    this.PREFIX = {
      USER: 'user',
      ENTRY: 'entry',
      WORKOUT: 'workout',
      LIST: 'list',
      STATS: 'stats',
      PAGINATED: 'paginated',
    };
  }

  /**
   * Build a structured cache key
   * @param {string} prefix - Key prefix (user, entry, workout, etc.)
   * @param {string|Array} parts - Key parts (userId, entryId, etc.)
   * @returns {string} - Structured cache key
   */
  buildKey(prefix, ...parts) {
    const cleanParts = parts.filter((p) => p !== null && p !== undefined);
    return `${prefix}:${cleanParts.join(':')}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);

      if (value) {
        logger.debug('Cache HIT', { key });
        return JSON.parse(value);
      }

      logger.debug('Cache MISS', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null; // Fail gracefully
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redis.setEx(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      logger.debug('Cache SET', { key, ttl });
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Write-through cache: Set value and return it
   * Use when updating data to keep cache in sync
   */
  async setAndGet(key, value, ttl = 3600) {
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Get or compute: Try cache first, compute if miss, then cache the result
   * @param {string} key - Cache key
   * @param {Function} computeFn - Async function to compute value on cache miss
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} - Cached or computed value
   */
  async getOrCompute(key, computeFn, ttl = 3600) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - compute value
    logger.debug('Cache COMPUTE', { key });
    const computed = await computeFn();

    // Cache the result
    if (computed !== null && computed !== undefined) {
      await this.set(key, computed, ttl);
    }

    return computed;
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Key pattern to match (e.g., "entry:userId123:*")
   * @returns {Promise<number>} - Number of keys deleted
   */
  async invalidate(pattern) {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
        logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
        return keys.length;
      }

      logger.debug('Cache invalidate - no keys matched', { pattern });
      return 0;
    } catch (error) {
      logger.error('Cache invalidation error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Invalidate all caches for a specific user
   * @param {string} userId
   * @returns {Promise<number>} - Number of keys deleted
   */
  async invalidateUser(userId) {
    const patterns = [
      this.buildKey(this.PREFIX.USER, userId, '*'),
      this.buildKey(this.PREFIX.ENTRY, userId, '*'),
      this.buildKey(this.PREFIX.WORKOUT, userId, '*'),
      this.buildKey(this.PREFIX.LIST, userId, '*'),
      this.buildKey(this.PREFIX.STATS, userId, '*'),
      this.buildKey(this.PREFIX.PAGINATED, userId, '*'),
    ];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      totalDeleted += await this.invalidate(pattern);
    }

    logger.info('User cache invalidated', { userId, keysDeleted: totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate entry-related caches
   * Called when an entry is created/updated/deleted
   */
  async invalidateEntryCache(userId, entryId = null) {
    const patterns = [
      this.buildKey(this.PREFIX.ENTRY, userId, 'list', '*'),
      this.buildKey(this.PREFIX.PAGINATED, userId, 'entries', '*'),
      this.buildKey(this.PREFIX.STATS, userId, 'daily', '*'),
      this.buildKey(this.PREFIX.STATS, userId, 'weekly', '*'),
      this.buildKey(this.PREFIX.STATS, userId, 'monthly', '*'),
    ];

    // If specific entry, also invalidate it
    if (entryId) {
      patterns.push(this.buildKey(this.PREFIX.ENTRY, userId, entryId));
    }

    let totalDeleted = 0;

    for (const pattern of patterns) {
      totalDeleted += await this.invalidate(pattern);
    }

    logger.info('Entry cache invalidated', { userId, entryId, keysDeleted: totalDeleted });
    return totalDeleted;
  }

  /**
   * Invalidate workout-related caches
   * Called when a workout is created/updated/deleted
   */
  async invalidateWorkoutCache(userId, workoutId = null) {
    const patterns = [
      this.buildKey(this.PREFIX.WORKOUT, userId, 'list', '*'),
      this.buildKey(this.PREFIX.PAGINATED, userId, 'workouts', '*'),
      this.buildKey(this.PREFIX.STATS, userId, 'weekly', '*'),
      this.buildKey(this.PREFIX.STATS, userId, 'monthly', '*'),
    ];

    // If specific workout, also invalidate it
    if (workoutId) {
      patterns.push(this.buildKey(this.PREFIX.WORKOUT, userId, workoutId));
    }

    let totalDeleted = 0;

    for (const pattern of patterns) {
      totalDeleted += await this.invalidate(pattern);
    }

    logger.info('Workout cache invalidated', { userId, workoutId, keysDeleted: totalDeleted });
    return totalDeleted;
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clear() {
    try {
      await this.redis.flushDb();
      logger.warn('All cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * Call this on application startup
   * @param {Array} userIds - Array of user IDs to warm up
   */
  async warmUp(dataFetchers) {
    logger.info('Starting cache warm-up');

    try {
      const warmUpTasks = [];

      for (const { key, fetcher, ttl } of dataFetchers) {
        warmUpTasks.push(
          this.getOrCompute(key, fetcher, ttl).catch((err) => {
            logger.error('Cache warm-up task failed', { key, error: err.message });
          })
        );
      }

      await Promise.all(warmUpTasks);

      logger.info('Cache warm-up completed', { tasksCount: warmUpTasks.length });
    } catch (error) {
      logger.error('Cache warm-up error', { error: error.message });
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache stats
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbSize();

      return {
        totalKeys: dbSize,
        info,
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error.message });
      return null;
    }
  }
}
