import { jest } from '@jest/globals';
import { MongoWorkoutRepository } from '../MongoWorkoutRepository.js';
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

describe('MongoWorkoutRepository', () => {
  let workoutRepository;
  let mockWorkoutModel;
  let mockWorkout;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock de WorkoutModel
    mockWorkoutModel = jest.fn();
    mockWorkoutModel.findById = jest.fn();
    mockWorkoutModel.find = jest.fn();
    mockWorkoutModel.findOneAndUpdate = jest.fn();
    mockWorkoutModel.findOneAndDelete = jest.fn();
    mockWorkoutModel.countDocuments = jest.fn();

    // Mock workout data
    mockWorkout = {
      _id: 'workout-123',
      userId: 'user-123',
      date: new Date('2025-11-05'),
      type: 'strength',
      exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight: 80 }],
      duration: 3600,
      caloriesBurned: 300,
      notes: 'Great workout',
      createdAt: new Date('2025-11-05'),
      updatedAt: new Date('2025-11-05'),
    };

    // Crear instancia del repositorio
    workoutRepository = new MongoWorkoutRepository(mockWorkoutModel);
  });

  describe('create', () => {
    it('should create workout successfully', async () => {
      // Arrange
      const workoutData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        type: 'strength',
        exercises: [{ name: 'Bench Press', sets: 3, reps: 10, weight: 80 }],
        duration: 3600,
        caloriesBurned: 300,
        notes: 'Great workout',
      };

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockMongoWorkout = { ...mockWorkout, save: mockSave };

      mockWorkoutModel.mockImplementation(() => mockMongoWorkout);

      // Act
      const result = await workoutRepository.create(workoutData);

      // Assert
      expect(mockWorkoutModel).toHaveBeenCalledWith({
        userId: workoutData.userId,
        date: workoutData.date,
        type: workoutData.type,
        exercises: workoutData.exercises,
        duration: workoutData.duration,
        caloriesBurned: workoutData.caloriesBurned,
        notes: workoutData.notes,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result.id).toBe('workout-123');
      expect(result.type).toBe('strength');
    });

    it('should create workout with default values when optional fields missing', async () => {
      // Arrange
      const workoutData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        type: 'cardio',
        exercises: [],
        duration: 1800,
      };

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockMongoWorkout = {
        ...mockWorkout,
        caloriesBurned: 0,
        notes: '',
        save: mockSave,
      };

      mockWorkoutModel.mockImplementation(() => mockMongoWorkout);

      // Act
      const result = await workoutRepository.create(workoutData);

      // Assert
      expect(mockWorkoutModel).toHaveBeenCalledWith(
        expect.objectContaining({
          caloriesBurned: 0,
          notes: '',
        })
      );
    });

    it('should throw error when creation fails', async () => {
      // Arrange
      const workoutData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        type: 'strength',
        exercises: [],
        duration: 3600,
      };

      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockWorkoutModel.mockImplementation(() => ({ save: mockSave }));

      // Act & Assert
      await expect(workoutRepository.create(workoutData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find workout by ID successfully', async () => {
      // Arrange
      mockWorkoutModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWorkout),
      });

      // Act
      const result = await workoutRepository.findById('workout-123');

      // Assert
      expect(mockWorkoutModel.findById).toHaveBeenCalledWith('workout-123');
      expect(result.id).toBe('workout-123');
      expect(result.type).toBe('strength');
    });

    it('should throw NotFoundError when workout does not exist', async () => {
      // Arrange
      mockWorkoutModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(workoutRepository.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByDate', () => {
    it('should find workouts by date successfully', async () => {
      // Arrange
      const date = new Date('2025-11-05');
      const workouts = [mockWorkout, { ...mockWorkout, _id: 'workout-456' }];

      mockWorkoutModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(workouts),
      });

      // Act
      const result = await workoutRepository.findByDate('user-123', date);

      // Assert
      expect(mockWorkoutModel.find).toHaveBeenCalledWith({
        userId: 'user-123',
        date: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('workout-123');
    });

    it('should return empty array when no workouts found', async () => {
      // Arrange
      mockWorkoutModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await workoutRepository.findByDate('user-123', new Date('2025-11-05'));

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated workouts with cursor', async () => {
      // Arrange
      const workouts = Array(21)
        .fill(null)
        .map((_, i) => ({
          ...mockWorkout,
          _id: `workout-${i}`,
          createdAt: new Date(`2025-11-0${5 + i}`),
        }));

      mockWorkoutModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(workouts),
          }),
        }),
      });

      // Act
      const result = await workoutRepository.findPaginated('user-123', { limit: 20 });

      // Assert
      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
      expect(result.metadata.count).toBe(20);
    });

    it('should handle cursor-based pagination', async () => {
      // Arrange
      const workouts = [mockWorkout];
      mockWorkoutModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(workouts),
          }),
        }),
      });

      const cursor = new Date('2025-11-05').toISOString();

      // Act
      const result = await workoutRepository.findPaginated('user-123', { limit: 20, cursor });

      // Assert
      expect(mockWorkoutModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({ $lt: expect.any(Date) }),
        })
      );
      expect(result.hasMore).toBe(false);
    });

    it('should support ascending sort order', async () => {
      // Arrange
      mockWorkoutModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockWorkout]),
          }),
        }),
      });

      // Act
      await workoutRepository.findPaginated('user-123', { sortOrder: 'asc' });

      // Assert
      expect(mockWorkoutModel.find().sort).toHaveBeenCalledWith({ createdAt: 1 });
    });
  });

  describe('findByPage', () => {
    it('should return page-based paginated workouts', async () => {
      // Arrange
      const workouts = [mockWorkout, { ...mockWorkout, _id: 'workout-456' }];

      mockWorkoutModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(workouts),
            }),
          }),
        }),
      });

      mockWorkoutModel.countDocuments.mockResolvedValue(10);

      // Act
      const result = await workoutRepository.findByPage('user-123', { page: 1, limit: 5 });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    it('should handle custom sort options', async () => {
      // Arrange
      mockWorkoutModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      mockWorkoutModel.countDocuments.mockResolvedValue(0);

      // Act
      await workoutRepository.findByPage('user-123', {
        page: 2,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'asc',
      });

      // Assert
      expect(mockWorkoutModel.find().sort).toHaveBeenCalledWith({ date: 1 });
      expect(mockWorkoutModel.find().sort().skip).toHaveBeenCalledWith(10);
    });
  });

  describe('update', () => {
    it('should update workout successfully', async () => {
      // Arrange
      const updateData = { notes: 'Updated notes', caloriesBurned: 350 };
      const updatedWorkout = { ...mockWorkout, ...updateData };

      mockWorkoutModel.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedWorkout),
      });

      // Act
      const result = await workoutRepository.update('workout-123', 'user-123', updateData);

      // Assert
      expect(mockWorkoutModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'workout-123', userId: 'user-123' },
        expect.objectContaining({ notes: 'Updated notes', caloriesBurned: 350 }),
        { new: true, runValidators: true }
      );
      expect(result.notes).toBe('Updated notes');
      expect(result.caloriesBurned).toBe(350);
    });

    it('should throw NotFoundError when workout does not exist', async () => {
      // Arrange
      mockWorkoutModel.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        workoutRepository.update('non-existent-id', 'user-123', { notes: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete workout successfully', async () => {
      // Arrange
      mockWorkoutModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWorkout),
      });

      // Act
      const result = await workoutRepository.delete('workout-123', 'user-123');

      // Assert
      expect(mockWorkoutModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'workout-123',
        userId: 'user-123',
      });
      expect(result.id).toBe('workout-123');
    });

    it('should throw NotFoundError when workout does not exist', async () => {
      // Arrange
      mockWorkoutModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(workoutRepository.delete('non-existent-id', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('mapToDomain', () => {
    it('should map MongoDB workout to domain workout correctly', () => {
      // Act
      const result = workoutRepository.mapToDomain(mockWorkout);

      // Assert
      expect(result.id).toBe(mockWorkout._id);
      expect(result.userId).toBe(mockWorkout.userId);
      expect(result.type).toBe(mockWorkout.type);
      expect(result.exercises).toEqual(mockWorkout.exercises);
      expect(result).toHaveProperty('toJSON');
    });

    it('should include all fields in toJSON', () => {
      // Act
      const result = workoutRepository.mapToDomain(mockWorkout);
      const json = result.toJSON();

      // Assert
      expect(json.id).toBe(mockWorkout._id);
      expect(json.type).toBe('strength');
      expect(json.duration).toBe(3600);
      expect(json.caloriesBurned).toBe(300);
      expect(json.exercises).toEqual(mockWorkout.exercises);
    });
  });
});
