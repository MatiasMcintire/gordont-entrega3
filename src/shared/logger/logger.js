import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../..', 'logs');

// Crear directorio si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

class Logger {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.isDev = this.environment === 'development';
    this.isTest = this.environment === 'test';
    this.isProd = this.environment === 'production';

    // Configurar nivel de log según entorno y variable LOG_LEVEL
    this.configuredLevel = this._getConfiguredLevel();
  }

  _getConfiguredLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();

    // Si hay LOG_LEVEL configurado, usarlo
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      return LOG_LEVELS[envLevel];
    }

    // Niveles por defecto según ambiente
    if (this.isTest) return LOG_LEVELS.ERROR; // Solo errores en tests
    if (this.isProd) return LOG_LEVELS.WARN; // Warn y Error en producción
    return LOG_LEVELS.DEBUG; // Todo en desarrollo
  }

  _shouldLog(level) {
    return level <= this.configuredLevel;
  }

  formatMessage(level, message, context = {}) {
    const logObject = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      environment: this.environment,
      message,
      ...context,
    };

    // En desarrollo, formato más legible
    if (this.isDev) {
      const { timestamp, level: lvl, message: msg, requestId, duration, ...rest } = logObject;
      const reqId = requestId ? `[${requestId}]` : '';
      const dur = duration !== undefined ? `${duration}ms` : '';
      const extra = Object.keys(rest).length > 0 ? JSON.stringify(rest) : '';
      return `${timestamp} ${lvl} ${reqId} ${msg} ${dur} ${extra}`.trim();
    }

    // En producción, JSON estructurado
    return JSON.stringify(logObject);
  }

  writeLog(level, message, context) {
    // No loggear si está por debajo del nivel configurado
    if (!this._shouldLog(level)) {
      return;
    }

    const logMessage = this.formatMessage(level, message, context);

    // Console siempre (excepto en tests)
    if (!this.isTest) {
      console.log(logMessage);
    }

    // Archivo
    const levelName = LOG_LEVEL_NAMES[level].toLowerCase();
    const fileName = path.join(LOG_DIR, `${levelName}.log`);

    try {
      fs.appendFileSync(fileName, `${logMessage}\n`);
    } catch (error) {
      console.error('Failed to write log to file:', error.message);
    }
  }

  error(message, context = {}) {
    this.writeLog(LOG_LEVELS.ERROR, message, context);
  }

  warn(message, context = {}) {
    this.writeLog(LOG_LEVELS.WARN, message, context);
  }

  info(message, context = {}) {
    this.writeLog(LOG_LEVELS.INFO, message, context);
  }

  debug(message, context = {}) {
    this.writeLog(LOG_LEVELS.DEBUG, message, context);
  }

  // Método específico para logging de requests HTTP
  http(method, path, statusCode, duration, context = {}) {
    const level =
      statusCode >= 500 ? LOG_LEVELS.ERROR : statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;

    this.writeLog(level, `${method} ${path}`, {
      statusCode,
      duration,
      ...context,
    });
  }
}

export default new Logger();
