/**
 * Configuración de validación de variables de entorno
 * Asegura que las variables críticas estén configuradas antes de iniciar la aplicación
 */

export class ConfigValidator {
  /**
   * Valida todas las variables de entorno requeridas
   * @throws {Error} Si alguna variable crítica no está configurada
   */
  static validateRequiredEnvVars() {
    const requiredVars = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL', 'NODE_ENV'];

    const missingVars = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
          'Please configure these variables before starting the application.'
      );
    }

    // Validar valores específicos
    this.validateJWTSecret();
    this.validateNodeEnv();
    this.validateOptionalVars();
  }

  /**
   * Valida la configuración del JWT_SECRET
   * @throws {Error} Si el JWT_SECRET es inseguro
   */
  static validateJWTSecret() {
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security reasons.');
    }

    // Verificar que no sea un valor por defecto común
    const insecureSecrets = [
      'secret',
      'password',
      'changeme',
      'tu-secret-key',
      'your-secret-key',
      'jwt-secret',
    ];

    if (insecureSecrets.some((insecure) => jwtSecret.toLowerCase().includes(insecure))) {
      throw new Error(
        'JWT_SECRET appears to be using an insecure default value. ' +
          'Please generate a secure random string.'
      );
    }
  }

  /**
   * Valida el entorno de ejecución
   */
  static validateNodeEnv() {
    const nodeEnv = process.env.NODE_ENV;
    const validEnvironments = ['development', 'test', 'staging', 'production'];

    if (!validEnvironments.includes(nodeEnv)) {
      console.warn(
        `NODE_ENV "${nodeEnv}" is not a standard environment. ` +
          `Expected one of: ${validEnvironments.join(', ')}`
      );
    }

    // Advertencias específicas para producción
    if (nodeEnv === 'production') {
      if (!process.env.ACCESS_TOKEN_EXPIRY) {
        console.warn('ACCESS_TOKEN_EXPIRY not set in production. Using default value of 24h');
      }
      if (!process.env.REFRESH_TOKEN_EXPIRY) {
        console.warn('REFRESH_TOKEN_EXPIRY not set in production. Using default value of 7d');
      }
      if (!process.env.BCRYPT_SALT_ROUNDS || parseInt(process.env.BCRYPT_SALT_ROUNDS) < 10) {
        console.warn('BCRYPT_SALT_ROUNDS should be at least 10 in production for better security');
      }
    }
  }

  /**
   * Valida y establece valores por defecto para variables opcionales
   */
  static validateOptionalVars() {
    // Establecer valores por defecto seguros si no están configurados
    const defaults = {
      PORT: '3000',
      BCRYPT_SALT_ROUNDS: '10',
      ACCESS_TOKEN_EXPIRY: '24h',
      REFRESH_TOKEN_EXPIRY: '7d',
      CACHE_TTL: '3600',
      LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      RATE_LIMIT_WINDOW_MS: '900000', // 15 minutos
      RATE_LIMIT_MAX_REQUESTS: '100',
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
        console.info(`Using default value for ${key}: ${defaultValue}`);
      }
    }

    // Validar tipos numéricos
    const numericVars = [
      'PORT',
      'BCRYPT_SALT_ROUNDS',
      'CACHE_TTL',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS',
    ];

    for (const varName of numericVars) {
      const value = process.env[varName];
      if (value && isNaN(parseInt(value))) {
        throw new Error(`${varName} must be a valid number, got: ${value}`);
      }
    }
  }

  /**
   * Genera un JWT_SECRET seguro
   * @returns {string} JWT_SECRET generado aleatoriamente
   */
  static generateSecureJWTSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Muestra un resumen de la configuración (sin valores sensibles)
   */
  static printConfigSummary() {
    console.info('=== Configuration Summary ===');
    console.info(`Environment: ${process.env.NODE_ENV}`);
    console.info(`Port: ${process.env.PORT}`);
    console.info(`Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.info(`Redis: ${process.env.REDIS_URL ? 'Configured' : 'Not configured'}`);
    console.info(
      `JWT Secret: ${process.env.JWT_SECRET ? `Configured (length: ${process.env.JWT_SECRET.length})` : 'Not configured'}`
    );
    console.info(`Access Token Expiry: ${process.env.ACCESS_TOKEN_EXPIRY}`);
    console.info(`Refresh Token Expiry: ${process.env.REFRESH_TOKEN_EXPIRY}`);
    console.info(`Bcrypt Salt Rounds: ${process.env.BCRYPT_SALT_ROUNDS}`);
    console.info(`Cache TTL: ${process.env.CACHE_TTL} seconds`);
    console.info(`Log Level: ${process.env.LOG_LEVEL}`);
    console.info('============================');
  }
}

export default ConfigValidator;
