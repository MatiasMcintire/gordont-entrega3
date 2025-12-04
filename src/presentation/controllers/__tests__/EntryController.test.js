import { jest } from '@jest/globals';
import { EntryController } from '../EntryController.js';

// Mock de logger
jest.mock('../../../shared/logger/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EntryController', () => {
  let entryController;
  let mockEntryRepository;
  let mockCacheService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock del EntryRepository
    mockEntryRepository = {
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
      invalidateEntryCache: jest.fn().mockResolvedValue(true),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(true),
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
    entryController = new EntryController(mockEntryRepository, mockCacheService);
  });

  describe('createEntry', () => {
    const validEntryData = {
      date: '2025-11-05',
      mealType: 'breakfast',
      foods: [{ name: 'Avena', calories: 150, protein: 5, carbs: 27, fat: 3, quantity: 100 }],
      notes: 'Desayuno saludable',
    };

    it('should create entry successfully', async () => {
      // Arrange
      mockReq.body = { ...validEntryData };

      const mockEntry = {
        id: 'entry-123',
        userId: 'user-123',
        ...validEntryData,
        toJSON: jest.fn().mockReturnValue({
          id: 'entry-123',
          userId: 'user-123',
          ...validEntryData,
        }),
      };

      mockEntryRepository.create.mockResolvedValue(mockEntry);

      // Act
      await entryController.createEntry(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        date: new Date('2025-11-05'),
        mealType: 'breakfast',
        foods: validEntryData.foods,
        notes: 'Desayuno saludable',
      });
      expect(mockCacheService.invalidateEntryCache).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Entry created successfully',
        data: expect.objectContaining({
          id: 'entry-123',
          userId: 'user-123',
        }),
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = { date: '2025-11-05' }; // Faltan campos

      // Act
      await entryController.createEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing required fields: date, mealType, foods' },
      });
      expect(mockEntryRepository.create).not.toHaveBeenCalled();
    });

    it('should return 400 when userId is missing', async () => {
      // Arrange
      mockReq.user = null; // Sin usuario autenticado
      mockReq.body = { ...validEntryData };

      // Act
      await entryController.createEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Missing required fields: date, mealType, foods' },
      });
    });

    it('should return 500 when repository throws error', async () => {
      // Arrange
      mockReq.body = { ...validEntryData };
      mockEntryRepository.create.mockRejectedValue(new Error('Database error'));

      // Act
      await entryController.createEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });

    it('should work without cache service', async () => {
      // Arrange
      entryController = new EntryController(mockEntryRepository, null);
      mockReq.body = { ...validEntryData };

      const mockEntry = {
        id: 'entry-123',
        toJSON: jest.fn().mockReturnValue({ id: 'entry-123' }),
      };
      mockEntryRepository.create.mockResolvedValue(mockEntry);

      // Act
      await entryController.createEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // No debe fallar sin cache service
    });
  });

  describe('getEntriesByDate', () => {
    it('should get entries by date successfully', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };

      const mockEntries = [
        {
          id: 'entry-1',
          date: '2025-11-05',
          mealType: 'breakfast',
          toJSON: jest.fn().mockReturnValue({ id: 'entry-1', mealType: 'breakfast' }),
        },
        {
          id: 'entry-2',
          date: '2025-11-05',
          mealType: 'lunch',
          toJSON: jest.fn().mockReturnValue({ id: 'entry-2', mealType: 'lunch' }),
        },
      ];

      mockEntryRepository.findByDate.mockResolvedValue(mockEntries);

      // Act
      await entryController.getEntriesByDate(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findByDate).toHaveBeenCalledWith(
        'user-123',
        new Date('2025-11-05')
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 'entry-1', mealType: 'breakfast' },
          { id: 'entry-2', mealType: 'lunch' },
        ],
      });
    });

    it('should return 400 when date is missing', async () => {
      // Arrange
      mockReq.query = {}; // Sin date

      // Act
      await entryController.getEntriesByDate(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Date is required' },
      });
      expect(mockEntryRepository.findByDate).not.toHaveBeenCalled();
    });

    it('should return 500 when repository throws error', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };
      mockEntryRepository.findByDate.mockRejectedValue(new Error('Database error'));

      // Act
      await entryController.getEntriesByDate(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('getEntryById', () => {
    it('should get entry by id successfully', async () => {
      // Arrange
      mockReq.params = { id: 'entry-123' };

      const mockEntry = {
        id: 'entry-123',
        userId: 'user-123',
        mealType: 'breakfast',
        toJSON: jest.fn().mockReturnValue({
          id: 'entry-123',
          userId: 'user-123',
          mealType: 'breakfast',
        }),
      };

      mockEntryRepository.findById.mockResolvedValue(mockEntry);

      // Act
      await entryController.getEntryById(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findById).toHaveBeenCalledWith('entry-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'entry-123',
          mealType: 'breakfast',
        }),
      });
    });

    it('should return 500 when entry not found', async () => {
      // Arrange
      mockReq.params = { id: 'non-existent' };
      mockEntryRepository.findById.mockRejectedValue(new Error('Entry not found'));

      // Act
      await entryController.getEntryById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Entry not found' },
      });
    });
  });

  describe('updateEntry', () => {
    const updateData = {
      mealType: 'lunch',
      foods: [{ name: 'Pollo', calories: 200, protein: 30, carbs: 0, fat: 8, quantity: 150 }],
      notes: 'Almuerzo actualizado',
    };

    it('should update entry successfully', async () => {
      // Arrange
      mockReq.params = { id: 'entry-123' };
      mockReq.body = { ...updateData };

      const mockEntry = {
        id: 'entry-123',
        ...updateData,
        toJSON: jest.fn().mockReturnValue({
          id: 'entry-123',
          ...updateData,
        }),
      };

      mockEntryRepository.update.mockResolvedValue(mockEntry);

      // Act
      await entryController.updateEntry(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.update).toHaveBeenCalledWith('entry-123', 'user-123', updateData);
      expect(mockCacheService.invalidateEntryCache).toHaveBeenCalledWith('user-123', 'entry-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Entry updated successfully',
        data: expect.objectContaining({
          id: 'entry-123',
          mealType: 'lunch',
        }),
      });
    });

    it('should return 500 when update fails', async () => {
      // Arrange
      mockReq.params = { id: 'entry-123' };
      mockReq.body = { ...updateData };
      mockEntryRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act
      await entryController.updateEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Update failed' },
      });
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry successfully', async () => {
      // Arrange
      mockReq.params = { id: 'entry-123' };

      const mockEntry = {
        id: 'entry-123',
        toJSON: jest.fn().mockReturnValue({ id: 'entry-123' }),
      };

      mockEntryRepository.delete.mockResolvedValue(mockEntry);

      // Act
      await entryController.deleteEntry(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.delete).toHaveBeenCalledWith('entry-123', 'user-123');
      expect(mockCacheService.invalidateEntryCache).toHaveBeenCalledWith('user-123', 'entry-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Entry deleted successfully',
        data: expect.objectContaining({ id: 'entry-123' }),
      });
    });

    it('should return 500 when delete fails', async () => {
      // Arrange
      mockReq.params = { id: 'entry-123' };
      mockEntryRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Act
      await entryController.deleteEntry(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Delete failed' },
      });
    });
  });

  describe('getDailyStats', () => {
    it('should return stats from cache if available', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };

      const cachedStats = {
        date: '2025-11-05',
        totalEntries: 3,
        totalCalories: 1500,
      };

      mockCacheService.get.mockResolvedValue(cachedStats);

      // Act
      await entryController.getDailyStats(mockReq, mockRes);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith('stats:daily:user-123:2025-11-05');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: cachedStats,
        cached: true,
      });
      expect(mockEntryRepository.findByDate).not.toHaveBeenCalled();
    });

    it('should calculate stats when cache miss', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };
      mockCacheService.get.mockResolvedValue(null); // Cache miss

      const mockEntries = [
        {
          mealType: 'breakfast',
          totalCalories: 500,
          totalProtein: 20,
          totalCarbs: 60,
          totalFat: 15,
        },
        {
          mealType: 'lunch',
          totalCalories: 700,
          totalProtein: 35,
          totalCarbs: 80,
          totalFat: 20,
        },
      ];

      mockEntryRepository.findByDate.mockResolvedValue(mockEntries);

      // Act
      await entryController.getDailyStats(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findByDate).toHaveBeenCalledWith(
        'user-123',
        new Date('2025-11-05')
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'stats:daily:user-123:2025-11-05',
        expect.objectContaining({
          date: '2025-11-05',
          totalEntries: 2,
          totalCalories: 1200,
          totalProtein: 55,
          totalCarbs: 140,
          totalFat: 35,
        }),
        300
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalEntries: 2,
          totalCalories: 1200,
        }),
        cached: false,
      });
    });

    it('should return 400 when date is missing', async () => {
      // Arrange
      mockReq.query = {}; // Sin date

      // Act
      await entryController.getDailyStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Date is required' },
      });
    });

    it('should return 500 when error occurs', async () => {
      // Arrange
      mockReq.query = { date: '2025-11-05' };
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      await entryController.getDailyStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Cache error' },
      });
    });
  });

  describe('getEntriesPaginated', () => {
    it('should return paginated entries successfully', async () => {
      // Arrange
      mockReq.query = { limit: '10', cursor: '2025-11-05T10:00:00Z', sortOrder: 'desc' };

      const paginatedResult = {
        items: [
          { id: 'entry-1', toJSON: jest.fn().mockReturnValue({ id: 'entry-1' }) },
          { id: 'entry-2', toJSON: jest.fn().mockReturnValue({ id: 'entry-2' }) },
        ],
        hasMore: true,
        nextCursor: '2025-11-04T10:00:00Z',
        metadata: { total: 50 },
      };

      mockEntryRepository.findPaginated.mockResolvedValue(paginatedResult);

      // Act
      await entryController.getEntriesPaginated(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findPaginated).toHaveBeenCalledWith('user-123', {
        limit: 10,
        cursor: '2025-11-05T10:00:00Z',
        sortOrder: 'desc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [{ id: 'entry-1' }, { id: 'entry-2' }],
          hasMore: true,
          nextCursor: '2025-11-04T10:00:00Z',
          metadata: { total: 50 },
        },
      });
    });

    it('should use default values when not provided', async () => {
      // Arrange
      mockReq.query = {}; // Sin parámetros

      const paginatedResult = {
        items: [],
        hasMore: false,
        nextCursor: null,
        metadata: {},
      };

      mockEntryRepository.findPaginated.mockResolvedValue(paginatedResult);

      // Act
      await entryController.getEntriesPaginated(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findPaginated).toHaveBeenCalledWith('user-123', {
        limit: 20, // Default
        cursor: undefined,
        sortOrder: 'desc', // Default
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when error occurs', async () => {
      // Arrange
      mockReq.query = {};
      mockEntryRepository.findPaginated.mockRejectedValue(new Error('Pagination error'));

      // Act
      await entryController.getEntriesPaginated(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Pagination error' },
      });
    });
  });

  describe('getEntriesByPage', () => {
    it('should return page-based entries successfully', async () => {
      // Arrange
      mockReq.query = { page: '2', limit: '15', sortBy: 'date', sortOrder: 'asc' };

      const pageResult = {
        items: [{ id: 'entry-1', toJSON: jest.fn().mockReturnValue({ id: 'entry-1' }) }],
        pagination: {
          currentPage: 2,
          totalPages: 5,
          totalItems: 75,
          itemsPerPage: 15,
        },
      };

      mockEntryRepository.findByPage.mockResolvedValue(pageResult);

      // Act
      await entryController.getEntriesByPage(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findByPage).toHaveBeenCalledWith('user-123', {
        page: 2,
        limit: 15,
        sortBy: 'date',
        sortOrder: 'asc',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [{ id: 'entry-1' }],
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

      mockEntryRepository.findByPage.mockResolvedValue(pageResult);

      // Act
      await entryController.getEntriesByPage(mockReq, mockRes);

      // Assert
      expect(mockEntryRepository.findByPage).toHaveBeenCalledWith('user-123', {
        page: 1, // Default
        limit: 20, // Default
        sortBy: 'createdAt', // Default
        sortOrder: 'desc', // Default
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when error occurs', async () => {
      // Arrange
      mockReq.query = {};
      mockEntryRepository.findByPage.mockRejectedValue(new Error('Page error'));

      // Act
      await entryController.getEntriesByPage(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Page error' },
      });
    });
  });
});
