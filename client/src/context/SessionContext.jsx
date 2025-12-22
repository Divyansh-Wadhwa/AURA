import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../services/api';

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
  const sendingRef = useRef(false);

  const startSession = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/session/start', config);
      const sessionData = response.data.data;
      setCurrentSession({
        ...sessionData,
        messages: [
          { role: 'assistant', content: sessionData.initialMessage },
        ],
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
      const { response: aiResponse } = response.data.data;

      setCurrentSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: aiResponse }],
      }));

      return { success: true, response: aiResponse };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send message';
      setError(message);
      return { success: false, error: message };
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const endSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/session/${sessionId}/end`);
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
    startSession,
    sendMessage,
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
