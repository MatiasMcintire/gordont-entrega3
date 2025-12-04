import { createClient } from 'redis';
import logger from '../../shared/logger/logger.js';
import config from '../../config.js';

let redisClient = null;

export const initializeRedis = async () => {
  try {
    // Configurar según el ambiente
    const redisUrl = config.isDevelopment 
      ? process.env.REDIS_URL || 'redis://localhost:6379'
      : process.env.REDIS_URL;

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis connection failed');
          }
          return retries * 100;
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first');
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.disconnect();
    logger.info('Redis connection closed');
  }
};