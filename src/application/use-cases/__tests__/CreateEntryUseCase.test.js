import { jest } from '@jest/globals';
import { CreateEntryUseCase } from '../CreateEntryUseCase.js';
import { ValidationError } from '../../../shared/errors/AppError.js';

describe('CreateEntryUseCase', () => {
  let useCase;
  let mockRepository;
  let userId;

  beforeEach(() => {
    userId = 'user123';
    mockRepository = {
      create: jest.fn()
    };
    useCase = new CreateEntryUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create entry successfully', async () => {
      const dto = {
        date: new Date('2025-10-31'),
        mealType: 'breakfast',
        foods: [
          {
            name: 'Huevo',
            calories: 155,
            protein: 13,
            carbs: 1.1,
            fat: 11,
            quantity: 100
          }
        ]
      };

      const mockEntry = {
        id: 'entry123',
        userId,
        ...dto,
        calculateMacros: () => ({
          totalCalories: 155,
          totalProtein: 13,
          totalCarbs: 1.1,
          totalFat: 11
        })
      };

      mockRepository.create.mockResolvedValue(mockEntry);

      const result = await useCase.execute(userId, dto);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const dto = {
        date: futureDate,
        mealType: 'breakfast',
        foods: [
          {
            name: 'Huevo',
            calories: 155,
            protein: 13,
            carbs: 1.1,
            fat: 11
          }
        ]
      };

      await expect(useCase.execute(userId, dto)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid meal type', async () => {
      const dto = {
        date: new Date('2025-10-31'),
        mealType: 'invalid',
        foods: [
          {
            name: 'Huevo',
            calories: 155,
            protein: 13,
            carbs: 1.1,
            fat: 11
          }
        ]
      };

      await expect(useCase.execute(userId, dto)).rejects.toThrow(ValidationError);
    });

    it('should reject empty foods', async () => {
      const dto = {
        date: new Date('2025-10-31'),
        mealType: 'breakfast',
        foods: []
      };

      await expect(useCase.execute(userId, dto)).rejects.toThrow(ValidationError);
    });
  });

  describe('validateInput', () => {
    it('should reject missing date', () => {
      const dto = {
        mealType: 'breakfast',
        foods: [{ name: 'Food', calories: 100, protein: 5, carbs: 10, fat: 5 }]
      };

      expect(() => useCase.validateInput(dto)).toThrow(ValidationError);
    });

    it('should reject missing mealType', () => {
      const dto = {
        date: new Date('2025-10-31'),
        foods: [{ name: 'Food', calories: 100, protein: 5, carbs: 10, fat: 5 }]
      };

      expect(() => useCase.validateInput(dto)).toThrow(ValidationError);
    });

    it('should reject missing foods', () => {
      const dto = {
        date: new Date('2025-10-31'),
        mealType: 'breakfast'
      };

      expect(() => useCase.validateInput(dto)).toThrow(ValidationError);
    });
  });
});