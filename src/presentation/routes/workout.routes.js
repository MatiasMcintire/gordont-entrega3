import { Router } from 'express';
import { WorkoutController } from '../controllers/WorkoutController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { checkResourceOwnership } from '../middleware/authorizationMiddleware.js';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  getWorkoutByIdSchema,
  getWorkoutsByDateSchema
} from '../validators/workoutValidators.js';
import { cursorPaginationSchema, paginationSchema } from '../validators/commonValidators.js';

/**
 * @swagger
 * /api/v1/workouts:
 *   post:
 *     summary: Crear nueva sesión de entrenamiento
 *     description: Registra una nueva sesión de entrenamiento con ejercicios
 *     tags: [Workouts]
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
 *               - type
 *               - exercises
 *               - duration
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-13"
 *                 description: Fecha del entrenamiento (no puede ser futura)
 *               type:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, sports, other]
 *                 example: strength
 *                 description: Tipo de entrenamiento
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/Exercise'
 *                 description: Lista de ejercicios realizados
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 86400
 *                 example: 3600
 *                 description: Duración total en segundos (máx 24h)
 *               caloriesBurned:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000
 *                 example: 450
 *                 description: Calorías quemadas estimadas (opcional)
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Entrenamiento de fuerza - piernas"
 *                 description: Notas adicionales (opcional)
 *           examples:
 *             fuerza:
 *               summary: Ejemplo de entrenamiento de fuerza
 *               value:
 *                 date: "2025-11-13"
 *                 type: "strength"
 *                 exercises:
 *                   - name: "Sentadillas"
 *                     sets: 4
 *                     reps: 12
 *                     weight: 80
 *                     duration: 0
 *                     notes: "Buen rango de movimiento"
 *                   - name: "Press de banca"
 *                     sets: 3
 *                     reps: 10
 *                     weight: 60
 *                     duration: 0
 *                 duration: 3600
 *                 caloriesBurned: 400
 *                 notes: "Día de fuerza superior"
 *             cardio:
 *               summary: Ejemplo de entrenamiento cardio
 *               value:
 *                 date: "2025-11-13"
 *                 type: "cardio"
 *                 exercises:
 *                   - name: "Correr"
 *                     sets: 1
 *                     reps: 1
 *                     weight: 0
 *                     duration: 1800
 *                     notes: "5km en 30 minutos"
 *                 duration: 1800
 *                 caloriesBurned: 300
 *     responses:
 *       201:
 *         description: Workout creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
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
 *     summary: Obtener entrenamientos por fecha
 *     description: Lista todos los entrenamientos del usuario para una fecha específica
 *     tags: [Workouts]
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
 *         description: Fecha para filtrar los entrenamientos
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
 *         description: Lista de entrenamientos obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Workout'
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
 * /api/v1/workouts/list/paginated:
 *   get:
 *     summary: Listar entrenamientos con paginación por cursor
 *     description: Obtiene entrenamientos usando paginación basada en cursor (más eficiente para grandes conjuntos de datos)
 *     tags: [Workouts]
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
 *         description: Lista de entrenamientos con cursor
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
 *                     $ref: '#/components/schemas/Workout'
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
 * /api/v1/workouts/list/page:
 *   get:
 *     summary: Listar entrenamientos con paginación por offset
 *     description: Obtiene entrenamientos usando paginación tradicional por página
 *     tags: [Workouts]
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
 *         description: Lista de entrenamientos paginada
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
 *                     $ref: '#/components/schemas/Workout'
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
 * /api/v1/workouts/{id}:
 *   get:
 *     summary: Obtener entrenamiento por ID
 *     description: Obtiene un entrenamiento específico del usuario autenticado
 *     tags: [Workouts]
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
 *         description: ID del entrenamiento (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Entrenamiento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
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
 *         description: No tienes permiso para acceder a este entrenamiento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrenamiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   put:
 *     summary: Actualizar entrenamiento
 *     description: Actualiza un entrenamiento existente del usuario autenticado
 *     tags: [Workouts]
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
 *         description: ID del entrenamiento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [strength, cardio, flexibility, sports, other]
 *                 example: cardio
 *               exercises:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/Exercise'
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 86400
 *                 example: 3600
 *               caloriesBurned:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10000
 *                 example: 500
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *           examples:
 *             actualizarNotas:
 *               summary: Actualizar solo notas
 *               value:
 *                 notes: "Excelente sesión, nueva marca personal"
 *             actualizarCalorias:
 *               summary: Actualizar calorías quemadas
 *               value:
 *                 caloriesBurned: 550
 *     responses:
 *       200:
 *         description: Entrenamiento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
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
 *         description: No tienes permiso para actualizar este entrenamiento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrenamiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   delete:
 *     summary: Eliminar entrenamiento
 *     description: Elimina un entrenamiento del usuario autenticado
 *     tags: [Workouts]
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
 *         description: ID del entrenamiento
 *     responses:
 *       200:
 *         description: Entrenamiento eliminado exitosamente
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
 *                   example: "Workout deleted successfully"
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
 *         description: No tienes permiso para eliminar este entrenamiento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Entrenamiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export function createWorkoutRoutes(workoutRepository, cacheService) {
  const router = Router();
  const workoutController = new WorkoutController(workoutRepository, cacheService);

  // All routes require authentication
  router.use(authMiddleware);

  // POST /api/v1/workouts - Create new workout
  router.post(
    '/',
    validate(createWorkoutSchema),
    workoutController.createWorkout
  );

  // GET /api/v1/workouts - List workouts by date with pagination
  router.get(
    '/',
    validate(getWorkoutsByDateSchema, 'query'),
    workoutController.getWorkoutsByDate
  );

  // GET /api/v1/workouts/list/paginated - Cursor-based pagination (must be before /:id)
  router.get(
    '/list/paginated',
    validate(cursorPaginationSchema, 'query'),
    workoutController.getWorkoutsPaginated
  );

  // GET /api/v1/workouts/list/page - Offset-based pagination (must be before /:id)
  router.get(
    '/list/page',
    validate(paginationSchema, 'query'),
    workoutController.getWorkoutsByPage
  );

  // GET /api/v1/workouts/:id - Get workout by ID (requires ownership)
  router.get(
    '/:id',
    validate(getWorkoutByIdSchema, 'params'),
    checkResourceOwnership(workoutRepository, 'Workout'),
    workoutController.getWorkoutById
  );

  // PUT /api/v1/workouts/:id - Update workout (requires ownership)
  router.put(
    '/:id',
    validate(getWorkoutByIdSchema, 'params'),
    validate(updateWorkoutSchema),
    checkResourceOwnership(workoutRepository, 'Workout'),
    workoutController.updateWorkout
  );

  // DELETE /api/v1/workouts/:id - Delete workout (requires ownership)
  router.delete(
    '/:id',
    validate(getWorkoutByIdSchema, 'params'),
    checkResourceOwnership(workoutRepository, 'Workout'),
    workoutController.deleteWorkout
  );

  return router;
}