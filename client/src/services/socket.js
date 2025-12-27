import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      } else {
        this.socket.off(event);
        this.listeners.delete(event);
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
    }
  }

  joinRoom(roomId, userId, interactionMode) {
    this.emit('join-room', { roomId, userId, interactionMode });
  }

  leaveRoom(roomId) {
    this.emit('leave-room', { roomId });
  }

  sendOffer(roomId, offer, targetSocketId) {
    this.emit('offer', { roomId, offer, targetSocketId });
  }

  sendAnswer(roomId, answer, targetSocketId) {
    this.emit('answer', { roomId, answer, targetSocketId });
  }

  sendIceCandidate(roomId, candidate, targetSocketId) {
    this.emit('ice-candidate', { roomId, candidate, targetSocketId });
  }

  sendAudioChunk(sessionId, chunk, chunkIndex) {
    this.emit('audio-chunk', { sessionId, chunk, chunkIndex });
  }

  sendAudioMessage(sessionId, audioBase64, mimeType = 'audio/webm') {
    this.emit('audio-message', { sessionId, audio: audioBase64, mimeType });
  }

  emitRecordingStarted(sessionId) {
    this.emit('recording-started', { sessionId });
  }

  emitRecordingStopped(sessionId) {
    this.emit('recording-stopped', { sessionId });
  }

  sendMediaStateChange(roomId, audio, video) {
    this.emit('media-state-change', { roomId, audio, video });
  }

  sendTypingStart(roomId) {
    this.emit('typing-start', { roomId });
  }

  sendTypingStop(roomId) {
    this.emit('typing-stop', { roomId });
  }

  get isConnected() {
    return this.socket?.connected || false;
  }

  get socketId() {
    return this.socket?.id || null;
  }
}

const socketService = new SocketService();

export default socketService;
