import { Server } from 'socket.io';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { setupInterviewSocket } from './interview.socket.js';

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.socket(`Client connected: ${socket.id}`);

    // Setup interview-related socket events
    setupInterviewSocket(io, socket);

    socket.on('disconnect', (reason) => {
      logger.socket(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}: ${error.message}`);
    });
  });

  logger.info('Socket.IO initialized');

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

export const emitToSocket = (socketId, event, data) => {
  if (io) {
    io.to(socketId).emit(event, data);
  }
};

export default {
  initializeSocket,
  getIO,
  emitToRoom,
  emitToSocket,
};
