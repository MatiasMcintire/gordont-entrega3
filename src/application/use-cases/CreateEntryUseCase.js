import { Entry } from '../../domain/entities/Entry.js';
import { FoodItem } from '../../domain/value-objects/FoodItem.js';
import { ValidationError } from '../../shared/errors/AppError.js';
import logger from '../../shared/logger/logger.js';

/**
 * Use Case: Create Entry
 * Crear un nuevo entry de comida
 */
export class CreateEntryUseCase {
  constructor(entryRepository) {
    this.entryRepository = entryRepository;
  }

  async execute(userId, dto) {
    try {
      this.validateInput(dto);

      const foods = dto.foods.map(
        (food) =>
          new FoodItem({
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            quantity: food.quantity || 100
          })
      );

      const entry = new Entry({
        userId,
        date: new Date(dto.date),
        mealType: dto.mealType,
        foods,
        notes: dto.notes || ''
      });

      if (!entry.isValid()) {
        throw new ValidationError('Invalid entry data');
      }

      if (!entry.isDateValid()) {
        throw new ValidationError('Entry date cannot be in the future');
      }

      if (!entry.isValidMealType()) {
        throw new ValidationError(
          'Invalid meal type. Must be: breakfast, lunch, dinner, or snack'
        );
      }

      const savedEntry = await this.entryRepository.create(entry);

      logger.info('Entry created successfully', {
        userId,
        entryId: savedEntry.id,
        mealType: dto.mealType
      });

      return savedEntry;
    } catch (error) {
      logger.error('Error creating entry', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  validateInput(dto) {
    if (!dto.date) {
      throw new ValidationError('Date is required');
    }

    if (!dto.mealType) {
      throw new ValidationError('Meal type is required');
    }

    if (!dto.foods || !Array.isArray(dto.foods) || dto.foods.length === 0) {
      throw new ValidationError('At least one food item is required');
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(dto.mealType)) {
      throw new ValidationError(
        `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`
      );
    }
  }
}