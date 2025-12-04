import CircuitBreaker from './CircuitBreaker.js';
import logger from '../logger/logger.js';

/**
 * MongoDB Circuit Breaker Wrapper
 *
 * Wraps MongoDB connection with circuit breaker protection
 * Prevents cascading failures when MongoDB is down
 */
export class MongoDBCircuitBreaker {
  constructor(options = {}) {
    this.breaker = new CircuitBreaker({
      name: 'MongoDB',
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 5000,
      recoveryTimeout: options.recoveryTimeout || 30000
    });
  }

  /**
   * Execute MongoDB query with circuit breaker protection
   * @param {Function} queryFn - Async MongoDB query function
   * @param {Object} fallback - Optional fallback value if circuit is open
   * @returns {Promise<any>} - Query result or fallback
   */
  async execute(queryFn, fallback = null) {
    try {
      return await this.breaker.execute(queryFn);
    } catch (error) {
      // If circuit is OPEN, return fallback
      if (error.circuitOpen && fallback !== null) {
        logger.warn('MongoDB circuit is OPEN, using fallback', {
          fallback: typeof fallback
        });
        return fallback;
      }

      throw error;
    }
  }

  /**
   * Check MongoDB health
   */
  async healthCheck(mongoose) {
    try {
      await this.execute(async () => {
        if (!mongoose.connection.readyState) {
          throw new Error('MongoDB not connected');
        }

        // Ping database
        await mongoose.connection.db.admin().ping();
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

export default MongoDBCircuitBreaker;
