import mongoose from 'mongoose';
import logger from '../../shared/logger/logger.js';

const connectMongoDB = async () => {
  try {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    
    // Seleccionar URI según el ambiente
    let mongoUri;
    
    if (NODE_ENV === 'production') {
      // Producción: usar MongoDB Atlas
      mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI is required in production environment');
      }
    } else {
      // Desarrollo: usar MongoDB Atlas o local
      mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gordont';
    }

    // Opciones de conexión optimizadas
    const mongooseOptions = {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, mongooseOptions);

    const connection = mongoose.connection;

    connection.on('connected', () => {
      logger.info('MongoDB connected successfully', {
        env: NODE_ENV,
        database: mongoose.connection.db.name,
        host: mongoose.connection.host
      });
    });

    connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to SIGINT');
      process.exit(0);
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { 
      error: error.message,
      env: process.env.NODE_ENV || 'development'
    });
    throw error;
  }
};

export { connectMongoDB };