import logger from '../../shared/logger/logger.js';

/**
 * Controller for admin-only operations
 * Requires admin role for all endpoints
 */
export class AdminController {
  constructor(userRepository, cacheService = null) {
    this.userRepository = userRepository;
    this.cacheService = cacheService;
  }

  /**
   * List all users in the system
   * GET /api/v1/admin/users
   * Role required: admin
   */
  listAllUsers = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Buscar todos los usuarios
      const users = await this.userRepository.findAll({
        skip,
        limit: parseInt(limit)
      });

      // Contar total de usuarios
      const total = await this.userRepository.count();

      logger.info('Admin listed all users', {
        adminId: req.user.id,
        page,
        limit,
        total,
        requestId: req.id
      });

      return res.status(200).json({
        success: true,
        data: {
          users: users.map(u => u.toJSON()),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Admin list users error', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        requestId: req.id
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to list users' }
      });
    }
  };

  /**
   * Get a specific user by ID
   * GET /api/v1/admin/users/:id
   * Role required: admin
   */
  getUserById = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await this.userRepository.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      logger.info('Admin viewed user', {
        adminId: req.user.id,
        targetUserId: id,
        requestId: req.id
      });

      return res.status(200).json({
        success: true,
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Admin get user error', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        targetUserId: req.params.id,
        requestId: req.id
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to get user' }
      });
    }
  };

  /**
   * Delete a user from the system
   * DELETE /api/v1/admin/users/:id
   * Role required: admin
   */
  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el usuario existe
      const user = await this.userRepository.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Prevenir que el admin se elimine a sí mismo
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot delete your own account' }
        });
      }

      // Eliminar usuario
      await this.userRepository.delete(id);

      // Invalidar caché si está disponible
      if (this.cacheService) {
        await this.cacheService.invalidate(`user:${id}`);
        await this.cacheService.invalidate('users:*');
        await this.cacheService.invalidateUser(id);
      }

      logger.info('Admin deleted user', {
        adminId: req.user.id,
        deletedUserId: id,
        deletedUserEmail: user.email,
        requestId: req.id
      });

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: {
          deletedUserId: id
        }
      });
    } catch (error) {
      logger.error('Admin delete user error', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        targetUserId: req.params.id,
        requestId: req.id
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete user' }
      });
    }
  };

  /**
   * Get system statistics
   * GET /api/v1/admin/stats
   * Role required: admin
   */
  getSystemStats = async (req, res) => {
    try {
      const totalUsers = await this.userRepository.count();
      const adminCount = await this.userRepository.countByRole('admin');
      const usuarioCount = await this.userRepository.countByRole('usuario');

      logger.info('Admin viewed system stats', {
        adminId: req.user.id,
        requestId: req.id
      });

      return res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            admins: adminCount,
            usuarios: usuarioCount
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Admin get stats error', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        requestId: req.id
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to get system statistics' }
      });
    }
  };
}
