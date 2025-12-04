/**
 * Interface de Repository para Entry
 * Define el contrato que CUALQUIER implementación debe cumplir
 * Esto es importante para Dependency Injection
 */
export class IEntryRepository {
  async create(entry) {
    throw new Error('Method not implemented');
  }

  async findById(id, userId) {
    throw new Error('Method not implemented');
  }

  async findByDate(userId, date) {
    throw new Error('Method not implemented');
  }

  async findByDateRange(userId, startDate, endDate) {
    throw new Error('Method not implemented');
  }

  async update(id, userId, data) {
    throw new Error('Method not implemented');
  }

  async delete(id, userId) {
    throw new Error('Method not implemented');
  }
}