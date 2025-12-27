import { useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socket';

export const useSocket = () => {
  const isConnected = useRef(false);

  useEffect(() => {
    if (!isConnected.current) {
      socketService.connect();
      isConnected.current = true;
    }

    return () => {
      // Don't disconnect on unmount to maintain connection
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketService.off(event, callback);
  }, []);

  const joinRoom = useCallback((roomId, userId, interactionMode) => {
    socketService.joinRoom(roomId, userId, interactionMode);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    socketService.leaveRoom(roomId);
  }, []);

  return {
    socket: socketService,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    isConnected: socketService.isConnected,
    socketId: socketService.socketId,
  };
};

export default useSocket;
