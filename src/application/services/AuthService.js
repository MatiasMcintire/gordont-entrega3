import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import config from '../../config.js';

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Obtiene el JWT secret de forma segura
   */
  _getJwtSecret() {
    const secret = config.jwt.secret || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured. Please set it in your environment variables.');
    }
    return secret;
  }

  /**
   * Verifica y decodifica un token JWT
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this._getJwtSecret());
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * (Opcional) genera un nuevo token de acceso
   */
  generateToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, this._getJwtSecret(), { expiresIn });
  }
}


/**
 * Interface de Repository para User
 */
export class IUserRepository {
  async create(user) {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  async update(id, data) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }
}