import { Router } from 'express';
import { EntryController } from '../controllers/EntryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { checkResourceOwnership } from '../middleware/authorizationMiddleware.js';
import {
  createEntrySchema,
  updateEntrySchema,
  getEntryByIdSchema,
  getEntriesByDateSchema
} from '../validators/entryValidators.js';
import { cursorPaginationSchema, paginationSchema } from '../validators/commonValidators.js';

/**
 * @swagger
 * /api/v1/entries:
 *   post:
 *     summary: Crear nueva entrada de comida
 *     description: Registra una nueva entrada de comida con información nutricional
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - mealType
 *               - foods
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-13"
 *                 description: Fecha de la comida (no puede ser futura)
 *               mealType:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *                 example: breakfast
 *                 description: Tipo de comida
 *               foods:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/FoodItem'
 *                 description: Lista de alimentos consumidos
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Comida post-entrenamiento"
 *                 description: Notas adicionales (opcional)
 *           examples:
 *             desayuno:
 *               summary: Ejemplo de desayuno
 *               value:
 *                 date: "2025-11-13"
 *                 mealType: "breakfast"
 *                 foods:
 *                   - name: "Avena"
 *                     calories: 150
 *                     protein: 5
 *                     carbs: 27
 *                     fat: 3
 *                     quantity: 100
 *                   - name: "Plátano"
 *                     calories: 89
 *                     protein: 1
 *                     carbs: 23
 *                     fat: 0.3
 *                     quantity: 100
 *                 notes: "Desayuno pre-entrenamiento"
 *     responses:
 *       201:
 *         description: Entry creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Entry'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   get:
 *     summary: Obtener entradas por fecha
 *     description: Lista todas las entradas de comida del usuario para una fecha específica
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-15"
 *         description: Fecha para filtrar las entradas
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de entradas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Entry'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/v1/entries/stats/daily:
 *   get:
 *     summary: Obtener estadísticas diarias
 *     description: Calcula y devuelve estadísticas nutricionales del día
 *     tags: [Entries, Stats]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-15"
 *         description: Fecha para calcular estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas calculadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Stats'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/v1/entries/list/paginated:
 *   get:
 *     summary: Listar entradas con paginación por cursor
 *     description: Obtiene entradas usando paginación basada en cursor (más eficiente para grandes conjuntos de datos)
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor para la siguiente página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de resultados
 *     responses:
 *       200:
 *         description: Lista de entradas con cursor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Entry'
 *                 cursor:
 *                   type: object
 *                   properties:
 *                     next:
 *                       type: string
 *                       description: Cursor para la siguiente página
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/v1/entries/list/page:
 *   get:
 *     summary: Listar entradas con paginación por offset
 *     description: Obtiene entradas usando paginación tradicional por página
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de entradas paginada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Entry'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * /api/v1/entries/{id}:
 *   get:
 *     summary: Obtener entrada por ID
 *     description: Obtiene una entrada específica del usuario autenticado
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "507f1f77bcf86cd799439011"
 *         description: ID de la entrada (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Entrada encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Entry'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tienes permiso para acceder a esta entrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrada no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   put:
 *     summary: Actualizar entrada
 *     description: Actualiza una entrada existente del usuario autenticado
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "507f1f77bcf86cd799439011"
 *         description: ID de la entrada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               mealType:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner, snack]
 *                 example: lunch
 *               foods:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/FoodItem'
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *           examples:
 *             actualizarNotas:
 *               summary: Actualizar solo notas
 *               value:
 *                 notes: "Comida con más proteína de lo habitual"
 *             actualizarComida:
 *               summary: Cambiar tipo de comida
 *               value:
 *                 mealType: "lunch"
 *     responses:
 *       200:
 *         description: Entrada actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Entry'
 *       400:
 *         description: Error de validación o ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tienes permiso para actualizar esta entrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrada no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   delete:
 *     summary: Eliminar entrada
 *     description: Elimina una entrada del usuario autenticado
 *     tags: [Entries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "507f1f77bcf86cd799439011"
 *         description: ID de la entrada
 *     responses:
 *       200:
 *         description: Entrada eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Entry deleted successfully"
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No tienes permiso para eliminar esta entrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrada no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export function createEntryRoutes(entryRepository, cacheService) {
  const router = Router();
  const entryController = new EntryController(entryRepository, cacheService);

  // All routes require authentication
  router.use(authMiddleware);

  // POST /api/v1/entries - Create new entry
  router.post(
    '/',
    validate(createEntrySchema),
    entryController.createEntry
  );

  // GET /api/v1/entries - List entries by date with pagination
  router.get(
    '/',
    validate(getEntriesByDateSchema, 'query'),
    entryController.getEntriesByDate
  );

  // GET /api/v1/entries/stats/daily - Daily stats (must be before /:id)
  router.get(
    '/stats/daily',
    validate(getEntriesByDateSchema, 'query'),
    entryController.getDailyStats
  );

  // GET /api/v1/entries/list/paginated - Cursor-based pagination (must be before /:id)
  router.get(
    '/list/paginated',
    validate(cursorPaginationSchema, 'query'),
    entryController.getEntriesPaginated
  );

  // GET /api/v1/entries/list/page - Offset-based pagination (must be before /:id)
  router.get(
    '/list/page',
    validate(paginationSchema, 'query'),
    entryController.getEntriesByPage
  );

  // GET /api/v1/entries/:id - Get entry by ID (requires ownership)
  router.get(
    '/:id',
    validate(getEntryByIdSchema, 'params'),
    checkResourceOwnership(entryRepository, 'Entry'),
    entryController.getEntryById
  );

  // PUT /api/v1/entries/:id - Update entry (requires ownership)
  router.put(
    '/:id',
    validate(getEntryByIdSchema, 'params'),
    validate(updateEntrySchema),
    checkResourceOwnership(entryRepository, 'Entry'),
    entryController.updateEntry
  );

  // DELETE /api/v1/entries/:id - Delete entry (requires ownership)
  router.delete(
    '/:id',
    validate(getEntryByIdSchema, 'params'),
    checkResourceOwnership(entryRepository, 'Entry'),
    entryController.deleteEntry
  );

  return router;
}