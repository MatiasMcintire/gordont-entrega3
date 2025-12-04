import {
  objectIdSchema,
  paginationSchema,
  cursorPaginationSchema,
  dateRangeSchema
} from '../commonValidators.js';

describe('Common Validators', () => {
  describe('objectIdSchema', () => {
    it('should validate a valid MongoDB ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';
      const { error } = objectIdSchema.validate(validId);
      expect(error).toBeUndefined();
    });

    it('should reject invalid ObjectId format', () => {
      const invalidIds = [
        'invalid',
        '12345',
        'zzzzzzzzzzzzzzzzzzzzzzzz',
        '507f1f77bcf86cd79943901',  // Too short
        '507f1f77bcf86cd7994390111'  // Too long
      ];

      invalidIds.forEach(id => {
        const { error } = objectIdSchema.validate(id);
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid ID format');
      });
    });
  });

  describe('paginationSchema (offset-based)', () => {
    it('should validate with default values', () => {
      const { error, value } = paginationSchema.validate({});

      expect(error).toBeUndefined();
      expect(value).toEqual({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should validate with custom values', () => {
      const input = {
        page: 5,
        limit: 50,
        sortBy: 'date',
        sortOrder: 'asc'
      };

      const { error, value } = paginationSchema.validate(input);

      expect(error).toBeUndefined();
      expect(value).toEqual(input);
    });

    it('should reject page less than 1', () => {
      const { error } = paginationSchema.validate({ page: 0 });

      expect(error).toBeDefined();
      expect(error.message).toContain('Page must be at least 1');
    });

    it('should reject limit less than 1', () => {
      const { error } = paginationSchema.validate({ limit: 0 });

      expect(error).toBeDefined();
      expect(error.message).toContain('Limit must be at least 1');
    });

    it('should reject limit greater than 100', () => {
      const { error } = paginationSchema.validate({ limit: 101 });

      expect(error).toBeDefined();
      expect(error.message).toContain('Limit cannot exceed 100');
    });

    it('should reject invalid sortBy', () => {
      const { error } = paginationSchema.validate({ sortBy: 'invalid' });

      expect(error).toBeDefined();
    });

    it('should reject invalid sortOrder', () => {
      const { error } = paginationSchema.validate({ sortOrder: 'invalid' });

      expect(error).toBeDefined();
    });

    it('should accept all valid sortBy values', () => {
      const validSortBy = ['createdAt', 'updatedAt', 'date', 'name'];

      validSortBy.forEach(sortBy => {
        const { error } = paginationSchema.validate({ sortBy });
        expect(error).toBeUndefined();
      });
    });

    it('should accept both asc and desc sortOrder', () => {
      const { error: errorAsc } = paginationSchema.validate({ sortOrder: 'asc' });
      const { error: errorDesc } = paginationSchema.validate({ sortOrder: 'desc' });

      expect(errorAsc).toBeUndefined();
      expect(errorDesc).toBeUndefined();
    });
  });

  describe('cursorPaginationSchema', () => {
    it('should validate with default values', () => {
      const { error, value } = cursorPaginationSchema.validate({});

      expect(error).toBeUndefined();
      expect(value).toEqual({
        limit: 20,
        sortOrder: 'desc'
      });
    });

    it('should validate with cursor', () => {
      const input = {
        limit: 30,
        cursor: '2024-11-02T10:30:00.000Z',
        sortOrder: 'asc'
      };

      const { error, value } = cursorPaginationSchema.validate(input);

      expect(error).toBeUndefined();
      expect(value).toEqual(input);
    });

    it('should reject invalid cursor format', () => {
      const { error } = cursorPaginationSchema.validate({
        cursor: 'not-a-date'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Cursor must be a valid ISO date');
    });

    it('should reject limit less than 1', () => {
      const { error } = cursorPaginationSchema.validate({ limit: 0 });

      expect(error).toBeDefined();
      expect(error.message).toContain('Limit must be at least 1');
    });

    it('should reject limit greater than 100', () => {
      const { error } = cursorPaginationSchema.validate({ limit: 150 });

      expect(error).toBeDefined();
      expect(error.message).toContain('Limit cannot exceed 100');
    });

    it('should accept valid ISO date strings', () => {
      const validDates = [
        '2024-11-02T00:00:00.000Z',
        '2024-01-15T10:30:45.123Z',
        '2023-12-31T23:59:59.999Z'
      ];

      validDates.forEach(cursor => {
        const { error } = cursorPaginationSchema.validate({ cursor });
        expect(error).toBeUndefined();
      });
    });

    it('should allow cursor to be optional', () => {
      const { error } = cursorPaginationSchema.validate({
        limit: 25,
        sortOrder: 'desc'
      });

      expect(error).toBeUndefined();
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate with valid date range', () => {
      const input = {
        startDate: '2024-11-01',
        endDate: '2024-11-30'
      };

      const { error } = dateRangeSchema.validate(input);

      expect(error).toBeUndefined();
    });

    it('should reject when startDate is missing', () => {
      const { error } = dateRangeSchema.validate({
        endDate: '2024-11-30'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('Start date is required');
    });

    it('should reject when endDate is missing', () => {
      const { error } = dateRangeSchema.validate({
        startDate: '2024-11-01'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('End date is required');
    });

    it('should reject when endDate is before startDate', () => {
      const input = {
        startDate: '2024-11-30',
        endDate: '2024-11-01'
      };

      const { error } = dateRangeSchema.validate(input);

      expect(error).toBeDefined();
      expect(error.message).toContain('End date must be after start date');
    });

    it('should accept when endDate equals startDate', () => {
      const input = {
        startDate: '2024-11-15',
        endDate: '2024-11-15'
      };

      const { error } = dateRangeSchema.validate(input);

      expect(error).toBeUndefined();
    });

    it('should accept Date objects', () => {
      const input = {
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30')
      };

      const { error } = dateRangeSchema.validate(input);

      expect(error).toBeUndefined();
    });

    it('should reject invalid date formats', () => {
      const input = {
        startDate: 'not-a-date',
        endDate: '2024-11-30'
      };

      const { error } = dateRangeSchema.validate(input);

      expect(error).toBeDefined();
    });
  });
});
