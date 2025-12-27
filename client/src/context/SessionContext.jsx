import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

const SessionContext = createContext(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const sendingRef = useRef(false);

  const startSession = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/session/start', config);
      const sessionData = response.data.data;
      
      // Build initial message with audio if available
      const initialMessage = {
        role: 'assistant',
        content: sessionData.initialMessage,
        audioUrl: sessionData.audio?.audioUrl || null,
      };
      
      setCurrentSession({
        ...sessionData,
        messages: [initialMessage],
      });
      return { success: true, data: sessionData };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to start session';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (sessionId, message) => {
    if (sendingRef.current) {
      return { success: false, error: 'Already sending a message' };
    }

    try {
      sendingRef.current = true;
      setError(null);
      
      setCurrentSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: 'user', content: message }],
      }));

      const response = await api.post(`/session/${sessionId}/message`, { message });
      const { response: aiResponse, audio } = response.data.data;

      setCurrentSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { 
          role: 'assistant', 
          content: aiResponse,
          audioUrl: audio?.audioUrl || null,
        }],
      }));

      return { success: true, response: aiResponse, audio };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send message';
      setError(message);
      return { success: false, error: message };
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const sendAudioMessage = useCallback(async (sessionId, audioBlob) => {
    if (sendingRef.current) {
      return { success: false, error: 'Already sending a message' };
    }

    try {
      sendingRef.current = true;
      setError(null);
      setIsTranscribing(true);

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const response = await api.post(`/session/${sessionId}/audio-message`, {
        audio: base64Audio,
      });

      const { transcription, response: aiResponse, audio } = response.data.data;

      // Add user message (transcribed text)
      setCurrentSession((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: 'user', content: transcription },
          { 
            role: 'assistant', 
            content: aiResponse,
            audioUrl: audio?.audioUrl || null,
          },
        ],
      }));

      return { success: true, transcription, response: aiResponse, audio };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send audio message';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      sendingRef.current = false;
      setIsTranscribing(false);
    }
  }, []);

  const endSession = useCallback(async (sessionId, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Include video metrics if provided
      const payload = {};
      if (options.videoMetrics) {
        payload.videoMetrics = options.videoMetrics;
      }
      
      const response = await api.post(`/session/${sessionId}/end`, payload);
      setCurrentSession(null);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to end session';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/session/${sessionId}`);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch session';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserSessions = useCallback(async (page = 1, limit = 10, status) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit };
      if (status) params.status = status;
      
      const response = await api.get('/session/list', { params });
      setSessions(response.data.data.sessions);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch sessions';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserStats = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/session/stats');
      setStats(response.data.data);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch stats';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const getFeedback = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/feedback/${sessionId}`);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch feedback';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getProgressTrends = useCallback(async (days = 30) => {
    try {
      setError(null);
      const response = await api.get('/feedback/trends', { params: { days } });
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch trends';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const clearError = () => setError(null);
  const clearCurrentSession = () => setCurrentSession(null);

  const value = {
    currentSession,
    sessions,
    stats,
    loading,
    error,
    isTranscribing,
    isProcessingAudio,
    startSession,
    sendMessage,
    sendAudioMessage,
    endSession,
    getSession,
    getUserSessions,
    getUserStats,
    getFeedback,
    getProgressTrends,
    clearError,
    clearCurrentSession,
    setCurrentSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export default SessionContext;
