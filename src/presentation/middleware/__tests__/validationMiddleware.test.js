import { jest } from '@jest/globals';
import Joi from 'joi';
import { validate, validateMultiple } from '../validationMiddleware.js';

// Mock del logger
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('validate middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/api/v1/test',
      method: 'POST',
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock next function
    mockNext = jest.fn();
  });

  describe('Successful validation', () => {
    it('should validate body successfully with valid data', () => {
      // Arrange
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      mockReq.body = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should validate query params successfully', () => {
      // Arrange
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
      });

      mockReq.query = {
        page: '2',
        limit: '50',
      };

      const middleware = validate(schema, 'query');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.page).toBe(2); // Converted to number
      expect(mockReq.query.limit).toBe(50); // Converted to number
    });

    it('should apply default values when not provided', () => {
      // Arrange
      const schema = Joi.object({
        page: Joi.number().default(1),
        limit: Joi.number().default(20),
      });

      mockReq.query = {};

      const middleware = validate(schema, 'query');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.page).toBe(1);
      expect(mockReq.query.limit).toBe(20);
    });

    it('should strip unknown properties', () => {
      // Arrange
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      mockReq.body = {
        email: 'test@example.com',
        unknownField: 'should be removed',
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        email: 'test@example.com',
      });
      expect(mockReq.body.unknownField).toBeUndefined();
    });
  });

  describe('Validation failures', () => {
    it('should return 400 when required field is missing', () => {
      // Arrange
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      mockReq.body = {
        email: 'test@example.com',
        // name is missing
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.stringContaining('required'),
            }),
          ]),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return all validation errors when abortEarly is false', () => {
      // Arrange
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required(),
        name: Joi.string().required(),
      });

      mockReq.body = {
        email: 'invalid-email',
        age: 15,
        // name is missing
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.details).toHaveLength(3);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate email format', () => {
      // Arrange
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      mockReq.body = {
        email: 'not-an-email',
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email'),
            }),
          ]),
        },
      });
    });

    it('should validate number ranges', () => {
      // Arrange
      const schema = Joi.object({
        age: Joi.number().min(18).max(120).required(),
      });

      mockReq.body = {
        age: 150,
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('120'),
            }),
          ]),
        },
      });
    });
  });

  describe('Type conversion', () => {
    it('should convert string numbers to actual numbers', () => {
      // Arrange
      const schema = Joi.object({
        age: Joi.number().required(),
        weight: Joi.number().required(),
      });

      mockReq.body = {
        age: '25',
        weight: '70.5',
      };

      const middleware = validate(schema, 'body');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.age).toBe(25);
      expect(mockReq.body.weight).toBe(70.5);
      expect(typeof mockReq.body.age).toBe('number');
    });

    it('should convert string booleans to actual booleans', () => {
      // Arrange
      const schema = Joi.object({
        isActive: Joi.boolean().required(),
      });

      mockReq.query = {
        isActive: 'true',
      };

      const middleware = validate(schema, 'query');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query.isActive).toBe(true);
      expect(typeof mockReq.query.isActive).toBe('boolean');
    });
  });

  describe('Different request properties', () => {
    it('should validate params property', () => {
      // Arrange
      const schema = Joi.object({
        id: Joi.string().required(),
      });

      mockReq.params = {
        id: 'user-123',
      };

      const middleware = validate(schema, 'params');

      // Act
      middleware(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.params.id).toBe('user-123');
    });
  });
});

describe('validateMultiple middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/api/v1/test',
      method: 'POST',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should validate multiple properties successfully', () => {
    // Arrange
    const schemas = {
      params: Joi.object({
        id: Joi.string().required(),
      }),
      body: Joi.object({
        name: Joi.string().required(),
      }),
      query: Joi.object({
        includeDeleted: Joi.boolean().default(false),
      }),
    };

    mockReq.params = { id: 'user-123' };
    mockReq.body = { name: 'Test User' };
    mockReq.query = {};

    const middleware = validateMultiple(schemas);

    // Act
    middleware(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockReq.params.id).toBe('user-123');
    expect(mockReq.body.name).toBe('Test User');
    expect(mockReq.query.includeDeleted).toBe(false);
  });

  it('should return all errors from multiple properties', () => {
    // Arrange
    const schemas = {
      params: Joi.object({
        id: Joi.string().required(),
      }),
      body: Joi.object({
        email: Joi.string().email().required(),
      }),
    };

    mockReq.params = {}; // missing id
    mockReq.body = { email: 'invalid' }; // invalid email

    const middleware = validateMultiple(schemas);

    // Act
    middleware(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    const response = mockRes.json.mock.calls[0][0];
    expect(response.error.details.length).toBeGreaterThanOrEqual(2);
    expect(response.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'params' }),
        expect.objectContaining({ property: 'body' }),
      ])
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should apply validated values even when other properties fail', () => {
    // Arrange
    const schemas = {
      params: Joi.object({
        id: Joi.string().required(),
      }),
      query: Joi.object({
        page: Joi.number().default(1),
      }),
    };

    mockReq.params = {}; // Will fail
    mockReq.query = {}; // Will pass with default

    const middleware = validateMultiple(schemas);

    // Act
    middleware(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
