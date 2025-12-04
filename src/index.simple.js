import dotenv from 'dotenv';
import mongoose from 'mongoose';
import createApp from './app.simple.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gordont';

/**
 * Start the application server
 * Connects to MongoDB and initializes Express app
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Create Express application
    const app = await createApp();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('========================================');
      console.log('Gordont API Server Started');
      console.log('========================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log('========================================');
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} received. Initiating graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        // Close MongoDB connection
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
        } catch (err) {
          console.error('Error closing MongoDB:', err.message);
        }

        // Close Redis connection if exists
        const redisClient = app.locals.redisClient;
        if (redisClient && redisClient.isOpen) {
          try {
            await redisClient.quit();
            console.log('Redis connection closed');
          } catch (err) {
            console.error('Error closing Redis:', err.message);
          }
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

// Start the server
startServer();
