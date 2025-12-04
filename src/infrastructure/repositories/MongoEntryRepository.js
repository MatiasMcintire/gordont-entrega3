import { NotFoundError } from '../../shared/errors/AppError.js';
import logger from '../../shared/logger/logger.js';

export class MongoEntryRepository {
  constructor(EntryModel) {
    this.EntryModel = EntryModel;
  }

  async create(entry) {
    try {
      const mongoEntry = new this.EntryModel({
        userId: entry.userId,
        date: entry.date,
        mealType: entry.mealType,
        foods: entry.foods,
        notes: entry.notes || ''
      });

      await mongoEntry.save();
      logger.info('Entry created in MongoDB', { userId: entry.userId, entryId: mongoEntry._id });

      return this.mapToDomain(mongoEntry);
    } catch (error) {
      logger.error('Error creating entry in MongoDB', { error: error.message });
      throw error;
    }
  }

  async findById(id) {
    try {
      const entry = await this.EntryModel.findById(id).lean();

      if (!entry) {
        throw new NotFoundError('Entry', id);
      }

      return this.mapToDomain(entry);
    } catch (error) {
      logger.error('Error finding entry by ID', { entryId: id, error: error.message });
      throw error;
    }
  }

  async findByDate(userId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const entries = await this.EntryModel.find({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      return entries.map(e => this.mapToDomain(e));
    } catch (error) {
      logger.error('Error finding entries by date', { userId, date, error: error.message });
      throw error;
    }
  }

  /**
   * Cursor-based pagination for entries
   * More efficient than offset pagination for large datasets
   *
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Number of items per page (default: 20, max: 100)
   * @param {string} options.cursor - ISO date string to start from (for next page)
   * @param {string} options.sortOrder - 'asc' or 'desc' (default: 'desc')
   * @returns {Promise<Object>} - { items, hasMore, nextCursor }
   */
  async findPaginated(userId, { limit = 20, cursor = null, sortOrder = 'desc' } = {}) {
    try {
      // Build query
      const query = { userId };

      // If cursor is provided, add date filter
      if (cursor) {
        const cursorDate = new Date(cursor);
        query.createdAt = sortOrder === 'desc'
          ? { $lt: cursorDate }  // Get items BEFORE cursor (for desc order)
          : { $gt: cursorDate }; // Get items AFTER cursor (for asc order)
      }

      // Fetch limit + 1 to check if there are more items
      const entries = await this.EntryModel.find(query)
        .sort({ createdAt: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit + 1)
        .lean();

      // Check if there are more items
      const hasMore = entries.length > limit;

      // Remove the extra item if exists
      const items = hasMore ? entries.slice(0, limit) : entries;

      // Get next cursor (createdAt of last item)
      const nextCursor = hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null;

      logger.debug('Paginated entries fetched', {
        userId,
        limit,
        cursor,
        itemsReturned: items.length,
        hasMore
      });

      return {
        items: items.map(e => this.mapToDomain(e)),
        hasMore,
        nextCursor,
        // Metadata for debugging
        metadata: {
          count: items.length,
          limit,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error in paginated entries query', {
        userId,
        limit,
        cursor,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Offset-based pagination for entries
   * Less efficient for large page numbers, but allows jumping to specific pages
   *
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Items per page
   * @param {string} options.sortBy - Field to sort by
   * @param {string} options.sortOrder - 'asc' or 'desc'
   * @returns {Promise<Object>} - { items, pagination }
   */
  async findByPage(userId, { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    try {
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute query and count in parallel
      const [entries, totalCount] = await Promise.all([
        this.EntryModel.find({ userId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.EntryModel.countDocuments({ userId })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      logger.debug('Page-based entries fetched', {
        userId,
        page,
        limit,
        totalCount,
        totalPages
      });

      return {
        items: entries.map(e => this.mapToDomain(e)),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error in page-based entries query', {
        userId,
        page,
        limit,
        error: error.message
      });
      throw error;
    }
  }

  async update(id, userId, data) {
    try {
      const entry = await this.EntryModel.findOneAndUpdate(
        { _id: id, userId },
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!entry) {
        throw new NotFoundError('Entry', id);
      }

      logger.info('Entry updated in MongoDB', { entryId: id });

      return this.mapToDomain(entry);
    } catch (error) {
      logger.error('Error updating entry', { entryId: id, error: error.message });
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      const entry = await this.EntryModel.findOneAndDelete({ _id: id, userId }).lean();

      if (!entry) {
        throw new NotFoundError('Entry', id);
      }

      logger.info('Entry deleted from MongoDB', { entryId: id });

      return this.mapToDomain(entry);
    } catch (error) {
      logger.error('Error deleting entry', { entryId: id, error: error.message });
      throw error;
    }
  }

  mapToDomain(mongoEntry) {
    return {
      id: mongoEntry._id,
      userId: mongoEntry.userId,
      date: mongoEntry.date,
      mealType: mongoEntry.mealType,
      foods: mongoEntry.foods,
      notes: mongoEntry.notes,
      totalCalories: mongoEntry.totalCalories,
      totalProtein: mongoEntry.totalProtein,
      totalCarbs: mongoEntry.totalCarbs,
      totalFat: mongoEntry.totalFat,
      createdAt: mongoEntry.createdAt,
      updatedAt: mongoEntry.updatedAt,
      toJSON: () => ({
        id: mongoEntry._id,
        userId: mongoEntry.userId,
        date: mongoEntry.date,
        mealType: mongoEntry.mealType,
        foods: mongoEntry.foods,
        totalCalories: mongoEntry.totalCalories,
        totalProtein: mongoEntry.totalProtein,
        totalCarbs: mongoEntry.totalCarbs,
        totalFat: mongoEntry.totalFat,
        notes: mongoEntry.notes,
        createdAt: mongoEntry.createdAt,
        updatedAt: mongoEntry.updatedAt
      })
    };
  }
}