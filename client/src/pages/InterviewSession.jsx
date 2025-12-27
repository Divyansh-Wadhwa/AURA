import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useSessionTimer } from '../hooks/useSession';
import WebRTCService from '../services/webrtc';
import VideoCall from '../components/Video/VideoCall';
import VideoControls from '../components/Video/VideoControls';
import ChatPanel from '../components/Chat/ChatPanel';
import SessionTimer from '../components/Session/SessionTimer';
import SessionHeader from '../components/Session/SessionHeader';
import {
  PhoneOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { INTERACTION_MODES } from '../utils/constants';

const InterviewSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSession, sendMessage, endSession, setCurrentSession } = useSession();
  const { socket, joinRoom, leaveRoom, on, off } = useSocket();

  const [messages, setMessages] = useState([]);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Media states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const webrtcRef = useRef(null);
  const { elapsed, formatted: timerFormatted } = useSessionTimer(!!currentSession);

  const interactionMode = currentSession?.interactionMode || INTERACTION_MODES.TEXT_ONLY;
  const isVideoMode = interactionMode === INTERACTION_MODES.AUDIO_VIDEO;
  const isAudioMode = interactionMode === INTERACTION_MODES.AUDIO_ONLY || isVideoMode;

  // Audio recording
  const { startRecording, stopRecording, cleanup: cleanupRecorder } = useMediaRecorder({
    onChunkAvailable: (buffer, index) => {
      socket.sendAudioChunk(sessionId, buffer, index);
    },
  });

  // Initialize session
  useEffect(() => {
    if (currentSession?.messages) {
      setMessages(currentSession.messages);
    }
  }, [currentSession?.messages]);

  // Initialize media
  useEffect(() => {
    const initMedia = async () => {
      if (interactionMode === INTERACTION_MODES.TEXT_ONLY) return;

      try {
        const constraints = {
          audio: true,
          video: isVideoMode,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);

        if (isAudioMode) {
          await startRecording(stream);
        }

        // Initialize WebRTC for video mode
        if (isVideoMode) {
          webrtcRef.current = new WebRTCService();
          await webrtcRef.current.initialize(constraints);
        }
      } catch (err) {
        console.error('Media initialization error:', err);
        setError('Failed to access media devices. Please check permissions.');
      }
    };

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      cleanupRecorder();
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
    };
  }, [interactionMode, isVideoMode, isAudioMode]);

  // Socket event handlers
  useEffect(() => {
    if (!sessionId || !user?._id) return;

    joinRoom(sessionId, user._id, interactionMode);

    const handleUserJoined = (data) => {
      console.log('User joined:', data);
    };

    const handleUserLeft = (data) => {
      console.log('User left:', data);
    };

    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);

    return () => {
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
      leaveRoom(sessionId);
    };
  }, [sessionId, user?._id, interactionMode, joinRoom, leaveRoom, on, off]);

  // Handle message send
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);

    try {
      const result = await sendMessage(sessionId, content);
      if (!result.success) {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [sessionId, sendMessage, isSending]);

  // Handle end session
  const handleEndSession = async () => {
    setIsEnding(true);

    try {
      // Stop recording
      if (isAudioMode) {
        await stopRecording();
      }

      // Stop media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // End session via API
      const result = await endSession(sessionId);

      if (result.success) {
        navigate(`/feedback/${sessionId}`);
      } else {
        setError(result.error || 'Failed to end session');
        setIsEnding(false);
      }
    } catch (err) {
      setError('Failed to end session');
      setIsEnding(false);
    }
  };

  // Media controls
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && isVideoMode) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <SessionHeader
        scenario={currentSession.scenario}
        interactionMode={interactionMode}
        onEnd={handleEndSession}
        isEnding={isEnding}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video/Audio Section */}
        {isAudioMode && (
          <div className="lg:w-1/2 xl:w-3/5 bg-dark-900 flex flex-col">
            <div className="flex-1 relative">
              {isVideoMode ? (
                <VideoCall
                  localStream={localStream}
                  remoteStream={remoteStream}
                  isVideoEnabled={isVideoEnabled}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <p className="text-white font-medium">{user?.name}</p>
                    <p className="text-dark-400 text-sm">Audio Mode</p>
                    {isAudioEnabled && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                        <span className="text-accent-400 text-sm">Recording</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timer Overlay */}
              <div className="absolute top-4 left-4">
                <SessionTimer elapsed={elapsed} formatted={timerFormatted} />
              </div>
            </div>

            {/* Video Controls */}
            <VideoControls
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              isVideoMode={isVideoMode}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onEndCall={handleEndSession}
              isEnding={isEnding}
            />
          </div>
        )}

        {/* Chat Section */}
        <div className={`flex-1 flex flex-col ${isAudioMode ? 'lg:w-1/2 xl:w-2/5' : ''}`}>
          {!isAudioMode && (
            <div className="p-4 border-b border-dark-800">
              <SessionTimer elapsed={elapsed} formatted={timerFormatted} />
            </div>
          )}

          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            disabled={isEnding}
          />

          {/* End Session Button for Text-Only Mode */}
          {!isAudioMode && (
            <div className="p-4 border-t border-dark-800">
              <button
                onClick={handleEndSession}
                disabled={isEnding}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                {isEnding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <PhoneOff className="w-5 h-5" />
                    End Interview
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 rounded-lg bg-red-900/90 border border-red-700 text-red-100 flex items-start gap-3 animate-in slide-in-right">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm text-red-200">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
