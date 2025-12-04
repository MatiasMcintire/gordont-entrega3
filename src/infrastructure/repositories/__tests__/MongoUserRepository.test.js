import { jest } from '@jest/globals';
import { MongoUserRepository } from '../MongoUserRepository.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

// Mock del logger
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MongoUserRepository', () => {
  let userRepository;
  let mockUserModel;
  let mockUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock de UserModel
    mockUserModel = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findOne = jest.fn();
    mockUserModel.findByIdAndUpdate = jest.fn();
    mockUserModel.findByIdAndDelete = jest.fn();

    // Mock user data
    mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password',
      weight: 70,
      height: 175,
      age: 25,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    // Crear instancia del repositorio
    userRepository = new MongoUserRepository(mockUserModel);
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        weight: 70,
        height: 175,
        age: 25,
      };

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockMongoUser = { ...mockUser, save: mockSave };

      mockUserModel.mockImplementation(() => mockMongoUser);

      // Act
      const result = await userRepository.create(userData);

      // Assert
      expect(mockUserModel).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        passwordHash: userData.passwordHash,
        weight: userData.weight,
        height: userData.height,
        age: userData.age,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw error when creation fails', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        weight: 70,
        height: 175,
        age: 25,
      };

      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockUserModel.mockImplementation(() => ({ save: mockSave }));

      // Act & Assert
      await expect(userRepository.create(userData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      // Arrange
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      const result = await userRepository.findById('user-123');

      // Assert
      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(userRepository.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      // Act & Assert
      await expect(userRepository.findById('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      // Arrange
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      // Act
      const result = await userRepository.findByEmail('test@example.com');

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act
      const result = await userRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      // Act & Assert
      await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Name', weight: 75 };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedUser),
      });

      // Act
      const result = await userRepository.update('user-123', updateData);

      // Assert
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ name: 'Updated Name', weight: 75 }),
        { new: true, runValidators: true }
      );
      expect(result.name).toBe('Updated Name');
      expect(result.weight).toBe(75);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(userRepository.update('non-existent-id', { name: 'Test' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw error when update fails', async () => {
      // Arrange
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      // Act & Assert
      await expect(userRepository.update('user-123', { name: 'Test' })).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Arrange
      mockUserModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      const result = await userRepository.delete('user-123');

      // Assert
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      mockUserModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(userRepository.delete('non-existent-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when delete fails', async () => {
      // Arrange
      mockUserModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      // Act & Assert
      await expect(userRepository.delete('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('mapToDomain', () => {
    it('should map MongoDB user to domain user correctly', () => {
      // Act
      const result = userRepository.mapToDomain(mockUser);

      // Assert
      expect(result.id).toBe(mockUser._id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
      expect(result.passwordHash).toBe(mockUser.passwordHash);
      expect(result.weight).toBe(mockUser.weight);
      expect(result.height).toBe(mockUser.height);
      expect(result.age).toBe(mockUser.age);
      expect(result).toHaveProperty('toJSON');
    });

    it('should calculate BMI correctly in toJSON', () => {
      // Act
      const result = userRepository.mapToDomain(mockUser);
      const json = result.toJSON();

      // Assert
      // BMI = 70 / (1.75^2) = 22.86
      expect(json.bmi).toBe(22.86);
      expect(json).not.toHaveProperty('passwordHash');
    });

    it('should return null BMI when weight or height is missing', () => {
      // Arrange
      const userWithoutWeight = { ...mockUser, weight: null };

      // Act
      const result = userRepository.mapToDomain(userWithoutWeight);
      const json = result.toJSON();

      // Assert
      expect(json.bmi).toBeNull();
    });
  });
});
