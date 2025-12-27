import logger from '../utils/logger.js';
import { saveAudioChunk } from '../services/speech.service.js';

const rooms = new Map();
const userSockets = new Map();

export const setupInterviewSocket = (io, socket) => {
  // Join interview room
  socket.on('join-room', ({ roomId, userId, interactionMode }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Set(),
        interactionMode,
        createdAt: Date.now(),
      });
    }
    
    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    userSockets.set(socket.id, { roomId, userId });

    logger.socket(`User ${userId} joined room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      userId: userId,
      socketId: socket.id,
      participantCount: room.participants.size,
    });

    // Send room info back to joiner
    socket.emit('room-joined', {
      roomId,
      participantCount: room.participants.size,
      interactionMode: room.interactionMode,
    });
  });

  // WebRTC Signaling: Offer
  socket.on('offer', ({ roomId, offer, targetSocketId }) => {
    logger.socket(`Offer from ${socket.id} to ${targetSocketId || 'room'}`);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', {
        offer,
        senderSocketId: socket.id,
      });
    } else {
      socket.to(roomId).emit('offer', {
        offer,
        senderSocketId: socket.id,
      });
    }
  });

  // WebRTC Signaling: Answer
  socket.on('answer', ({ roomId, answer, targetSocketId }) => {
    logger.socket(`Answer from ${socket.id} to ${targetSocketId}`);
    
    io.to(targetSocketId).emit('answer', {
      answer,
      senderSocketId: socket.id,
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('ice-candidate', ({ roomId, candidate, targetSocketId }) => {
    logger.socket(`ICE candidate from ${socket.id}`);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    } else {
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    }
  });

  // Audio chunk streaming
  socket.on('audio-chunk', async ({ sessionId, chunk, chunkIndex }) => {
    try {
      const audioBuffer = Buffer.from(chunk);
      await saveAudioChunk(sessionId, audioBuffer, chunkIndex);
      
      socket.emit('audio-chunk-received', { chunkIndex });
    } catch (error) {
      logger.error(`Audio chunk error: ${error.message}`);
      socket.emit('audio-chunk-error', {
        chunkIndex,
        error: error.message,
      });
    }
  });

  // Session state updates
  socket.on('session-state', ({ roomId, state }) => {
    socket.to(roomId).emit('session-state-update', {
      state,
      from: socket.id,
    });
  });

  // Typing indicator
  socket.on('typing-start', ({ roomId }) => {
    socket.to(roomId).emit('user-typing', {
      userId: userSockets.get(socket.id)?.userId,
    });
  });

  socket.on('typing-stop', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-typing', {
      userId: userSockets.get(socket.id)?.userId,
    });
  });

  // Leave room
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(io, socket, roomId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userData = userSockets.get(socket.id);
    if (userData?.roomId) {
      handleLeaveRoom(io, socket, userData.roomId);
    }
    userSockets.delete(socket.id);
  });

  // Media state changes
  socket.on('media-state-change', ({ roomId, audio, video }) => {
    socket.to(roomId).emit('peer-media-state', {
      peerId: socket.id,
      audio,
      video,
    });
  });

  // Screen share
  socket.on('screen-share-start', ({ roomId }) => {
    socket.to(roomId).emit('peer-screen-share-start', {
      peerId: socket.id,
    });
  });

  socket.on('screen-share-stop', ({ roomId }) => {
    socket.to(roomId).emit('peer-screen-share-stop', {
      peerId: socket.id,
    });
  });
};

const handleLeaveRoom = (io, socket, roomId) => {
  const room = rooms.get(roomId);
  
  if (room) {
    room.participants.delete(socket.id);
    
    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      participantCount: room.participants.size,
    });

    socket.leave(roomId);

    logger.socket(`User left room ${roomId}. Remaining: ${room.participants.size}`);

    // Clean up empty rooms
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      logger.socket(`Room ${roomId} deleted (empty)`);
    }
  }
};

export const getRoomInfo = (roomId) => {
  return rooms.get(roomId);
};

export const getActiveRooms = () => {
  return Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    participantCount: room.participants.size,
    interactionMode: room.interactionMode,
    createdAt: room.createdAt,
  }));
};

export default {
  setupInterviewSocket,
  getRoomInfo,
  getActiveRooms,
};
