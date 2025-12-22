import { createServer } from 'http';
import app from './app.js';
import config from './config/env.js';
import connectDB from './config/db.js';
import { initializeSocket } from './sockets/index.js';
import { initializeUploadsDir } from './services/speech.service.js';
import logger from './utils/logger.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize uploads directory
    await initializeUploadsDir();

    // Create HTTP server
    const server = createServer(app);

    // Initialize Socket.IO
    initializeSocket(server);

    // Start server
    server.listen(config.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     █████╗    ██╗   ██╗   ██████╗     █████╗                  ║
║    ██╔══██╗   ██║   ██║   ██╔══██╗   ██╔══██╗                 ║
║    ███████║   ██║   ██║   ██████╔╝   ███████║                 ║
║    ██╔══██║   ██║   ██║   ██╔══██╗   ██╔══██║                 ║
║    ██║  ██║   ╚██████╔╝   ██║  ██║   ██║  ██║                 ║
║    ╚═╝  ╚═╝    ╚═════╝    ╚═╝  ╚═╝   ╚═╝  ╚═╝                 ║
║                                                               ║
║    AI-Based Unified Response Assessment                       ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║    Server running on port: ${String(config.port).padEnd(34)}║
║    Environment: ${String(config.nodeEnv).padEnd(45)}║
║    Health check: http://localhost:${config.port}/health${' '.repeat(18)}║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      logger.error(err.stack);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}`);
      logger.error(`Reason: ${reason}`);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
