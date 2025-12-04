import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} from '../AppError.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with defaults', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.timestamp).toBeDefined();
    });

    it('should create AppError with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
    });

    it('should return JSON format', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      const json = error.toJSON();

      expect(json.error.message).toBe('Test error');
      expect(json.error.statusCode).toBe(500);
      expect(json.error.code).toBe('TEST_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should have status 400', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include details', () => {
      const details = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Invalid input', details);

      const json = error.toJSON();
      expect(json.error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404', () => {
      const error = new NotFoundError('User', '123');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('User');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status 401', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const error = new ConflictError('Email already exists');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
});