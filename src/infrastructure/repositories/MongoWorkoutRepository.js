import { NotFoundError } from '../../shared/errors/AppError.js';
import logger from '../../shared/logger/logger.js';

export class MongoWorkoutRepository {
  constructor(WorkoutModel) {
    this.WorkoutModel = WorkoutModel;
  }

  async create(workout) {
    try {
      const mongoWorkout = new this.WorkoutModel({
        userId: workout.userId,
        date: workout.date,
        type: workout.type,
        exercises: workout.exercises,
        duration: workout.duration,
        caloriesBurned: workout.caloriesBurned || 0,
        notes: workout.notes || ''
      });

      await mongoWorkout.save();
      logger.info('Workout created in MongoDB', { userId: workout.userId, workoutId: mongoWorkout._id });

      return this.mapToDomain(mongoWorkout);
    } catch (error) {
      logger.error('Error creating workout in MongoDB', { error: error.message });
      throw error;
    }
  }

  async findById(id) {
    try {
      const workout = await this.WorkoutModel.findById(id).lean();

      if (!workout) {
        throw new NotFoundError('Workout', id);
      }

      return this.mapToDomain(workout);
    } catch (error) {
      logger.error('Error finding workout by ID', { workoutId: id, error: error.message });
      throw error;
    }
  }

  async findByDate(userId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const workouts = await this.WorkoutModel.find({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      return workouts.map(w => this.mapToDomain(w));
    } catch (error) {
      logger.error('Error finding workouts by date', { userId, date, error: error.message });
      throw error;
    }
  }

  /**
   * Cursor-based pagination for workouts
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
      const workouts = await this.WorkoutModel.find(query)
        .sort({ createdAt: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit + 1)
        .lean();

      // Check if there are more items
      const hasMore = workouts.length > limit;

      // Remove the extra item if exists
      const items = hasMore ? workouts.slice(0, limit) : workouts;

      // Get next cursor (createdAt of last item)
      const nextCursor = hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null;

      logger.debug('Paginated workouts fetched', {
        userId,
        limit,
        cursor,
        itemsReturned: items.length,
        hasMore
      });

      return {
        items: items.map(w => this.mapToDomain(w)),
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
      logger.error('Error in paginated workouts query', {
        userId,
        limit,
        cursor,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Offset-based pagination for workouts
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
      const [workouts, totalCount] = await Promise.all([
        this.WorkoutModel.find({ userId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.WorkoutModel.countDocuments({ userId })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      logger.debug('Page-based workouts fetched', {
        userId,
        page,
        limit,
        totalCount,
        totalPages
      });

      return {
        items: workouts.map(w => this.mapToDomain(w)),
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
      logger.error('Error in page-based workouts query', {
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
      const workout = await this.WorkoutModel.findOneAndUpdate(
        { _id: id, userId },
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!workout) {
        throw new NotFoundError('Workout', id);
      }

      logger.info('Workout updated in MongoDB', { workoutId: id });

      return this.mapToDomain(workout);
    } catch (error) {
      logger.error('Error updating workout', { workoutId: id, error: error.message });
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      const workout = await this.WorkoutModel.findOneAndDelete({ _id: id, userId }).lean();

      if (!workout) {
        throw new NotFoundError('Workout', id);
      }

      logger.info('Workout deleted from MongoDB', { workoutId: id });

      return this.mapToDomain(workout);
    } catch (error) {
      logger.error('Error deleting workout', { workoutId: id, error: error.message });
      throw error;
    }
  }

  mapToDomain(mongoWorkout) {
    return {
      id: mongoWorkout._id,
      userId: mongoWorkout.userId,
      date: mongoWorkout.date,
      type: mongoWorkout.type,
      exercises: mongoWorkout.exercises,
      duration: mongoWorkout.duration,
      caloriesBurned: mongoWorkout.caloriesBurned,
      notes: mongoWorkout.notes,
      createdAt: mongoWorkout.createdAt,
      updatedAt: mongoWorkout.updatedAt,
      toJSON: () => ({
        id: mongoWorkout._id,
        userId: mongoWorkout.userId,
        date: mongoWorkout.date,
        type: mongoWorkout.type,
        exercises: mongoWorkout.exercises,
        duration: mongoWorkout.duration,
        caloriesBurned: mongoWorkout.caloriesBurned,
        notes: mongoWorkout.notes,
        createdAt: mongoWorkout.createdAt,
        updatedAt: mongoWorkout.updatedAt
      })
    };
  }
}