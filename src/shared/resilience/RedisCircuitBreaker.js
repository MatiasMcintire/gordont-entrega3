import CircuitBreaker from './CircuitBreaker.js';
import logger from '../logger/logger.js';

/**
 * Redis Circuit Breaker Wrapper
 *
 * Wraps Redis operations with circuit breaker protection
 * Prevents cascading failures when Redis is down
 * Optimized for cache operations (faster timeout, shorter recovery)
 */
export class RedisCircuitBreaker {
  constructor(options = {}) {
    this.breaker = new CircuitBreaker({
      name: 'Redis',
      failureThreshold: options.failureThreshold || 3,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 2000, // 2s - Redis should be fast
      recoveryTimeout: options.recoveryTimeout || 15000 // 15s - faster recovery for cache
    });
  }

  /**
   * Execute Redis operation with circuit breaker protection
   * @param {Function} cacheFn - Async Redis operation function
   * @param {Object} fallback - Optional fallback value if circuit is open
   * @returns {Promise<any>} - Operation result or fallback
   */
  async execute(cacheFn, fallback = null) {
    try {
      return await this.breaker.execute(cacheFn);
    } catch (error) {
      // If circuit is OPEN, return fallback (cache miss)
      if (error.circuitOpen && fallback !== null) {
        logger.warn('Redis circuit is OPEN, using fallback', {
          fallback: typeof fallback
        });
        return fallback;
      }

      // For cache operations, failures should not break the app
      // Return fallback even on regular errors
      if (fallback !== null) {
        logger.warn('Redis operation failed, using fallback', {
          error: error.message
        });
        return fallback;
      }

      throw error;
    }
  }

  /**
   * Check Redis health
   */
  async healthCheck(redisClient) {
    try {
      await this.execute(async () => {
        if (!redisClient.isOpen) {
          throw new Error('Redis not connected');
        }

        // Ping Redis
        await redisClient.ping();
      });

      return { healthy: true, state: this.breaker.getState() };
    } catch (error) {
      return {
        healthy: false,
        state: this.breaker.getState(),
        error: error.message
      };
    }
  }

  /**
   * Get circuit breaker state
   */
  getState() {
    return this.breaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.breaker.reset();
  }
}

export default RedisCircuitBreaker;
