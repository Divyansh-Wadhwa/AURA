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
import TranscriptionDisplay from '../components/Session/TranscriptionDisplay';
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
  const { currentSession, sendMessage, sendAudioMessage, endSession, setCurrentSession, isTranscribing } = useSession();
  const { socket, joinRoom, leaveRoom, on, off } = useSocket();

  const [messages, setMessages] = useState([]);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [recordingChunkCount, setRecordingChunkCount] = useState(0);
  const [recordingAudioSize, setRecordingAudioSize] = useState(0);

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

  // Debug logging
  useEffect(() => {
    console.log('[InterviewSession] Mode Debug:', {
      interactionMode,
      isAudioMode,
      isVideoMode,
      currentSessionInteractionMode: currentSession?.interactionMode,
    });
  }, [interactionMode, isAudioMode, isVideoMode, currentSession?.interactionMode]);

  // Audio recording for background chunks
  const { startRecording, stopRecording, cleanup: cleanupRecorder } = useMediaRecorder({
    onChunkAvailable: (buffer, index) => {
      socket.sendAudioChunk(sessionId, buffer, index);
    },
  });

  // Audio recording for messages (separate recorder)
  const messageRecorderRef = useRef(null);
  const messageChunksRef = useRef([]);

  const startMessageRecording = useCallback(async () => {
    console.log('[Recording] startMessageRecording called');
    try {
      // Always get a fresh stream for recording
      console.log('[Recording] Getting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Recording] Got stream:', stream.id);

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      console.log('[Recording] Using mimeType:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      messageChunksRef.current = [];
      setRecordingChunkCount(0);
      setRecordingAudioSize(0);
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('[Recording] ondataavailable, size:', event.data.size);
        if (event.data.size > 0) {
          messageChunksRef.current.push(event.data);
          // Update real-time stats
          setRecordingChunkCount(prev => prev + 1);
          setRecordingAudioSize(prev => prev + event.data.size);
          console.log(`[Recording] Chunk ${messageChunksRef.current.length}: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`[Recording] onstop called. Total chunks: ${messageChunksRef.current.length}`);
        
        // Stop the stream tracks
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[Recording] Stopped track:', track.kind);
        });
        
        // Create blob from chunks
        const audioBlob = new Blob(messageChunksRef.current, { type: 'audio/webm' });
        console.log(`[Recording] Created blob: ${audioBlob.size} bytes`);
        
        if (audioBlob.size > 0) {
          // Send audio message
          setIsSending(true);
          try {
            console.log('[Recording] Sending audio for transcription...');
            const result = await sendAudioMessage(sessionId, audioBlob);
            if (!result.success) {
              console.error('[Recording] Transcription failed:', result.error);
              setError(result.error || 'Failed to send audio message');
              setCurrentTranscription('');
            } else {
              console.log('[Recording] Transcription successful:', result.transcription);
              setCurrentTranscription(result.transcription);
              // Clear transcription after 3 seconds
              setTimeout(() => setCurrentTranscription(''), 3000);
            }
          } catch (err) {
            console.error('[Recording] Error:', err);
            setError('Failed to process audio');
            setCurrentTranscription('');
          } finally {
            setIsSending(false);
          }
        } else {
          console.warn('[Recording] Empty audio blob, not sending');
        }
        
        messageChunksRef.current = [];
        // Reset recording stats
        setRecordingChunkCount(0);
        setRecordingAudioSize(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Recording] MediaRecorder error:', event.error);
        setError('Recording error occurred');
      };

      mediaRecorder.onstart = () => {
        console.log('[Recording] MediaRecorder started');
      };

      messageRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500); // Collect data every 500ms for more responsive recording
      setIsRecordingMessage(true);
      console.log('[Recording] Recording started successfully');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
      setError('Failed to access microphone: ' + err.message);
    }
  }, [sessionId, sendAudioMessage]);

  const stopMessageRecording = useCallback(() => {
    console.log('[Recording] stopMessageRecording called, state:', messageRecorderRef.current?.state);
    if (messageRecorderRef.current && messageRecorderRef.current.state !== 'inactive') {
      console.log('[Recording] Stopping recorder...');
      messageRecorderRef.current.stop();
      setIsRecordingMessage(false);
    } else {
      console.log('[Recording] Recorder not active, nothing to stop');
    }
  }, []);

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

        // Note: We don't start background recording anymore
        // Recording only happens when user clicks the mic button

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
      // Stop message recording if active
      if (messageRecorderRef.current && messageRecorderRef.current.state !== 'inactive') {
        messageRecorderRef.current.stop();
        setIsRecordingMessage(false);
      }

      // Stop media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Cleanup recorder
      cleanupRecorder();

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
                    {isRecordingMessage ? (
                      <button
                        onClick={stopMessageRecording}
                        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all cursor-pointer"
                      >
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-sm font-medium">Recording... Click to STOP</span>
                      </button>
                    ) : isAudioEnabled && (
                      <button
                        onClick={startMessageRecording}
                        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg transition-all cursor-pointer"
                      >
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-green-400 text-sm font-medium">🎤 Click HERE to Record</span>
                      </button>
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
            isAudioMode={isAudioMode}
            isRecording={isRecordingMessage}
            onStartRecording={startMessageRecording}
            onStopRecording={stopMessageRecording}
            isTranscribing={isTranscribing}
            autoPlayAudio={true}
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

      {/* Transcription Display */}
      <TranscriptionDisplay
        isRecording={isRecordingMessage}
        isTranscribing={isTranscribing}
        transcriptionText={currentTranscription}
        chunkCount={recordingChunkCount}
        audioSize={recordingAudioSize}
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2 max-w-md z-50">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
