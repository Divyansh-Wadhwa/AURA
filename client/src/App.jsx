import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SessionSetup from './pages/SessionSetup';
import InterviewSession from './pages/InterviewSession';
import Feedback from './pages/Feedback';
import NotFound from './pages/NotFound';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-950">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

// Protected route - requires Auth0 authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public route - redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-dark-950">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/setup"
          element={
            <ProtectedRoute>
              <SessionSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:sessionId"
          element={
            <ProtectedRoute>
              <InterviewSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:sessionId"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
