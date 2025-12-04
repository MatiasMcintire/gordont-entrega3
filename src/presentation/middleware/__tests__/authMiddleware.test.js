import { jest } from '@jest/globals';

// Create mock functions
const mockJwtVerify = jest.fn();

// Mock modules before importing the module under test
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../config.js', () => ({
  default: {
    jwt: {
      secret: 'test-secret-key-for-unit-tests',
    },
  },
}));

// Now import the module under test
const { authMiddleware } = await import('../authMiddleware.js');

describe('authMiddleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      headers: {},
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock next function
    mockNext = jest.fn();
  });

  describe('Valid authentication', () => {
    it('should authenticate user with valid token', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer valid-token';
      const decodedToken = { id: 'user-123', email: 'test@example.com' };
      mockJwtVerify.mockReturnValue(decodedToken);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-secret-key-for-unit-tests');
      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer scheme', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const decodedToken = { id: 'user-456', email: 'another@example.com' };
      mockJwtVerify.mockReturnValue(decodedToken);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'test-secret-key-for-unit-tests'
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Missing or invalid authorization header', () => {
    it('should return 401 when authorization header is missing', () => {
      // Arrange
      // No authorization header set

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing or invalid authorization header' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      // Arrange
      mockReq.headers.authorization = 'Basic dGVzdDp0ZXN0';

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing or invalid authorization header' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty string', () => {
      // Arrange
      mockReq.headers.authorization = '';

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid or expired token', () => {
    it('should return 401 when token is invalid', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Invalid or expired token' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer expired-token';
      mockJwtVerify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Invalid or expired token' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token signature is invalid', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer tampered-token';
      mockJwtVerify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle token with only id (no email)', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer token-without-email';
      const decodedToken = { id: 'user-789' };
      mockJwtVerify.mockReturnValue(decodedToken);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user).toEqual({
        id: 'user-789',
        email: undefined,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle authorization header with extra spaces', () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer  token-with-spaces';
      const decodedToken = { id: 'user-123', email: 'test@example.com' };
      mockJwtVerify.mockReturnValue(decodedToken);

      // Act
      authMiddleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockJwtVerify).toHaveBeenCalledWith(
        ' token-with-spaces',
        'test-secret-key-for-unit-tests'
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
