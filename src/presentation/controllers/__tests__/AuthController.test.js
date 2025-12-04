import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthController } from '../AuthController.js';

// Mock de dependencias
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthController', () => {
  let authController;
  let mockUserRepository;
  let mockCacheService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock del UserRepository
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    // Mock del CacheService
    mockCacheService = {
      invalidate: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    };

    // Mock de request
    mockReq = {
      body: {},
      user: null,
      id: 'test-request-id-123',
    };

    // Mock de response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Configurar mocks de bcrypt y jwt
    bcrypt.hash = jest.fn();
    bcrypt.compare = jest.fn();
    jwt.sign = jest.fn();
    jwt.verify = jest.fn();

    // Crear instancia del controller
    authController = new AuthController(mockUserRepository, mockCacheService);

    // Mock de variables de entorno
    process.env.JWT_SECRET = 'test-secret-key-with-at-least-32-characters-for-security';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-with-at-least-32-characters';
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'SecurePass123!',
      weight: 70,
      height: 175,
      age: 25,
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const mockUser = {
        id: 'user-123',
        email: validRegisterData.email,
        name: validRegisterData.name,
        toJSON: jest.fn().mockReturnValue({
          id: 'user-123',
          email: validRegisterData.email,
          name: validRegisterData.name,
        }),
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      bcrypt.hash.mockResolvedValue('hashed-password');
      jwt.sign.mockReturnValueOnce('mock-access-token').mockReturnValueOnce('mock-refresh-token');

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validRegisterData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(validRegisterData.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: validRegisterData.email,
        name: validRegisterData.name,
        passwordHash: 'hashed-password',
        weight: 70,
        height: 175,
        age: 25,
      });
      expect(mockCacheService.invalidate).toHaveBeenCalledWith('users:*');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: expect.objectContaining({
            id: 'user-123',
            email: validRegisterData.email,
          }),
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' }; // Faltan campos

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Email, name, password, weight, height, and age are required' },
      });
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when weight is invalid', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData, weight: 600 }; // Peso > 500

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Weight must be between 1 and 500 kg' },
      });
    });

    it('should return 400 when height is invalid', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData, height: 400 }; // Altura > 300

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Height must be between 50 and 300 cm' },
      });
    });

    it('should return 400 when age is invalid', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData, age: 10 }; // Edad < 13

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Age must be between 13 and 120 years' },
      });
    });

    it('should return 409 when user already exists', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData };
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validRegisterData.email);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'User already exists' },
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should return 500 when an error occurs', async () => {
      // Arrange
      mockReq.body = { ...validRegisterData };
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.register(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should login user successfully with correct credentials', async () => {
      // Arrange
      mockReq.body = { ...validLoginData };

      const mockUser = {
        id: 'user-123',
        email: validLoginData.email,
        passwordHash: 'hashed-password',
        toJSON: jest.fn().mockReturnValue({
          id: 'user-123',
          email: validLoginData.email,
          name: 'Test User',
        }),
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce('mock-access-token').mockReturnValueOnce('mock-refresh-token');

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, mockUser.passwordHash);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            id: 'user-123',
            email: validLoginData.email,
          }),
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    });

    it('should return 400 when email or password is missing', async () => {
      // Arrange
      mockReq.body = { email: 'test@example.com' }; // Falta password

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Email and password are required' },
      });
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should return 401 when user does not exist', async () => {
      // Arrange
      mockReq.body = { ...validLoginData };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Invalid credentials' },
      });
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      mockReq.body = { ...validLoginData };

      const mockUser = {
        id: 'user-123',
        email: validLoginData.email,
        passwordHash: 'hashed-password',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // Password incorrecto

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(validLoginData.password, mockUser.passwordHash);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Invalid credentials' },
      });
    });

    it('should return 500 when an error occurs', async () => {
      // Arrange
      mockReq.body = { ...validLoginData };
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('refresh', () => {
    it('should refresh access token successfully', async () => {
      // Arrange
      mockReq.body = { refreshToken: 'valid-refresh-token' };

      const decodedToken = { id: 'user-123' };
      jwt.verify.mockReturnValue(decodedToken);
      jwt.sign.mockReturnValue('new-access-token');

      // Act
      await authController.refresh(mockReq, mockRes);

      // Assert
      expect(jwt.verify).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user-123' },
        expect.any(String), // JWT secret can vary based on environment
        { expiresIn: '24h' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed',
        data: { accessToken: 'new-access-token' },
      });
    });

    it('should return 400 when refresh token is missing', async () => {
      // Arrange
      mockReq.body = {}; // Sin refreshToken

      // Act
      await authController.refresh(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Refresh token is required' },
      });
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Arrange
      mockReq.body = { refreshToken: 'invalid-token' };
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await authController.refresh(mockReq, mockRes);

      // Assert
      expect(jwt.verify).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Invalid refresh token' },
      });
    });
  });

  describe('getMe', () => {
    it('should return current user successfully', async () => {
      // Arrange
      mockReq.user = { id: 'user-123' };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        toJSON: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        }),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authController.getMe(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
        }),
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockReq.user = { id: 'non-existent-user' };
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      await authController.getMe(mockReq, mockRes);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent-user');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'User not found' },
      });
    });

    it('should return 500 when an error occurs', async () => {
      // Arrange
      mockReq.user = { id: 'user-123' };
      mockUserRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.getMe(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('_getJwtSecret', () => {
    it('should return JWT secret from config', () => {
      // Act
      const secret = authController._getJwtSecret();

      // Assert
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    // Note: Testing error case for missing JWT_SECRET is covered by integration tests
    // since config.js caches the value at module load time
  });
});
