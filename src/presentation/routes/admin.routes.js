import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for system management
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Listar todos los usuarios (solo admin)
 *     description: Obtiene un listado paginado de todos los usuarios del sistema
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Usuarios por página
 *     responses:
 *       200:
 *         description: Listado de usuarios obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol de administrador
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Obtener usuario específico (solo admin)
 *     description: Obtiene los datos completos de un usuario por su ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol de administrador
 *       404:
 *         description: Usuario no encontrado
 *   delete:
 *     summary: Eliminar usuario (solo admin)
 *     description: Elimina un usuario del sistema permanentemente
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
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
 *                   example: User deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUserId:
 *                       type: string
 *       400:
 *         description: No se puede eliminar a sí mismo
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol de administrador
 *       404:
 *         description: Usuario no encontrado
 */

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Obtener estadísticas del sistema (solo admin)
 *     description: Obtiene estadísticas generales del sistema
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         admins:
 *                           type: integer
 *                         usuarios:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Requiere rol de administrador
 */

/**
 * Create admin routes
 * All routes require authentication AND admin role
 */
export function createAdminRoutes(userRepository, cacheService) {
  const router = Router();
  const adminController = new AdminController(userRepository, cacheService);

  // Todas las rutas admin requieren autenticación Y rol de admin
  router.use(authMiddleware);
  router.use(requireAdmin);

  // GET /api/v1/admin/users - Listar todos los usuarios
  router.get('/users', adminController.listAllUsers);

  // GET /api/v1/admin/users/:id - Obtener usuario específico
  router.get('/users/:id', adminController.getUserById);

  // DELETE /api/v1/admin/users/:id - Eliminar usuario
  router.delete('/users/:id', adminController.deleteUser);

  // GET /api/v1/admin/stats - Estadísticas del sistema
  router.get('/stats', adminController.getSystemStats);

  return router;
}
