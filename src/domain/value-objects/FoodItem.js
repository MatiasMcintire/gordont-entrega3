/**
 * Value Object: FoodItem
 * No tiene identidad, es immutable
 * Solo representa valores
 */
export class FoodItem {
  constructor({ name, calories, protein, carbs, fat, quantity = 100 }) {
    if (!name || name.length < 2) {
      throw new Error('Food name must be at least 2 characters');
    }
    if (calories < 0) {
      throw new Error('Calories must be non-negative');
    }
    if (protein < 0) {
      throw new Error('Protein must be non-negative');
    }
    if (carbs < 0) {
      throw new Error('Carbs must be non-negative');
    }
    if (fat < 0) {
      throw new Error('Fat must be non-negative');
    }
    if (quantity < 1 || quantity > 10000) {
      throw new Error('Quantity must be between 1 and 10000 grams');
    }

    this.name = name;
    this.calories = calories;
    this.protein = protein;
    this.carbs = carbs;
    this.fat = fat;
    this.quantity = quantity;
  }

  /**
   * Calcular macros para este alimento específico
   */
  getMacros() {
    const quantity = this.quantity / 100;
    return {
      calories: this.calories * quantity,
      protein: this.protein * quantity,
      carbs: this.carbs * quantity,
      fat: this.fat * quantity
    };
  }

  /**
   * Equality check
   */
  equals(other) {
    return (
      this.name === other.name &&
      this.calories === other.calories &&
      this.protein === other.protein &&
      this.carbs === other.carbs &&
      this.fat === other.fat &&
      this.quantity === other.quantity
    );
  }

  toJSON() {
    return {
      name: this.name,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fat: this.fat,
      quantity: this.quantity
    };
  }
}