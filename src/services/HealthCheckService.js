import mongoose from 'mongoose';
import { MongoDBCircuitBreaker } from '../shared/resilience/MongoDBCircuitBreaker.js';
import { RedisCircuitBreaker } from '../shared/resilience/RedisCircuitBreaker.js';
import logger from '../shared/logger/logger.js';

/**
 * Health Check Service
 *
 * Provides comprehensive health checks for all system dependencies
 * Uses circuit breakers to prevent cascading failures
 *
 * Health States:
 * - healthy: All critical services are operational
 * - degraded: Non-critical services are down, but app can function
 * - unhealthy: Critical services are down, app cannot function properly
 */
export class HealthCheckService {
  constructor(redisClient = null) {
    this.mongoBreaker = new MongoDBCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      recoveryTimeout: 30000
    });

    this.redisBreaker = new RedisCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 2000,
      recoveryTimeout: 15000
    });

    this.redisClient = redisClient;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
  }

  /**
   * Set Redis client after initialization
   */
  setRedisClient(redisClient) {
    this.redisClient = redisClient;
  }

  /**
   * Check MongoDB health
   */
  async checkMongoDB() {
    const startTime = Date.now();

    try {
      const health = await this.mongoBreaker.healthCheck(mongoose);

      return {
        status: health.healthy ? 'up' : 'down',
        responseTime: Date.now() - startTime,
        circuit: health.state,
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          database: mongoose.connection.db?.name
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        circuit: this.mongoBreaker.getState(),
        error: error.message
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis() {
    const startTime = Date.now();

    // Redis is optional - not critical for app to function
    if (!this.redisClient) {
      return {
        status: 'disabled',
        responseTime: 0,
        message: 'Redis not configured'
      };
    }

    try {
      const health = await this.redisBreaker.healthCheck(this.redisClient);

      return {
        status: health.healthy ? 'up' : 'down',
        responseTime: Date.now() - startTime,
        circuit: health.state,
        details: {
          connected: this.redisClient.isOpen
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        circuit: this.redisBreaker.getState(),
        error: error.message
      };
    }
  }

  /**
   * Check API health
   */
  checkAPI() {
    return {
      status: 'up',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    };
  }

  /**
   * Run comprehensive health check
   */
  async check() {
    const startTime = Date.now();

    const [mongoHealth, redisHealth] = await Promise.all([
      this.checkMongoDB(),
      this.checkRedis()
    ]);

    const apiHealth = this.checkAPI();

    // Determine overall status
    let overallStatus = 'healthy';

    // MongoDB is critical - if down, system is unhealthy
    if (mongoHealth.status === 'down') {
      overallStatus = 'unhealthy';
    }
    // Redis is non-critical - if down, system is degraded
    else if (redisHealth.status === 'down') {
      overallStatus = 'degraded';
    }

    const result = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      services: {
        api: apiHealth,
        mongodb: mongoHealth,
        redis: redisHealth
      },
      circuit_breakers: {
        mongodb: this.mongoBreaker.getState(),
        redis: this.redisBreaker.getState()
      }
    };

    this.lastHealthCheck = result;

    // Log unhealthy states
    if (overallStatus !== 'healthy') {
      logger.warn('Health check failed', {
        status: overallStatus,
        mongo: mongoHealth.status,
        redis: redisHealth.status
      });
    }

    return result;
  }

  /**
   * Start periodic health checks
   * @param {number} intervalMs - Check interval in milliseconds (default: 30s)
   */
  startPeriodicChecks(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      logger.warn('Periodic health checks already running');
      return;
    }

    logger.info('Starting periodic health checks', {
      interval: `${intervalMs / 1000}s`
    });

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.check();
      } catch (error) {
        logger.error('Periodic health check failed', {
          error: error.message
        });
      }
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped periodic health checks');
    }
  }

  /**
   * Get last health check result (cached)
   */
  getLastHealthCheck() {
    return this.lastHealthCheck;
  }

  /**
   * Reset circuit breakers (use with caution)
   */
  resetCircuitBreakers() {
    this.mongoBreaker.reset();
    this.redisBreaker.reset();
    logger.info('Circuit breakers reset manually');
  }

  /**
   * Get detailed circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return {
      mongodb: this.mongoBreaker.getState(),
      redis: this.redisBreaker.getState()
    };
  }
}

export default HealthCheckService;
