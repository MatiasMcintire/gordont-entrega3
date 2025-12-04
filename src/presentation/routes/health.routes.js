import { Router } from 'express';
import HealthCheckController from '../controllers/HealthCheckController.js';
import HealthCheckService from '../../services/HealthCheckService.js';
import { getRedisClient } from '../../infrastructure/cache/redisClient.js';

const router = Router();

// Initialize health check service
const healthCheckService = new HealthCheckService();

// Set Redis client after it's initialized
try {
  const redisClient = getRedisClient();
  healthCheckService.setRedisClient(redisClient);
} catch (error) {
  // Redis not initialized yet - will be set later
  // Health checks will work without Redis
}

const healthCheckController = new HealthCheckController(healthCheckService);

/**
 * @route   GET /health
 * @desc    Comprehensive health check with all services
 * @access  Public
 */
router.get('/', healthCheckController.getHealth);

/**
 * @route   GET /health/live
 * @desc    Liveness probe (Kubernetes/Docker)
 * @access  Public
 */
router.get('/live', healthCheckController.getLiveness);

/**
 * @route   GET /health/ready
 * @desc    Readiness probe (Kubernetes/Load Balancers)
 * @access  Public
 */
router.get('/ready', healthCheckController.getReadiness);

/**
 * @route   GET /health/circuit-breakers
 * @desc    Get circuit breaker states
 * @access  Public
 */
router.get('/circuit-breakers', healthCheckController.getCircuitBreakers);

/**
 * @route   POST /health/circuit-breakers/reset
 * @desc    Reset all circuit breakers (admin only)
 * @access  Private (should be protected in production)
 * @todo    Add admin authentication middleware
 */
router.post('/circuit-breakers/reset', healthCheckController.resetCircuitBreakers);

// Export both router and service for use in app.js
export { router as healthRoutes, healthCheckService };
export default router;
