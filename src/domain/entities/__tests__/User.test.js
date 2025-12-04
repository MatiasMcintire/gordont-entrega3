import { User } from '../User.js';

describe('User Entity', () => {
  describe('isValidEmail', () => {
    it('should validate correct email format', () => {
      expect(User.isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(User.isValidEmail('invalid-email')).toBe(false);
      expect(User.isValidEmail('test@')).toBe(false);
      expect(User.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong password', () => {
      expect(User.isValidPassword('SecurePass123')).toBe(true);
    });

    it('should reject short password', () => {
      expect(User.isValidPassword('Short1')).toBe(false);
    });

    it('should reject password without uppercase', () => {
      expect(User.isValidPassword('nouppercase123')).toBe(false);
    });

    it('should reject password without lowercase', () => {
      expect(User.isValidPassword('NOLOWERCASE123')).toBe(false);
    });

    it('should reject password without numbers', () => {
      expect(User.isValidPassword('NoNumbers')).toBe(false);
    });
  });

  describe('User creation', () => {
    it('should have all required properties', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashedpassword'
      });

      expect(user.id).toBe('123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.passwordHash).toBe('hashedpassword');
    });

    it('should have email property set', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashedpassword'
      });

      expect(user.email).toBeDefined();
      expect(user.email).not.toBe('');
    });
  });

  describe('toJSON', () => {
    it('should not include passwordHash in JSON', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'secret'
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.email).toBe('test@example.com');
      expect(json.name).toBe('Test User');
    });

    it('should include all public fields', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'secret',
        createdAt: new Date('2025-10-31'),
        updatedAt: new Date('2025-10-31')
      });

      const json = user.toJSON();
      expect(json.id).toBe('123');
      expect(json.email).toBe('test@example.com');
      expect(json.name).toBe('Test User');
      expect(json.createdAt).toBeDefined();
    });
  });
});