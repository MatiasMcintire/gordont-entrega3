/**
 * Entity: Entry (Registro de comida)
 * Representa el dominio de negocio - sin dependencias externas
 * Contiene lógica de negocio pura
 */
export class Entry {
  constructor({
    id,
    userId,
    date,
    mealType,
    foods,
    notes,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.userId = userId;
    this.date = date;
    this.mealType = mealType;
    this.foods = foods; // Array de FoodItem
    this.notes = notes || '';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Lógica de negocio: Calcular macros totales
   * ESTA ES LA LÓGICA DE NEGOCIO PURA
   */
  calculateMacros() {
    const macros = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    };

    this.foods.forEach((food) => {
      const quantity = food.quantity / 100;
      macros.totalCalories += food.calories * quantity;
      macros.totalProtein += food.protein * quantity;
      macros.totalCarbs += food.carbs * quantity;
      macros.totalFat += food.fat * quantity;
    });

    return macros;
  }

  /**
   * Validación de negocio
   */
  isValid() {
    if (!this.userId) return false;
    if (!this.date) return false;
    if (!this.mealType) return false;
    if (!Array.isArray(this.foods) || this.foods.length === 0) return false;
    return true;
  }

  /**
   * Validar que sea fecha válida (no futuro)
   */
  isDateValid() {
    return this.date <= new Date();
  }

  /**
   * Validar tipo de comida
   */
  isValidMealType() {
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    return validTypes.includes(this.mealType);
  }

  /**
   * Marcar como actualizado
   */
  markAsUpdated() {
    this.updatedAt = new Date();
  }

  /**
   * Convertir a JSON (sin métodos)
   */
  toJSON() {
    const macros = this.calculateMacros();
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      mealType: this.mealType,
      foods: this.foods,
      notes: this.notes,
      ...macros,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}