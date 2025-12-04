import { NotFoundError } from '../../shared/errors/AppError.js';
import logger from '../../shared/logger/logger.js';

/**
 * Generic resource ownership checker
 * Verifies that the authenticated user owns the requested resource
 *
 * @param {Object} repository - Repository instance with findById method
 * @param {string} resourceName - Name of the resource (for logging and errors)
 * @returns {Function} Express middleware function
 */
export const checkResourceOwnership = (repository, resourceName) => async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('Authorization check failed: No user ID in request', {
          resourceName,
          resourceId: id,
          path: req.path
        });

        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' }
        });
      }

      // Fetch resource from repository
      let resource;
      try {
        resource = await repository.findById(id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).json({
            success: false,
            error: { message: `${resourceName} not found` }
          });
        }
        throw error;
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: { message: `${resourceName} not found` }
        });
      }

      // Verify ownership
      const resourceUserId = resource.userId?.toString() || resource.userId;
      const requestUserId = userId.toString();

      if (resourceUserId !== requestUserId) {
        logger.warn('Authorization failed: User attempted to access resource they do not own', {
          userId: requestUserId,
          resourceId: id,
          resourceOwnerId: resourceUserId,
          resourceName,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not own this resource' }
        });
      }

      // Attach resource to request to avoid refetching in controller
      req[resourceName.toLowerCase()] = resource;

      logger.debug('Authorization check passed', {
        userId: requestUserId,
        resourceId: id,
        resourceName
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error.message,
        stack: error.stack,
        resourceId: req.params.id,
        resourceName,
        path: req.path
      });
      next(error);
    }
  };

/**
 * Specific authorization middleware for Entry resources
 * @param {Object} entryRepository
 * @returns {Function} Express middleware function
 */
export const checkEntryOwnership = (entryRepository) => checkResourceOwnership(entryRepository, 'Entry');

/**
 * Specific authorization middleware for Workout resources
 * @param {Object} workoutRepository
 * @returns {Function} Express middleware function
 */
export const checkWorkoutOwnership = (workoutRepository) => checkResourceOwnership(workoutRepository, 'Workout');
