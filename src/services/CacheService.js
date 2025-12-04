/**
 * Servicio centralizado de caché para gestión consistente de datos
 * Proporciona invalidación automática y manejo de claves con prefijos
 */
export class CacheService {
  constructor(cacheClient) {
    this.cache = cacheClient;
    this.defaultTTL = 3600; // 1 hora por defecto
    this.prefixes = {
      user: 'user:',
      entry: 'entry:',
      workout: 'workout:',
      dailyStats: 'daily_stats:',
      periodStats: 'period_stats:'
    };
  }

  /**
   * Genera una clave de caché con prefijo consistente
   * @param {string} type - Tipo de recurso (user, entry, workout, etc)
   * @param {string} identifier - Identificador único
   * @returns {string} Clave formateada
   */
  generateKey(type, identifier) {
    return `${this.prefixes[type]}${identifier}`;
  }

  /**
   * Obtiene un valor del caché
   * @param {string} key - Clave del caché
   * @returns {Promise<any|null>} Valor o null si no existe
   */
  async get(key) {
    try {
      const value = await this.cache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Establece un valor en el caché
   * @param {string} key - Clave del caché
   * @param {any} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en segundos
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.cache.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Invalida una clave específica del caché
   * @param {string} key - Clave a invalidar
   */
  async invalidate(key) {
    try {
      await this.cache.del(key);
    } catch (error) {
      console.error(`Cache invalidation error for key ${key}:`, error);
    }
  }

  /**
   * Invalida múltiples claves que coincidan con un patrón
   * @param {string} pattern - Patrón de claves a invalidar
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await this.cache.keys(pattern);
      if (keys.length > 0) {
        await this.cache.del(...keys);
      }
    } catch (error) {
      console.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalida todas las entradas de un usuario para una fecha específica
   * @param {string} userId - ID del usuario
   * @param {Date} date - Fecha
   */
  async invalidateUserDateEntries(userId, date) {
    const dateStr = date.toISOString().split('T')[0];
    const patterns = [
      `${this.prefixes.entry}${userId}:${dateStr}:*`,
      `${this.prefixes.dailyStats}${userId}:${dateStr}`
    ];
    
    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Invalida todos los workouts de un usuario para una fecha específica
   * @param {string} userId - ID del usuario
   * @param {Date} date - Fecha
   */
  async invalidateUserDateWorkouts(userId, date) {
    const dateStr = date.toISOString().split('T')[0];
    const pattern = `${this.prefixes.workout}${userId}:${dateStr}:*`;
    await this.invalidatePattern(pattern);
  }

  /**
   * Invalida todos los datos de caché de un usuario
   * @param {string} userId - ID del usuario
   */
  async invalidateUserCache(userId) {
    const patterns = [
      `${this.prefixes.user}${userId}`,
      `${this.prefixes.entry}${userId}:*`,
      `${this.prefixes.workout}${userId}:*`,
      `${this.prefixes.dailyStats}${userId}:*`,
      `${this.prefixes.periodStats}${userId}:*`
    ];
    
    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Wrapper para ejecutar con caché
   * @param {string} key - Clave del caché
   * @param {Function} fetchFunction - Función para obtener datos si no están en caché
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<any>} Datos desde caché o función
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetchFunction();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttl);
    }
    
    return freshData;
  }
}

export default CacheService;