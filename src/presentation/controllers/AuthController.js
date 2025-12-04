import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../../shared/logger/logger.js';
import config from '../../config.js';

export class AuthController {
  constructor(userRepository, cacheService = null) {
    this.userRepository = userRepository;
    this.cacheService = cacheService;
  }

  // Método auxiliar para obtener JWT secret de forma segura
  _getJwtSecret() {
    const secret = config.jwt.secret || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured. Please set it in your environment variables.');
    }
    if (config.isDevelopment && secret.length < 32) {
      logger.warn('JWT_SECRET is too short. Use at least 32 characters for security.');
    }
    return secret;
  }

  register = async (req, res) => {
    try {
      const { email, name, password, weight, height, age } = req.body;

      // Validación de campos requeridos
      if (!email || !name || !password || !weight || !height || !age) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email, name, password, weight, height, and age are required' },
        });
      }

      // Validar que weight, height, age sean números válidos
      if (isNaN(weight) || weight < 1 || weight > 500) {
        return res.status(400).json({
          success: false,
          error: { message: 'Weight must be between 1 and 500 kg' },
        });
      }

      if (isNaN(height) || height < 50 || height > 300) {
        return res.status(400).json({
          success: false,
          error: { message: 'Height must be between 50 and 300 cm' },
        });
      }

      if (isNaN(age) || age < 13 || age > 120) {
        return res.status(400).json({
          success: false,
          error: { message: 'Age must be between 13 and 120 years' },
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'User already exists' },
        });
      }

      // Generar hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await this.userRepository.create({
        email,
        name,
        passwordHash,
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
      });

      // Log sin datos sensibles
      logger.info('User registered', {
        userId: user.id,
        email,
        requestId: req.id,
      });

      // Invalidar caché si está disponible
      if (this.cacheService) {
        await this.cacheService.invalidate('users:*');
      }

      // Generar tokens para login automático después del registro
      const jwtSecret = this._getJwtSecret();
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
        expiresIn: '24h',
      });

      const refreshToken = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Registration error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required' },
        });
      }

      // Buscar usuario
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials' },
        });
      }

      // Verificar password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials' },
        });
      }

      // Generar tokens
      const jwtSecret = this._getJwtSecret();
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
        expiresIn: '24h',
      });

      const refreshToken = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

      logger.info('User login', {
        userId: user.id,
        email,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  refresh = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token is required' },
        });
      }

      const jwtSecret = this._getJwtSecret();
      const decoded = jwt.verify(refreshToken, jwtSecret);

      const newAccessToken = jwt.sign({ id: decoded.id }, jwtSecret, { expiresIn: '24h' });

      return res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: { accessToken: newAccessToken },
      });
    } catch (error) {
      logger.error('Refresh error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid refresh token' },
      });
    }
  };

  getMe = async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      // Intentar obtener del caché si está disponible
      let user = null;
      const cacheKey = `user:${userId}`;

      if (this.cacheService) {
        user = await this.cacheService.get(cacheKey);
      }

      if (!user) {
        user = await this.userRepository.findById(userId);

        // Verificar si el usuario existe
        if (!user) {
          return res.status(404).json({
            success: false,
            error: { message: 'User not found' },
          });
        }

        // Guardar en caché si está disponible
        if (this.cacheService) {
          await this.cacheService.set(cacheKey, user, 3600); // 1 hora
        }
      }

      return res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      logger.error('Get user error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };
}
