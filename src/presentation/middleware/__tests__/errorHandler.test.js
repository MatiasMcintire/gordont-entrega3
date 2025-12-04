import { jest } from '@jest/globals';
import { errorHandler, asyncHandler } from '../errorHandler.js';
import {
  AppError,
  NotFoundError,
  ValidationError as CustomValidationError,
} from '../../../shared/errors/AppError.js';

// Mock del logger
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('errorHandler', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      path: '/api/v1/test',
      method: 'GET',
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock next function
    mockNext = jest.fn();
  });

  describe('AppError handling', () => {
    it('should handle NotFoundError correctly', () => {
      // Arrange
      const error = new NotFoundError('User', 'user-123');

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            statusCode: 404,
          }),
        })
      );
    });

    it('should handle CustomValidationError correctly', () => {
      // Arrange
      const error = new CustomValidationError('Invalid email format');

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: 'Invalid email format',
          }),
        })
      );
    });

    it('should handle generic AppError with custom status code', () => {
      // Arrange
      const error = new AppError('Forbidden resource', 403, 'FORBIDDEN');

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            statusCode: 403,
            message: 'Forbidden resource',
          }),
        })
      );
    });
  });

  describe('Mongoose ValidationError handling', () => {
    it('should handle Mongoose ValidationError with multiple fields', () => {
      // Arrange
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password must be at least 8 characters' },
        },
      };

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: expect.arrayContaining([
            { field: 'email', message: 'Email is required' },
            { field: 'password', message: 'Password must be at least 8 characters' },
          ]),
        },
      });
    });

    it('should handle Mongoose ValidationError with single field', () => {
      // Arrange
      const error = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
        },
      };

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: [{ field: 'name', message: 'Name is required' }],
        },
      });
    });
  });

  describe('Mongoose CastError handling', () => {
    it('should handle CastError for invalid ObjectId', () => {
      // Arrange
      const error = {
        name: 'CastError',
        kind: 'ObjectId',
        value: 'invalid-id',
        path: '_id',
      };

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid ID format',
          code: 'INVALID_ID',
          statusCode: 400,
        },
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic Error as 500 internal server error', () => {
      // Arrange
      const error = new Error('Unexpected database connection failure');

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
          timestamp: expect.any(String),
        },
      });
    });

    it('should include timestamp in generic errors', () => {
      // Arrange
      const error = new Error('Random error');
      const beforeTime = new Date().toISOString();

      // Act
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assert
      const afterTime = new Date().toISOString();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.timestamp).toBeDefined();
      expect(response.error.timestamp >= beforeTime).toBe(true);
      expect(response.error.timestamp <= afterTime).toBe(true);
    });
  });
});

describe('asyncHandler', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should call next with error when async function throws', async () => {
    // Arrange
    const error = new Error('Async operation failed');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);

    // Act
    await wrappedFn(mockReq, mockRes, mockNext);

    // Assert
    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should not call next when async function succeeds', async () => {
    // Arrange
    const asyncFn = jest.fn().mockResolvedValue(undefined);
    const wrappedFn = asyncHandler(asyncFn);

    // Act
    await wrappedFn(mockReq, mockRes, mockNext);

    // Assert
    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle synchronous errors in async function', async () => {
    // Arrange
    const error = new Error('Sync error in async function');
    const asyncFn = jest.fn().mockImplementation(() => Promise.reject(error));
    const wrappedFn = asyncHandler(asyncFn);

    // Act
    await wrappedFn(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should pass through all arguments to wrapped function', async () => {
    // Arrange
    const asyncFn = jest.fn().mockResolvedValue(undefined);
    const wrappedFn = asyncHandler(asyncFn);

    // Act
    await wrappedFn(mockReq, mockRes, mockNext);

    // Assert
    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });
});
