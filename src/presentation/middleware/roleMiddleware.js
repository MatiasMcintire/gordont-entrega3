import logger from '../../shared/logger/logger.js';

/**
 * Middleware to check if user has required role(s)
 * Must be used AFTER authMiddleware to ensure req.user is populated
 *
 * @param {...string} allowedRoles - One or more roles allowed to access the endpoint
 * @returns {Function} Express middleware function
 *
 * @example
 * // Allow only admins
 * router.get('/admin/users', authMiddleware, requireRole('admin'), controller.listUsers);
 *
 * @example
 * // Allow both admins and usuarios
 * router.get('/entries', authMiddleware, requireRole('admin', 'usuario'), controller.list);
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        logger.warn('Role check failed: No user in request', {
          path: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const userRole = req.user.role;

      // Verificar que el usuario tenga rol asignado
      if (!userRole) {
        logger.warn('Role check failed: User has no role assigned', {
          userId: req.user.id,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          success: false,
          error: { message: 'User has no role assigned' }
        });
      }

      // Verificar que el rol del usuario esté en la lista de roles permitidos
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Role check failed: Insufficient permissions', {
          userId: req.user.id,
          userRole: userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            requiredRole: allowedRoles.length === 1 ? allowedRoles[0] : allowedRoles
          }
        });
      }

      // Usuario tiene el rol requerido
      logger.debug('Role check passed', {
        userId: req.user.id,
        userRole: userRole,
        requiredRoles: allowedRoles,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Role middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
      });
    }
  };
};

/**
 * Middleware shortcut to require admin role
 * Equivalent to requireRole('admin')
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware shortcut to require usuario role
 * Equivalent to requireRole('usuario')
 */
export const requireUsuario = requireRole('usuario');
