import logger from '../logger/logger.js';

/**
 * Circuit Breaker States
 */
export const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject requests immediately
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by stopping requests to failing services
 *
 * States:
 * - CLOSED: Normal operation, all requests go through
 * - OPEN: Service is failing, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 *
 * @example
 * const breaker = new CircuitBreaker({
 *   name: 'MongoDB',
 *   failureThreshold: 5,
 *   recoveryTimeout: 60000
 * });
 *
 * try {
 *   await breaker.execute(async () => {
 *     return await mongodb.find({});
 *   });
 * } catch (error) {
 *   // Circuit is OPEN or request failed
 * }
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000; // 10 seconds
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute

    // State
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();

    // Stats
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      lastFailure: null,
      lastSuccess: null
    };

    logger.info(`Circuit Breaker initialized: ${this.name}`, {
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    });
  }

  /**
   * Execute a function through the circuit breaker
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} - Result from function
   * @throws {Error} - If circuit is OPEN or function fails
   */
  async execute(fn) {
    this.stats.totalCalls++;

    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      // Check if recovery timeout has passed
      if (Date.now() < this.nextAttempt) {
        this.stats.rejectedCalls++;
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.circuitOpen = true;
        throw error;
      }

      // Try to recover - move to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      this.successes = 0;
      logger.info(`Circuit breaker ${this.name}: OPEN → HALF_OPEN (testing recovery)`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);

      // Success - handle based on state
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure - handle based on state
      this.onFailure(error);

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${this.timeout}ms`)),
          this.timeout
        )
      )
    ]);
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.stats.successfulCalls++;
    this.stats.lastSuccess = new Date();
    this.failures = 0; // Reset failure count

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      // If enough successes in HALF_OPEN, close circuit
      if (this.successes >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info(`Circuit breaker ${this.name}: HALF_OPEN → CLOSED (service recovered)`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.stats.failedCalls++;
    this.stats.lastFailure = new Date();
    this.failures++;
    this.successes = 0; // Reset success count

    logger.warn(`Circuit breaker ${this.name}: Request failed`, {
      error: error.message,
      failures: this.failures,
      threshold: this.failureThreshold,
      state: this.state
    });

    // If in HALF_OPEN, immediately open circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
      return;
    }

    // If failures exceed threshold, open circuit
    if (this.failures >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit (stop all requests)
   */
  openCircuit() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.recoveryTimeout;

    logger.error(`Circuit breaker ${this.name}: CLOSED/HALF_OPEN → OPEN (too many failures)`, {
      failures: this.failures,
      nextAttempt: new Date(this.nextAttempt).toISOString()
    });
  }

  /**
   * Manually reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;

    logger.info(`Circuit breaker ${this.name}: Manually reset to CLOSED`);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.state === CircuitState.OPEN
        ? new Date(this.nextAttempt).toISOString()
        : null,
      stats: this.stats
    };
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy() {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is open
   */
  isOpen() {
    return this.state === CircuitState.OPEN;
  }
}

export default CircuitBreaker;
