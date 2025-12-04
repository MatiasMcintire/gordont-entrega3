/**
 * Health Check Controller
 *
 * Handles health check endpoints for monitoring and load balancers
 */
export class HealthCheckController {
  constructor(healthCheckService) {
    this.healthCheckService = healthCheckService;
  }

  /**
   * GET /health
   * Comprehensive health check with all services
   */
  getHealth = async (req, res) => {
    try {
      const health = await this.healthCheckService.check();

      // Return appropriate HTTP status based on health
      const statusCode = this.getHttpStatus(health.status);

      return res.status(statusCode).json(health);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
      });
    }
  };

  /**
   * GET /health/live
   * Liveness probe - is the app running?
   * Used by Kubernetes/Docker to determine if container should be restarted
   */
  getLiveness = (req, res) =>
    // Simple check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });

  /**
   * GET /health/ready
   * Readiness probe - is the app ready to handle requests?
   * Used by Kubernetes/load balancers to determine if traffic should be sent
   */
  getReadiness = async (req, res) => {
    try {
      const health = await this.healthCheckService.check();

      // Only ready if MongoDB is up (critical dependency)
      const isReady = health.services.mongodb.status === 'up';

      if (isReady) {
        return res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.status(503).json({
          status: 'not_ready',
          reason: 'MongoDB not available',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      return res.status(503).json({
        status: 'not_ready',
        error: error.message,
      });
    }
  };

  /**
   * GET /health/circuit-breakers
   * Get circuit breaker states
   */
  getCircuitBreakers = (req, res) => {
    try {
      const stats = this.healthCheckService.getCircuitBreakerStats();

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        circuit_breakers: stats,
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get circuit breaker stats',
        message: error.message,
      });
    }
  };

  /**
   * POST /health/circuit-breakers/reset
   * Reset all circuit breakers (admin only)
   */
  resetCircuitBreakers = (req, res) => {
    try {
      this.healthCheckService.resetCircuitBreakers();

      return res.status(200).json({
        message: 'Circuit breakers reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to reset circuit breakers',
        message: error.message,
      });
    }
  };

  /**
   * Map health status to HTTP status code
   */
  getHttpStatus(healthStatus) {
    switch (healthStatus) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still operational
      case 'unhealthy':
        return 503; // Service Unavailable
      default:
        return 500;
    }
  }
}

export default HealthCheckController;
