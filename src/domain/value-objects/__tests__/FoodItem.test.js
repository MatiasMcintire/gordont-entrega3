import { FoodItem } from '../FoodItem.js';

describe('FoodItem Value Object', () => {
  describe('creation', () => {
    it('should create valid FoodItem', () => {
      const food = new FoodItem({
        name: 'Manzana',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3
      });

      expect(food.name).toBe('Manzana');
      expect(food.calories).toBe(95);
      expect(food.quantity).toBe(100);
    });

    it('should reject invalid name', () => {
      expect(() => {
        new FoodItem({
          name: 'A',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3
        });
      }).toThrow();
    });

    it('should reject negative calories', () => {
      expect(() => {
        new FoodItem({
          name: 'Food',
          calories: -100,
          protein: 0.5,
          carbs: 25,
          fat: 0.3
        });
      }).toThrow();
    });

    it('should reject invalid quantity', () => {
      expect(() => {
        new FoodItem({
          name: 'Food',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          quantity: 0
        });
      }).toThrow();

      expect(() => {
        new FoodItem({
          name: 'Food',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          quantity: 10001
        });
      }).toThrow();
    });
  });

  describe('getMacros', () => {
    it('should calculate macros correctly', () => {
      const food = new FoodItem({
        name: 'Huevo',
        calories: 155,
        protein: 13,
        carbs: 1.1,
        fat: 11,
        quantity: 100
      });

      const macros = food.getMacros();

      expect(macros.calories).toBe(155);
      expect(macros.protein).toBe(13);
    });

    it('should apply quantity multiplier', () => {
      const food = new FoodItem({
        name: 'Arroz',
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        quantity: 150
      });

      const macros = food.getMacros();

      expect(macros.calories).toBe(195);
      expect(macros.protein).toBeCloseTo(4.05, 1);
    });
  });

  describe('equals', () => {
    it('should identify equal FoodItems', () => {
      const food1 = new FoodItem({
        name: 'Manzana',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        quantity: 100
      });

      const food2 = new FoodItem({
        name: 'Manzana',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        quantity: 100
      });

      expect(food1.equals(food2)).toBe(true);
    });

    it('should identify different FoodItems', () => {
      const food1 = new FoodItem({
        name: 'Manzana',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3
      });

      const food2 = new FoodItem({
        name: 'Banana',
        calories: 89,
        protein: 1.1,
        carbs: 23,
        fat: 0.3
      });

      expect(food1.equals(food2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return proper JSON', () => {
      const food = new FoodItem({
        name: 'Apple',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        quantity: 150
      });

      const json = food.toJSON();

      expect(json.name).toBe('Apple');
      expect(json.quantity).toBe(150);
    });
  });
});