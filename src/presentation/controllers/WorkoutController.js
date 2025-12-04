import logger from '../../shared/logger/logger.js';

export class WorkoutController {
  constructor(workoutRepository, cacheService = null) {
    this.workoutRepository = workoutRepository;
    this.cacheService = cacheService;
  }

  createWorkout = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { date, type, exercises, duration, caloriesBurned, notes } = req.body;

      if (!userId || !date || !type || !exercises || !duration) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing required fields: date, type, exercises, duration' },
        });
      }

      const workout = await this.workoutRepository.create({
        userId,
        date: new Date(date),
        type,
        exercises,
        duration,
        caloriesBurned,
        notes,
      });

      // Invalidar caché de listas de entrenamientos
      if (this.cacheService) {
        await this.cacheService.invalidateWorkoutCache(userId);
      }

      logger.info('Workout created', {
        userId,
        workoutId: workout.id,
        requestId: req.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Workout created successfully',
        data: workout.toJSON(),
      });
    } catch (error) {
      logger.error('Workout creation error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  getWorkoutsByDate = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: { message: 'Date is required' },
        });
      }

      const workouts = await this.workoutRepository.findByDate(userId, new Date(date));

      return res.status(200).json({
        success: true,
        data: workouts.map((w) => w.toJSON()),
      });
    } catch (error) {
      logger.error('Get workouts error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  getWorkoutById = async (req, res) => {
    try {
      const { id } = req.params;
      const workout = await this.workoutRepository.findById(id);

      return res.status(200).json({
        success: true,
        data: workout.toJSON(),
      });
    } catch (error) {
      logger.error('Get workout error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  updateWorkout = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { type, exercises, duration, caloriesBurned, notes } = req.body;

      const workout = await this.workoutRepository.update(id, userId, {
        type,
        exercises,
        duration,
        caloriesBurned,
        notes,
      });

      // Invalidar caché de este entrenamiento y listas relacionadas
      if (this.cacheService) {
        await this.cacheService.invalidateWorkoutCache(userId, id);
      }

      logger.info('Workout updated', {
        workoutId: id,
        userId,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Workout updated successfully',
        data: workout.toJSON(),
      });
    } catch (error) {
      logger.error('Update workout error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  deleteWorkout = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const workout = await this.workoutRepository.delete(id, userId);

      // Invalidar caché de este entrenamiento y listas relacionadas
      if (this.cacheService) {
        await this.cacheService.invalidateWorkoutCache(userId, id);
      }

      logger.info('Workout deleted', {
        workoutId: id,
        userId,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Workout deleted successfully',
        data: workout.toJSON(),
      });
    } catch (error) {
      logger.error('Delete workout error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  /**
   * GET /api/v1/workouts/list/paginated - Paginación basada en cursor
   * Parámetros de consulta: limit, cursor, sortOrder
   *
   * Ejemplo:
   * GET /api/v1/workouts/list/paginated?limit=20
   * GET /api/v1/workouts/list/paginated?limit=20&cursor=2024-01-15T10:30:00.000Z
   */
  getWorkoutsPaginated = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { limit, cursor, sortOrder } = req.query;

      const result = await this.workoutRepository.findPaginated(userId, {
        limit: limit ? parseInt(limit, 10) : 20,
        cursor,
        sortOrder: sortOrder || 'desc',
      });

      logger.debug('Workouts paginated fetch', {
        userId,
        itemsReturned: result.items.length,
        hasMore: result.hasMore,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        data: {
          items: result.items.map((w) => w.toJSON()),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          metadata: result.metadata,
        },
      });
    } catch (error) {
      logger.error('Get paginated workouts error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };

  /**
   * GET /api/v1/workouts/list/page - Paginación basada en offset
   * Parámetros de consulta: page, limit, sortBy, sortOrder
   *
   * Ejemplo:
   * GET /api/v1/workouts/list/page?page=1&limit=20
   * GET /api/v1/workouts/list/page?page=2&limit=50&sortBy=date&sortOrder=asc
   */
  getWorkoutsByPage = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { page, limit, sortBy, sortOrder } = req.query;

      const result = await this.workoutRepository.findByPage(userId, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
      });

      logger.debug('Workouts page-based fetch', {
        userId,
        page: result.pagination.currentPage,
        itemsReturned: result.items.length,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        data: {
          items: result.items.map((w) => w.toJSON()),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      logger.error('Get workouts by page error', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
      });
      return res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  };
}
