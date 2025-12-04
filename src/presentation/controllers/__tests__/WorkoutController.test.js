import { jest } from '@jest/globals';
import { WorkoutController } from '../WorkoutController.js';

// Mock de logger
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WorkoutController', () => {
  let workoutController;
  let mockWorkoutRepository;
  let mockCacheService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock del WorkoutRepository
    mockWorkoutRepository = {
      create: jest.fn(),
      findByDate: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findPaginated: jest.fn(),
      findByPage: jest.fn(),
    };

    // Mock del CacheService
    mockCacheService = {
      invalidateWorkoutCache: jest.fn().mockResolvedValue(true),
    };

    // Mock de request
    mockReq = {
      body: {},
      query: {},
      params: {},
      user: { id: 'user-123' },
      id: 'test-request-id-123',
    };

    // Mock de response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Crear instancia del controller
    workoutController = new WorkoutController(mockWorkoutRepository, mockCacheService);
  });

  describe('createWorkout', () => {
    const validWorkoutData = {
      date: '2025-11-05',
      type: 'strength',
      exercises: [{ name: 'Sentadillas', sets: 4, reps: 12, weight: 80 }],
      duration: 3600,
      caloriesBurned: 450,
      notes: 'Excelente sesión',
    };

    it('should create workout successfully', async () => {
      // Arrange
      mockReq.body = { ...validWorkoutData };

      const mockWorkout = {
        id: 'workout-123',
        userId: 'user-123',
        ...validWorkoutData,
        toJSON: jest.fn().mockReturnValue({
          id: 'workout-123',
          userId: 'user-123',
          ...validWorkoutData,
        }),
      };

      mockWorkoutRepository.create.mockResolvedValue(mockWorkout);

      // Act
      await workoutController.createWorkout(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        date: new Date('2025-11-05'),
        type: 'strength',
        exercises: validWorkoutData.exercises,
        duration: 3600,
        caloriesBurned: 450,
        notes: 'Excelente sesión',
      });
      expect(mockCacheService.invalidateWorkoutCache).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Workout created successfully',
        data: expect.objectContaining({
          id: 'workout-123',
          type: 'strength',
        }),
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = { date: '2025-11-05' }; // Faltan campos

      // Act
      await workoutController.createWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing required fields: date, type, exercises, duration' },
      });
      expect(mockWorkoutRepository.create).not.toHaveBeenCalled();
    });

    it('should return 400 when userId is missing', async () => {
      // Arrange
      mockReq.user = null;
      mockReq.body = { ...validWorkoutData };

      // Act
      await workoutController.createWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing required fields: date, type, exercises, duration' },
      });
    });

    it('should return 500 when repository throws error', async () => {
      // Arrange
      mockReq.body = { ...validWorkoutData };
      mockWorkoutRepository.create.mockRejectedValue(new Error('Database error'));

      // Act
      await workoutController.createWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });

    it('should work without cache service', async () => {
      // Arrange
      workoutController = new WorkoutController(mockWorkoutRepository, null);
      mockReq.body = { ...validWorkoutData };

      const mockWorkout = {
        id: 'workout-123',
        toJSON: jest.fn().mockReturnValue({ id: 'workout-123' }),
      };
      mockWorkoutRepository.create.mockResolvedValue(mockWorkout);

      // Act
      await workoutController.createWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getWorkoutsByDate', () => {
    it('should get workouts by date successfully', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };

      const mockWorkouts = [
        {
          id: 'workout-1',
          type: 'strength',
          toJSON: jest.fn().mockReturnValue({ id: 'workout-1', type: 'strength' }),
        },
        {
          id: 'workout-2',
          type: 'cardio',
          toJSON: jest.fn().mockReturnValue({ id: 'workout-2', type: 'cardio' }),
        },
      ];

      mockWorkoutRepository.findByDate.mockResolvedValue(mockWorkouts);

      // Act
      await workoutController.getWorkoutsByDate(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findByDate).toHaveBeenCalledWith(
        'user-123',
        new Date('2025-11-05')
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 'workout-1', type: 'strength' },
          { id: 'workout-2', type: 'cardio' },
        ],
      });
    });

    it('should return 400 when date is missing', async () => {
      // Arrange
      mockReq.query = {};

      // Act
      await workoutController.getWorkoutsByDate(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Date is required' },
      });
    });

    it('should return 500 when repository throws error', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };
      mockWorkoutRepository.findByDate.mockRejectedValue(new Error('Database error'));

      // Act
      await workoutController.getWorkoutsByDate(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('getWorkoutById', () => {
    it('should get workout by id successfully', async () => {
      // Arrange
      mockReq.params = { id: 'workout-123' };

      const mockWorkout = {
        id: 'workout-123',
        type: 'strength',
        toJSON: jest.fn().mockReturnValue({
          id: 'workout-123',
          type: 'strength',
        }),
      };

      mockWorkoutRepository.findById.mockResolvedValue(mockWorkout);

      // Act
      await workoutController.getWorkoutById(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findById).toHaveBeenCalledWith('workout-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'workout-123' }),
      });
    });

    it('should return 500 when workout not found', async () => {
      // Arrange
      mockReq.params = { id: 'non-existent' };
      mockWorkoutRepository.findById.mockRejectedValue(new Error('Workout not found'));

      // Act
      await workoutController.getWorkoutById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Workout not found' },
      });
    });
  });

  describe('updateWorkout', () => {
    const updateData = {
      type: 'cardio',
      exercises: [{ name: 'Running', sets: 1, reps: 1, duration: 1800 }],
      duration: 1800,
      caloriesBurned: 300,
      notes: 'Cardio session',
    };

    it('should update workout successfully', async () => {
      // Arrange
      mockReq.params = { id: 'workout-123' };
      mockReq.body = { ...updateData };

      const mockWorkout = {
        id: 'workout-123',
        ...updateData,
        toJSON: jest.fn().mockReturnValue({
          id: 'workout-123',
          ...updateData,
        }),
      };

      mockWorkoutRepository.update.mockResolvedValue(mockWorkout);

      // Act
      await workoutController.updateWorkout(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.update).toHaveBeenCalledWith(
        'workout-123',
        'user-123',
        updateData
      );
      expect(mockCacheService.invalidateWorkoutCache).toHaveBeenCalledWith(
        'user-123',
        'workout-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Workout updated successfully',
        data: expect.objectContaining({ id: 'workout-123' }),
      });
    });

    it('should return 500 when update fails', async () => {
      // Arrange
      mockReq.params = { id: 'workout-123' };
      mockReq.body = { ...updateData };
      mockWorkoutRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act
      await workoutController.updateWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Update failed' },
      });
    });
  });

  describe('deleteWorkout', () => {
    it('should delete workout successfully', async () => {
      // Arrange
      mockReq.params = { id: 'workout-123' };

      const mockWorkout = {
        id: 'workout-123',
        toJSON: jest.fn().mockReturnValue({ id: 'workout-123' }),
      };

      mockWorkoutRepository.delete.mockResolvedValue(mockWorkout);

      // Act
      await workoutController.deleteWorkout(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.delete).toHaveBeenCalledWith('workout-123', 'user-123');
      expect(mockCacheService.invalidateWorkoutCache).toHaveBeenCalledWith(
        'user-123',
        'workout-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Workout deleted successfully',
        data: expect.objectContaining({ id: 'workout-123' }),
      });
    });

    it('should return 500 when delete fails', async () => {
      // Arrange
      mockReq.params = { id: 'workout-123' };
      mockWorkoutRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Act
      await workoutController.deleteWorkout(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Delete failed' },
      });
    });
  });

  describe('getWorkoutsPaginated', () => {
    it('should return paginated workouts successfully', async () => {
      // Arrange
      mockReq.query = { limit: '10', cursor: '2025-11-05T10:00:00Z', sortOrder: 'desc' };

      const paginatedResult = {
        items: [
          { id: 'workout-1', toJSON: jest.fn().mockReturnValue({ id: 'workout-1' }) },
          { id: 'workout-2', toJSON: jest.fn().mockReturnValue({ id: 'workout-2' }) },
        ],
        hasMore: true,
        nextCursor: '2025-11-04T10:00:00Z',
        metadata: { total: 50 },
      };

      mockWorkoutRepository.findPaginated.mockResolvedValue(paginatedResult);

      // Act
      await workoutController.getWorkoutsPaginated(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findPaginated).toHaveBeenCalledWith('user-123', {
        limit: 10,
        cursor: '2025-11-05T10:00:00Z',
        sortOrder: 'desc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [{ id: 'workout-1' }, { id: 'workout-2' }],
          hasMore: true,
          nextCursor: '2025-11-04T10:00:00Z',
          metadata: { total: 50 },
        },
      });
    });

    it('should use default values when not provided', async () => {
      // Arrange
      mockReq.query = {};

      const paginatedResult = {
        items: [],
        hasMore: false,
        nextCursor: null,
        metadata: {},
      };

      mockWorkoutRepository.findPaginated.mockResolvedValue(paginatedResult);

      // Act
      await workoutController.getWorkoutsPaginated(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findPaginated).toHaveBeenCalledWith('user-123', {
        limit: 20,
        cursor: undefined,
        sortOrder: 'desc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when error occurs', async () => {
      // Arrange
      mockReq.query = {};
      mockWorkoutRepository.findPaginated.mockRejectedValue(new Error('Pagination error'));

      // Act
      await workoutController.getWorkoutsPaginated(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Pagination error' },
      });
    });
  });

  describe('getWorkoutsByPage', () => {
    it('should return page-based workouts successfully', async () => {
      // Arrange
      mockReq.query = { page: '2', limit: '15', sortBy: 'date', sortOrder: 'asc' };

      const pageResult = {
        items: [{ id: 'workout-1', toJSON: jest.fn().mockReturnValue({ id: 'workout-1' }) }],
        pagination: {
          currentPage: 2,
          totalPages: 5,
          totalItems: 75,
          itemsPerPage: 15,
        },
      };

      mockWorkoutRepository.findByPage.mockResolvedValue(pageResult);

      // Act
      await workoutController.getWorkoutsByPage(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findByPage).toHaveBeenCalledWith('user-123', {
        page: 2,
        limit: 15,
        sortBy: 'date',
        sortOrder: 'asc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [{ id: 'workout-1' }],
          pagination: expect.objectContaining({
            currentPage: 2,
            totalPages: 5,
          }),
        },
      });
    });

    it('should use default values when not provided', async () => {
      // Arrange
      mockReq.query = {};

      const pageResult = {
        items: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 },
      };

      mockWorkoutRepository.findByPage.mockResolvedValue(pageResult);

      // Act
      await workoutController.getWorkoutsByPage(mockReq, mockRes);

      // Assert
      expect(mockWorkoutRepository.findByPage).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when error occurs', async () => {
      // Arrange
      mockReq.query = {};
      mockWorkoutRepository.findByPage.mockRejectedValue(new Error('Page error'));

      // Act
      await workoutController.getWorkoutsByPage(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Page error' },
      });
    });
  });
});
