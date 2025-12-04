import {
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from '../authValidators.js';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123',
      weight: 70,
      height: 175,
      age: 25
    };

    it('should validate valid registration data', () => {
      const { error } = registerSchema.validate(validRegisterData);
      expect(error).toBeUndefined();
    });

    it('should normalize email to lowercase', () => {
      const { value } = registerSchema.validate({
        ...validRegisterData,
        email: 'TEST@EXAMPLE.COM'
      });

      expect(value.email).toBe('test@example.com');
    });

    it('should trim email whitespace', () => {
      const { value } = registerSchema.validate({
        ...validRegisterData,
        email: '  test@example.com  '
      });

      expect(value.email).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test..user@example.com'
      ];

      invalidEmails.forEach(email => {
        const { error } = registerSchema.validate({
          ...validRegisterData,
          email
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('valid email');
      });
    });

    it('should reject missing email', () => {
      const data = { ...validRegisterData };
      delete data.email;

      const { error } = registerSchema.validate(data);

      expect(error).toBeDefined();
      expect(error.message).toContain('Email is required');
    });

    it('should reject password shorter than 8 characters', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'Pass1'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'password123'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('uppercase');
    });

    it('should reject password without lowercase letter', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'PASSWORD123'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('lowercase');
    });

    it('should reject password without number', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'PasswordABC'
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('number');
    });

    it('should trim name whitespace', () => {
      const { value } = registerSchema.validate({
        ...validRegisterData,
        name: '  Test User  '
      });

      expect(value.name).toBe('Test User');
    });

    it('should reject name shorter than 2 characters', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        name: 'A'
      });

      expect(error).toBeDefined();
    });

    it('should reject name longer than 50 characters', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        name: 'A'.repeat(51)
      });

      expect(error).toBeDefined();
    });

    it('should reject weight less than 1', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        weight: 0
      });

      expect(error).toBeDefined();
    });

    it('should reject weight greater than 500', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        weight: 501
      });

      expect(error).toBeDefined();
    });

    it('should reject height less than 50', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        height: 49
      });

      expect(error).toBeDefined();
    });

    it('should reject height greater than 300', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        height: 301
      });

      expect(error).toBeDefined();
    });

    it('should reject age less than 13', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        age: 12
      });

      expect(error).toBeDefined();
    });

    it('should reject age greater than 120', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        age: 121
      });

      expect(error).toBeDefined();
    });

    it('should reject non-integer age', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        age: 25.5
      });

      expect(error).toBeDefined();
    });

    it('should accept boundary values', () => {
      const boundaryData = {
        ...validRegisterData,
        weight: 1,
        height: 50,
        age: 13
      };

      const { error: errorMin } = registerSchema.validate(boundaryData);
      expect(errorMin).toBeUndefined();

      boundaryData.weight = 500;
      boundaryData.height = 300;
      boundaryData.age = 120;

      const { error: errorMax } = registerSchema.validate(boundaryData);
      expect(errorMax).toBeUndefined();
    });

    it('should reject missing required fields', () => {
      const requiredFields = ['email', 'name', 'password', 'weight', 'height', 'age'];

      requiredFields.forEach(field => {
        const data = { ...validRegisterData };
        delete data[field];

        const { error } = registerSchema.validate(data);
        expect(error).toBeDefined();
      });
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const { error } = loginSchema.validate(loginData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const { error } = loginSchema.validate({
        email: 'notanemail',
        password: 'Password123'
      });

      expect(error).toBeDefined();
    });

    it('should reject missing email', () => {
      const { error } = loginSchema.validate({
        password: 'Password123'
      });

      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com'
      });

      expect(error).toBeDefined();
    });

    it('should accept any password format (login does not validate password strength)', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com',
        password: 'weak'
      });

      expect(error).toBeUndefined();
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate with valid refresh token', () => {
      const { error } = refreshTokenSchema.validate({
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      });

      expect(error).toBeUndefined();
    });

    it('should reject missing refresh token', () => {
      const { error } = refreshTokenSchema.validate({});

      expect(error).toBeDefined();
    });

    it('should reject empty refresh token', () => {
      const { error } = refreshTokenSchema.validate({
        refreshToken: ''
      });

      expect(error).toBeDefined();
    });
  });
});
