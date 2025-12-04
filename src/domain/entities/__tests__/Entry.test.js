import { Entry } from '../Entry.js';
import { FoodItem } from '../../value-objects/FoodItem.js';

describe('Entry Entity', () => {
  let testEntry;
  let testFoods;

  beforeEach(() => {
    testFoods = [
      new FoodItem({
        name: 'Huevo',
        calories: 155,
        protein: 13,
        carbs: 1.1,
        fat: 11,
        quantity: 100
      })
    ];

    testEntry = new Entry({
      id: '1',
      userId: 'user123',
      date: new Date('2025-10-31'),
      mealType: 'breakfast',
      foods: testFoods,
      notes: 'Test entry'
    });
  });

  describe('calculateMacros', () => {
    it('should calculate macros correctly', () => {
      const macros = testEntry.calculateMacros();

      expect(macros.totalCalories).toBe(155);
      expect(macros.totalProtein).toBe(13);
      expect(macros.totalCarbs).toBeCloseTo(1.1, 1);
      expect(macros.totalFat).toBe(11);
    });

    it('should calculate with multiple foods', () => {
      testEntry.foods.push(
        new FoodItem({
          name: 'Arroz',
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fat: 0.3,
          quantity: 150
        })
      );

      const macros = testEntry.calculateMacros();

      expect(macros.totalCalories).toBeCloseTo(155 + 130 * 1.5, 1);
      expect(macros.totalProtein).toBeCloseTo(13 + 2.7 * 1.5, 1);
    });
  });

  describe('isValid', () => {
    it('should return true for valid entry', () => {
      expect(testEntry.isValid()).toBe(true);
    });

    it('should return false without userId', () => {
      testEntry.userId = null;
      expect(testEntry.isValid()).toBe(false);
    });

    it('should return false without foods', () => {
      testEntry.foods = [];
      expect(testEntry.isValid()).toBe(false);
    });
  });

  describe('isDateValid', () => {
    it('should accept past dates', () => {
      expect(testEntry.isDateValid()).toBe(true);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      testEntry.date = futureDate;

      expect(testEntry.isDateValid()).toBe(false);
    });
  });

  describe('isValidMealType', () => {
    it('should accept valid meal types', () => {
      const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

      validTypes.forEach((type) => {
        testEntry.mealType = type;
        expect(testEntry.isValidMealType()).toBe(true);
      });
    });

    it('should reject invalid meal type', () => {
      testEntry.mealType = 'invalid';
      expect(testEntry.isValidMealType()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return proper JSON format', () => {
      const json = testEntry.toJSON();

      expect(json.id).toBe('1');
      expect(json.userId).toBe('user123');
      expect(json.totalCalories).toBe(155);
      expect(json.foods).toBeDefined();
    });
  });
});