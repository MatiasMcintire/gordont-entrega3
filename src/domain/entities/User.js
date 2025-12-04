/**
 * Entity: User
 * Representa un usuario del sistema con información de fitness
 */
export class User {
  constructor({
    id,
    email,
    name,
    passwordHash,
    weight,
    height,
    age,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.passwordHash = passwordHash;
    this.weight = weight; // kg
    this.height = height; // cm
    this.age = age;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Validar que el email sea válido
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar que la contraseña sea segura
   * Mínimo 8 caracteres, mayúscula, minúscula, número
   */
  static isValidPassword(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
  }

  /**
   * Calcular IMC (Índice de Masa Corporal)
   * IMC = weight (kg) / (height (m))^2
   */
  calculateBMI() {
    if (!this.weight || !this.height) return null;
    const heightInMeters = this.height / 100;
    return parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }

  /**
   * Validar que todos los campos requeridos estén presentes
   */
  isValid() {
    return (
      this.email &&
      this.name &&
      this.passwordHash &&
      this.weight &&
      this.height &&
      this.age
    );
  }

  /**
   * Convertir a JSON para respuestas
   * NO incluye passwordHash por seguridad
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      weight: this.weight,
      height: this.height,
      age: this.age,
      bmi: this.calculateBMI(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}