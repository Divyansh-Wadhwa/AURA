import logger from '../utils/logger.js';
import { saveAudioChunk, saveCompleteAudio } from '../services/speech.service.js';
import { transcribeAudio } from '../services/whisper.service.js';
import { textToSpeech } from '../services/elevenlabs.service.js';
import { generateInterviewerResponse } from '../services/llm.service.js';
import Session from '../models/Session.model.js';

const rooms = new Map();
const userSockets = new Map();
const audioBuffers = new Map(); // Store audio buffers for each session

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

  // Audio chunk streaming (for background recording)
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

  // Complete audio message for transcription and response
  socket.on('audio-message', async ({ sessionId, audio, mimeType }) => {
    try {
      logger.info(`[Socket] Received audio message for session: ${sessionId}`);
      
      // Emit processing started
      socket.emit('audio-processing-started', { sessionId });

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audio, 'base64');
      
      // Save the complete audio
      await saveCompleteAudio(sessionId, audioBuffer);

      // Transcribe audio using Whisper
      const transcription = await transcribeAudio(audioBuffer, { 
        mimeType: mimeType || 'audio/webm' 
      });

      if (!transcription || !transcription.text) {
        socket.emit('audio-transcription-error', {
          sessionId,
          error: 'Failed to transcribe audio',
        });
        return;
      }

      const userMessage = transcription.text;
      logger.info(`[Socket] Transcribed: "${userMessage.substring(0, 50)}..."`);

      // Emit transcription result
      socket.emit('audio-transcription', {
        sessionId,
        text: userMessage,
        duration: transcription.duration,
      });

      // Get session and update transcript
      const session = await Session.findById(sessionId);
      if (!session) {
        socket.emit('audio-error', { sessionId, error: 'Session not found' });
        return;
      }

      session.addMessage('user', userMessage);

      // Build conversation history
      const conversationHistory = session.transcript
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const systemPrompt = session.transcript.find((msg) => msg.role === 'system')?.content;
      
      // Generate AI response
      const aiResponse = await generateInterviewerResponse(conversationHistory, systemPrompt);
      
      session.addMessage('assistant', aiResponse);
      await session.save();

      // Emit text response immediately
      socket.emit('interviewer-response', {
        sessionId,
        text: aiResponse,
        messageCount: session.transcript.length,
      });

      // Generate TTS audio for the response
      const audioResponse = await textToSpeech(aiResponse, sessionId);
      
      if (audioResponse) {
        socket.emit('interviewer-audio', {
          sessionId,
          audioUrl: audioResponse.audioUrl,
          duration: audioResponse.duration,
        });
      }

      logger.info(`[Socket] Audio message processed for session: ${sessionId}`);
    } catch (error) {
      logger.error(`[Socket] Audio message error: ${error.message}`);
      socket.emit('audio-error', {
        sessionId,
        error: error.message,
      });
    }
  });

  // Start recording indicator
  socket.on('recording-started', ({ sessionId }) => {
    logger.socket(`Recording started for session: ${sessionId}`);
    socket.to(sessionId).emit('peer-recording-started', { peerId: socket.id });
  });

  // Stop recording indicator  
  socket.on('recording-stopped', ({ sessionId }) => {
    logger.socket(`Recording stopped for session: ${sessionId}`);
    socket.to(sessionId).emit('peer-recording-stopped', { peerId: socket.id });
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
