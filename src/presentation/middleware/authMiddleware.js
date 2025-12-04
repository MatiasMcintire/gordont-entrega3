import jwt from 'jsonwebtoken';
import logger from '../../shared/logger/logger.js';
import config from '../../config.js';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing or invalid authorization header' }
      });
    }

    // Obtener JWT secret de forma segura
    const jwtSecret = config.jwt.secret || process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        error: { message: 'Server configuration error' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'usuario'
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
};