import { NotFoundError } from '../../shared/errors/AppError.js';
import logger from '../../shared/logger/logger.js';

export class MongoUserRepository {
  constructor(UserModel) {
    this.UserModel = UserModel;
  }

  async create(user) {
    try {
      const mongoUser = new this.UserModel({
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        weight: user.weight,
        height: user.height,
        age: user.age
      });

      await mongoUser.save();
      logger.info('User created in MongoDB', { userId: mongoUser._id, email: user.email });

      return this.mapToDomain(mongoUser);
    } catch (error) {
      logger.error('Error creating user in MongoDB', { error: error.message });
      throw error;
    }
  }

  async findById(id) {
    try {
      const user = await this.UserModel.findById(id).lean();

      if (!user) {
        throw new NotFoundError('User', id);
      }

      return this.mapToDomain(user);
    } catch (error) {
      logger.error('Error finding user by ID', { userId: id, error: error.message });
      throw error;
    }
  }

 async findByEmail(email) {
  try {
    const user = await this.UserModel.findOne({ email }).select('+passwordHash').lean();
    return user ? this.mapToDomain(user) : null;
  } catch (error) {
    logger.error('Error finding user by email', { email, error: error.message });
    throw error;
  }
}

  async update(id, data) {
    try {
      const user = await this.UserModel.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!user) {
        throw new NotFoundError('User', id);
      }

      logger.info('User updated in MongoDB', { userId: id });

      return this.mapToDomain(user);
    } catch (error) {
      logger.error('Error updating user', { userId: id, error: error.message });
      throw error;
    }
  }

  async delete(id) {
    try {
      const user = await this.UserModel.findByIdAndDelete(id).lean();

      if (!user) {
        throw new NotFoundError('User', id);
      }

      logger.info('User deleted from MongoDB', { userId: id });

      return this.mapToDomain(user);
    } catch (error) {
      logger.error('Error deleting user', { userId: id, error: error.message });
      throw error;
    }
  }

  async findAll({ skip = 0, limit = 10 } = {}) {
    try {
      const users = await this.UserModel.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      return users.map(user => this.mapToDomain(user));
    } catch (error) {
      logger.error('Error finding all users', { error: error.message });
      throw error;
    }
  }

  async count() {
    try {
      return await this.UserModel.countDocuments();
    } catch (error) {
      logger.error('Error counting users', { error: error.message });
      throw error;
    }
  }

  async countByRole(role) {
    try {
      return await this.UserModel.countDocuments({ role });
    } catch (error) {
      logger.error('Error counting users by role', { role, error: error.message });
      throw error;
    }
  }

  mapToDomain(mongoUser) {
    return {
      id: mongoUser._id,
      email: mongoUser.email,
      name: mongoUser.name,
      passwordHash: mongoUser.passwordHash,
      weight: mongoUser.weight,
      height: mongoUser.height,
      age: mongoUser.age,
      role: mongoUser.role || 'usuario',
      createdAt: mongoUser.createdAt,
      updatedAt: mongoUser.updatedAt,
      toJSON: () => ({
        id: mongoUser._id,
        email: mongoUser.email,
        name: mongoUser.name,
        weight: mongoUser.weight,
        height: mongoUser.height,
        age: mongoUser.age,
        role: mongoUser.role || 'usuario',
        bmi: calculateBMI(mongoUser.weight, mongoUser.height),
        createdAt: mongoUser.createdAt,
        updatedAt: mongoUser.updatedAt
      })
    };
  }
}

// Función auxiliar para calcular BMI
function calculateBMI(weight, height) {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
}