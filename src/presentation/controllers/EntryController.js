import logger from '../../shared/logger/logger.js';

export class EntryController {
  constructor(entryRepository, cacheService = null) {
    this.entryRepository = entryRepository;
    this.cacheService = cacheService;
  }

  // method cache server implement

  createEntry = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { date, mealType, foods, notes } = req.body;

      if (!userId || !date || !mealType || !foods) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing required fields: date, mealType, foods' },
        });
      }

      const entry = await this.entryRepository.create({
        userId,
        date: new Date(date),
        mealType,
        foods,
        notes,
      });

      // Invalidar caché de listas de entradas y estadísticas
      if (this.cacheService) {
        await this.cacheService.invalidateEntryCache(userId);
      }

      logger.info('Entry created', {
        userId,
        entryId: entry.id,
        requestId: req.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Entry created successfully',
        data: entry.toJSON(),
      });
    } catch (error) {
      logger.error('Entry creation error', {
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

  getEntriesByDate = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: { message: 'Date is required' },
        });
      }

      const entries = await this.entryRepository.findByDate(userId, new Date(date));

      return res.status(200).json({
        success: true,
        data: entries.map((e) => e.toJSON()),
      });
    } catch (error) {
      logger.error('Get entries error', {
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

  getEntryById = async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await this.entryRepository.findById(id);

      return res.status(200).json({
        success: true,
        data: entry.toJSON(),
      });
    } catch (error) {
      logger.error('Get entry error', {
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

  updateEntry = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { mealType, foods, notes } = req.body;

      const entry = await this.entryRepository.update(id, userId, {
        mealType,
        foods,
        notes,
      });

      // Invalidar caché de esta entrada específica y listas relacionadas
      if (this.cacheService) {
        await this.cacheService.invalidateEntryCache(userId, id);
      }

      logger.info('Entry updated', {
        entryId: id,
        userId,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Entry updated successfully',
        data: entry.toJSON(),
      });
    } catch (error) {
      logger.error('Update entry error', {
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

  deleteEntry = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const entry = await this.entryRepository.delete(id, userId);

      // Invalidar caché de esta entrada y listas relacionadas
      if (this.cacheService) {
        await this.cacheService.invalidateEntryCache(userId, id);
      }

      logger.info('Entry deleted', {
        entryId: id,
        userId,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Entry deleted successfully',
        data: entry.toJSON(),
      });
    } catch (error) {
      logger.error('Delete entry error', {
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

  getDailyStats = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: { message: 'Date is required' },
        });
      }

      // Intentar obtener desde caché primero
      const cacheKey = `stats:daily:${userId}:${date}`;

      if (this.cacheService) {
        const cachedStats = await this.cacheService.get(cacheKey);
        if (cachedStats) {
          logger.debug('Daily stats cache hit', {
            userId,
            date,
            requestId: req.id,
          });
          return res.status(200).json({
            success: true,
            data: cachedStats,
            cached: true,
          });
        }
      }

      // Cache miss - calcular estadísticas
      const entries = await this.entryRepository.findByDate(userId, new Date(date));

      const stats = {
        date,
        totalEntries: entries.length,
        totalCalories: entries.reduce((sum, e) => sum + e.totalCalories, 0),
        totalProtein: entries.reduce((sum, e) => sum + e.totalProtein, 0),
        totalCarbs: entries.reduce((sum, e) => sum + e.totalCarbs, 0),
        totalFat: entries.reduce((sum, e) => sum + e.totalFat, 0),
        byMealType: {
          breakfast: entries.filter((e) => e.mealType === 'breakfast').length,
          lunch: entries.filter((e) => e.mealType === 'lunch').length,
          dinner: entries.filter((e) => e.mealType === 'dinner').length,
          snack: entries.filter((e) => e.mealType === 'snack').length,
        },
      };

      // Guardar estadísticas en caché por 5 minutos (no cambian tan seguido)
      if (this.cacheService) {
        await this.cacheService.set(cacheKey, stats, 300);
        logger.debug('Daily stats cached', {
          userId,
          date,
          requestId: req.id,
        });
        return res.status(200).json({
          success: true,
          data: stats,
          cached: false,
        });
      }

      // Cuando no hay cache service, devolver sin cached property
      return res.status(200).json({
        success: true,
        data: stats,
        cached: false,
      });
    } catch (error) {
      logger.error('Get daily stats error', {
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

  getPeriodStats = async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        message: 'Period stats functionality coming soon',
      });
    } catch (error) {
      logger.error('Get period stats error', {
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
   * GET /api/v1/entries/list/paginated - Paginación basada en cursor
   * Parámetros de consulta: limit, cursor, sortOrder
   *
   * Ejemplo:
   * GET /api/v1/entries/list/paginated?limit=20
   * GET /api/v1/entries/list/paginated?limit=20&cursor=2024-01-15T10:30:00.000Z
   */
  getEntriesPaginated = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { limit, cursor, sortOrder } = req.query;

      const result = await this.entryRepository.findPaginated(userId, {
        limit: limit ? parseInt(limit, 10) : 20,
        cursor,
        sortOrder: sortOrder || 'desc',
      });

      logger.debug('Entries paginated fetch', {
        userId,
        itemsReturned: result.items.length,
        hasMore: result.hasMore,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        data: {
          items: result.items.map((e) => e.toJSON()),
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          metadata: result.metadata,
        },
      });
    } catch (error) {
      logger.error('Get paginated entries error', {
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
   * GET /api/v1/entries/list/page - Paginación basada en offset
   * Parámetros de consulta: page, limit, sortBy, sortOrder
   *
   * Ejemplo:
   * GET /api/v1/entries/list/page?page=1&limit=20
   * GET /api/v1/entries/list/page?page=2&limit=50&sortBy=date&sortOrder=asc
   */
  getEntriesByPage = async (req, res) => {
    try {
      const userId = req.user?.id;
      const { page, limit, sortBy, sortOrder } = req.query;
      //if cache exist return cache else

      const result = await this.entryRepository.findByPage(userId, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
      });

      // cache = result,
      logger.debug('Entries page-based fetch', {
        userId,
        page: result.pagination.currentPage,
        itemsReturned: result.items.length,
        requestId: req.id,
      });

      return res.status(200).json({
        success: true,
        data: {
          items: result.items.map((e) => e.toJSON()),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      logger.error('Get entries by page error', {
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
