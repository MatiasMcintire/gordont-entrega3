import { jest } from '@jest/globals';
import { MongoEntryRepository } from '../MongoEntryRepository.js';
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

describe('MongoEntryRepository', () => {
  let entryRepository;
  let mockEntryModel;
  let mockEntry;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock de EntryModel
    mockEntryModel = jest.fn();
    mockEntryModel.findById = jest.fn();
    mockEntryModel.find = jest.fn();
    mockEntryModel.findOneAndUpdate = jest.fn();
    mockEntryModel.findOneAndDelete = jest.fn();
    mockEntryModel.countDocuments = jest.fn();

    // Mock entry data
    mockEntry = {
      _id: 'entry-123',
      userId: 'user-123',
      date: new Date('2025-11-05'),
      mealType: 'breakfast',
      foods: [{ name: 'Eggs', quantity: 2, calories: 140, protein: 12, carbs: 1, fat: 10 }],
      notes: 'Test entry',
      totalCalories: 140,
      totalProtein: 12,
      totalCarbs: 1,
      totalFat: 10,
      createdAt: new Date('2025-11-05'),
      updatedAt: new Date('2025-11-05'),
    };

    // Crear instancia del repositorio
    entryRepository = new MongoEntryRepository(mockEntryModel);
  });

  describe('create', () => {
    it('should create entry successfully', async () => {
      // Arrange
      const entryData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        mealType: 'breakfast',
        foods: [{ name: 'Eggs', quantity: 2, calories: 140, protein: 12, carbs: 1, fat: 10 }],
        notes: 'Test entry',
      };

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockMongoEntry = { ...mockEntry, save: mockSave };

      mockEntryModel.mockImplementation(() => mockMongoEntry);

      // Act
      const result = await entryRepository.create(entryData);

      // Assert
      expect(mockEntryModel).toHaveBeenCalledWith({
        userId: entryData.userId,
        date: entryData.date,
        mealType: entryData.mealType,
        foods: entryData.foods,
        notes: entryData.notes,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result.id).toBe('entry-123');
      expect(result.userId).toBe('user-123');
    });

    it('should create entry with empty notes if not provided', async () => {
      // Arrange
      const entryData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        mealType: 'lunch',
        foods: [],
      };

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockMongoEntry = { ...mockEntry, notes: '', save: mockSave };

      mockEntryModel.mockImplementation(() => mockMongoEntry);

      // Act
      const result = await entryRepository.create(entryData);

      // Assert
      expect(mockEntryModel).toHaveBeenCalledWith(expect.objectContaining({ notes: '' }));
    });

    it('should throw error when creation fails', async () => {
      // Arrange
      const entryData = {
        userId: 'user-123',
        date: new Date('2025-11-05'),
        mealType: 'breakfast',
        foods: [],
      };

      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockEntryModel.mockImplementation(() => ({ save: mockSave }));

      // Act & Assert
      await expect(entryRepository.create(entryData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find entry by ID successfully', async () => {
      // Arrange
      mockEntryModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEntry),
      });

      // Act
      const result = await entryRepository.findById('entry-123');

      // Assert
      expect(mockEntryModel.findById).toHaveBeenCalledWith('entry-123');
      expect(result.id).toBe('entry-123');
      expect(result.mealType).toBe('breakfast');
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      // Arrange
      mockEntryModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(entryRepository.findById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByDate', () => {
    it('should find entries by date successfully', async () => {
      // Arrange
      const date = new Date('2025-11-05');
      const entries = [mockEntry, { ...mockEntry, _id: 'entry-456' }];

      mockEntryModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(entries),
      });

      // Act
      const result = await entryRepository.findByDate('user-123', date);

      // Assert
      expect(mockEntryModel.find).toHaveBeenCalledWith({
        userId: 'user-123',
        date: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('entry-123');
    });

    it('should return empty array when no entries found', async () => {
      // Arrange
      mockEntryModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await entryRepository.findByDate('user-123', new Date('2025-11-05'));

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated entries with cursor', async () => {
      // Arrange
      const entries = Array(21)
        .fill(null)
        .map((_, i) => ({
          ...mockEntry,
          _id: `entry-${i}`,
          createdAt: new Date(`2025-11-0${5 + i}`),
        }));

      mockEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(entries),
          }),
        }),
      });

      // Act
      const result = await entryRepository.findPaginated('user-123', { limit: 20 });

      // Assert
      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
      expect(result.metadata.count).toBe(20);
    });

    it('should handle cursor-based pagination', async () => {
      // Arrange
      const entries = [mockEntry];
      mockEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(entries),
          }),
        }),
      });

      const cursor = new Date('2025-11-05').toISOString();

      // Act
      const result = await entryRepository.findPaginated('user-123', { limit: 20, cursor });

      // Assert
      expect(mockEntryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({ $lt: expect.any(Date) }),
        })
      );
      expect(result.hasMore).toBe(false);
    });

    it('should support ascending sort order', async () => {
      // Arrange
      mockEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockEntry]),
          }),
        }),
      });

      // Act
      await entryRepository.findPaginated('user-123', { sortOrder: 'asc' });

      // Assert
      expect(mockEntryModel.find().sort).toHaveBeenCalledWith({ createdAt: 1 });
    });
  });

  describe('findByPage', () => {
    it('should return page-based paginated entries', async () => {
      // Arrange
      const entries = [mockEntry, { ...mockEntry, _id: 'entry-456' }];

      mockEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(entries),
            }),
          }),
        }),
      });

      mockEntryModel.countDocuments.mockResolvedValue(10);

      // Act
      const result = await entryRepository.findByPage('user-123', { page: 1, limit: 5 });

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
      mockEntryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      mockEntryModel.countDocuments.mockResolvedValue(0);

      // Act
      await entryRepository.findByPage('user-123', {
        page: 2,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'asc',
      });

      // Assert
      expect(mockEntryModel.find().sort).toHaveBeenCalledWith({ date: 1 });
      expect(mockEntryModel.find().sort().skip).toHaveBeenCalledWith(10);
    });
  });

  describe('update', () => {
    it('should update entry successfully', async () => {
      // Arrange
      const updateData = { notes: 'Updated notes' };
      const updatedEntry = { ...mockEntry, notes: 'Updated notes' };

      mockEntryModel.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedEntry),
      });

      // Act
      const result = await entryRepository.update('entry-123', 'user-123', updateData);

      // Assert
      expect(mockEntryModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'entry-123', userId: 'user-123' },
        expect.objectContaining({ notes: 'Updated notes' }),
        { new: true, runValidators: true }
      );
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      // Arrange
      mockEntryModel.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        entryRepository.update('non-existent-id', 'user-123', { notes: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete entry successfully', async () => {
      // Arrange
      mockEntryModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEntry),
      });

      // Act
      const result = await entryRepository.delete('entry-123', 'user-123');

      // Assert
      expect(mockEntryModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'entry-123',
        userId: 'user-123',
      });
      expect(result.id).toBe('entry-123');
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      // Arrange
      mockEntryModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(entryRepository.delete('non-existent-id', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('mapToDomain', () => {
    it('should map MongoDB entry to domain entry correctly', () => {
      // Act
      const result = entryRepository.mapToDomain(mockEntry);

      // Assert
      expect(result.id).toBe(mockEntry._id);
      expect(result.userId).toBe(mockEntry.userId);
      expect(result.mealType).toBe(mockEntry.mealType);
      expect(result.foods).toEqual(mockEntry.foods);
      expect(result).toHaveProperty('toJSON');
    });

    it('should include all fields in toJSON', () => {
      // Act
      const result = entryRepository.mapToDomain(mockEntry);
      const json = result.toJSON();

      // Assert
      expect(json.id).toBe(mockEntry._id);
      expect(json.totalCalories).toBe(140);
      expect(json.totalProtein).toBe(12);
      expect(json.foods).toEqual(mockEntry.foods);
    });
  });
});
