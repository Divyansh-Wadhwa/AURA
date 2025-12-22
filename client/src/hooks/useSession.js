import { useState, useEffect, useCallback } from 'react';
import { useSession as useSessionContext } from '../context/SessionContext';

export const useSessionTimer = (isActive = false) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval = null;
    
    if (isActive) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const reset = useCallback(() => {
    setElapsed(0);
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsed,
    formatted: formatTime(elapsed),
    reset,
    formatTime,
  };
};

export const useInterviewSession = (sessionId) => {
  const sessionContext = useSessionContext();
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (content) => {
    if (!sessionId || !content.trim()) return { success: false };

    setIsSending(true);
    const result = await sessionContext.sendMessage(sessionId, content);
    setIsSending(false);

    return result;
  }, [sessionId, sessionContext]);

  const endSession = useCallback(async () => {
    if (!sessionId) return { success: false };
    return await sessionContext.endSession(sessionId);
  }, [sessionId, sessionContext]);

  useEffect(() => {
    if (sessionContext.currentSession?.messages) {
      setMessages(sessionContext.currentSession.messages);
    }
  }, [sessionContext.currentSession?.messages]);

  return {
    messages,
    isSending,
    sendMessage,
    endSession,
    currentSession: sessionContext.currentSession,
    loading: sessionContext.loading,
    error: sessionContext.error,
  };
};

export default useInterviewSession;
