import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useSessionTimer } from '../hooks/useSession';
import { useVideoPerception } from '../hooks/useVideoPerception';
import WebRTCService from '../services/webrtc';
import VideoCall from '../components/Video/VideoCall';
import VideoControls from '../components/Video/VideoControls';
import ChatPanel from '../components/Chat/ChatPanel';
import VoiceBlob from '../components/Audio/VoiceBlob';
import AvatarCanvas from '../components/Avatar/AvatarCanvas';
import SessionTimer from '../components/Session/SessionTimer';
import SessionHeader from '../components/Session/SessionHeader';
import TranscriptionDisplay from '../components/Session/TranscriptionDisplay';
import {
  PhoneOff,
  AlertCircle,
  Loader2,
  Eye,
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
  
  // Voice blob state
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Media states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const webrtcRef = useRef(null);
  const videoCallRef = useRef(null);
  const hiddenVideoRef = useRef(null); // For video perception when avatar is shown
  const { elapsed, formatted: timerFormatted } = useSessionTimer(!!currentSession);

  const interactionMode = currentSession?.interactionMode || INTERACTION_MODES.TEXT_ONLY;
  const isLiveMode = interactionMode === INTERACTION_MODES.LIVE;
  const [videoModeEnabled, setVideoModeEnabled] = useState(false); // Default to audio-only in live mode

  // Video perception state
  const [videoMetrics, setVideoMetrics] = useState(null);

  // Video perception hook
  const { 
    startAnalysis: startVideoPerception, 
    stopAnalysis: stopVideoPerception,
    currentMetrics: liveVideoMetrics,
    isAnalyzing: isVideoAnalyzing,
    error: videoPerceptionError 
  } = useVideoPerception({
    enabled: videoModeEnabled,
    onMetricsUpdate: (metrics) => {
      setVideoMetrics(metrics);
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('[InterviewSession] Mode Debug:', {
      interactionMode,
      isLiveMode,
      videoModeEnabled,
      currentSessionInteractionMode: currentSession?.interactionMode,
    });
  }, [interactionMode, isLiveMode, videoModeEnabled, currentSession?.interactionMode]);

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

  // Handle AI audio playback state
  const handleAIAudioPlay = useCallback(() => {
    setIsAISpeaking(true);
    console.log('[VoiceBlob] AI started speaking');
  }, []);

  const handleAIAudioEnd = useCallback(() => {
    setIsAISpeaking(false);
    console.log('[VoiceBlob] AI stopped speaking');
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
          video: videoModeEnabled,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);

        // Note: We don't start background recording anymore
        // Recording only happens when user clicks the mic button

        // Initialize video perception if video mode enabled
        if (videoModeEnabled) {
          // Set up hidden video element for perception
          setTimeout(() => {
            if (hiddenVideoRef.current && stream) {
              hiddenVideoRef.current.srcObject = stream;
              hiddenVideoRef.current.play().then(() => {
                startVideoPerception(hiddenVideoRef.current);
                console.log('[InterviewSession] Video perception started with hidden video');
              }).catch(err => {
                console.error('[InterviewSession] Hidden video play error:', err);
              });
            }
          }, 500);
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
  }, [interactionMode, videoModeEnabled, isLiveMode]);

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

      // Stop video perception and get final metrics
      let finalVideoMetrics = null;
      if (videoModeEnabled && isVideoAnalyzing) {
        finalVideoMetrics = stopVideoPerception();
        console.log('[InterviewSession] Final video metrics:', finalVideoMetrics);
      }

      // Stop media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Cleanup recorder
      cleanupRecorder();

      // End session via API (include video metrics)
      const result = await endSession(sessionId, { videoMetrics: finalVideoMetrics });

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

  const toggleVideo = async () => {
    if (!isLiveMode) return;
    
    try {
      if (videoModeEnabled) {
        // Disable video
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.stop();
          }
        }
        setVideoModeEnabled(false);
        setIsVideoEnabled(false);
      } else {
        // Enable video
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        setLocalStream(stream);
        setVideoModeEnabled(true);
        setIsVideoEnabled(true);
        
        // Initialize WebRTC
        if (!webrtcRef.current) {
          webrtcRef.current = new WebRTCService();
          await webrtcRef.current.initialize({ audio: true, video: true });
        }
      }
    } catch (err) {
      console.error('Failed to toggle video:', err);
      setError('Failed to enable video. Please check camera permissions.');
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
        {isLiveMode && (
          <div className="lg:w-1/2 xl:w-3/5 bg-dark-900 flex flex-col">
            <div className="flex-1 relative">
              {videoModeEnabled ? (
                /* Avatar Mode - 2D Cartoon Interviewer */
                <div className="h-full relative">
                  {/* Hidden video for video perception */}
                  <video
                    ref={hiddenVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute opacity-0 pointer-events-none w-1 h-1"
                  />
                  
                  <AvatarCanvas
                    isAISpeaking={isAISpeaking}
                    isUserRecording={isRecordingMessage}
                    isThinking={isSending}
                  />
                  
                  {/* Camera Preview - Picture in Picture */}
                  {localStream && (
                    <div className="absolute bottom-24 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-dark-600 shadow-2xl bg-dark-900 z-20">
                      <video
                        autoPlay
                        muted
                        playsInline
                        ref={(el) => {
                          if (el && localStream) {
                            el.srcObject = localStream;
                          }
                        }}
                        className="w-full h-full object-cover mirror"
                      />
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-dark-900/80 text-[10px] text-dark-300">
                        You
                      </div>
                    </div>
                  )}
                  
                  {/* Video Perception runs in background when enabled */}
                  {isVideoAnalyzing && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-900/80 border border-accent-700">
                      <Eye className="w-4 h-4 text-accent-400" />
                      <span className="text-accent-300 text-xs font-medium">
                        Video Analysis ({liveVideoMetrics?.total_frames || 0} frames)
                      </span>
                    </div>
                  )}
                  
                  {/* Bottom UI Overlay for Avatar Mode */}
                  <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-10">
                    {isRecordingMessage ? (
                      <button
                        onClick={stopMessageRecording}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-full border border-red-500/30 transition-all cursor-pointer"
                      >
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-sm font-medium">Recording... Tap to stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={startMessageRecording}
                        disabled={!isAudioEnabled || isSending || isTranscribing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-dark-800/60 hover:bg-dark-700/60 backdrop-blur-sm rounded-full border border-dark-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-primary-500' : 'bg-dark-500'}`} />
                        <span className="text-dark-300 text-sm font-medium">
                          {isSending ? 'Processing...' : isTranscribing ? 'Transcribing...' : 'Say something…'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Audio Mode - 3D Voice Blob Animation */
                <div className="h-full relative">
                  <VoiceBlob 
                    isSpeaking={isAISpeaking}
                    isListening={!isAISpeaking && !isRecordingMessage}
                    isRecording={isRecordingMessage}
                  />
                  
                  {/* Bottom UI Overlay */}
                  <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-10">
                    {/* Recording Button */}
                    {isRecordingMessage ? (
                      <button
                        onClick={stopMessageRecording}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-full border border-red-500/30 transition-all cursor-pointer"
                      >
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-sm font-medium">Recording... Tap to stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={startMessageRecording}
                        disabled={!isAudioEnabled || isSending || isTranscribing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-dark-800/60 hover:bg-dark-700/60 backdrop-blur-sm rounded-full border border-dark-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-primary-500' : 'bg-dark-500'}`} />
                        <span className="text-dark-300 text-sm font-medium">
                          {isSending ? 'Processing...' : isTranscribing ? 'Transcribing...' : 'Say something…'}
                        </span>
                      </button>
                    )}
                    
                    {/* Status indicator */}
                    {isAISpeaking && (
                      <span className="text-amber-400/70 text-xs font-medium">AI is speaking...</span>
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
              isVideoEnabled={videoModeEnabled}
              isLiveMode={isLiveMode}
              videoModeEnabled={videoModeEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onEndCall={handleEndSession}
              isEnding={isEnding}
            />
          </div>
        )}

        {/* Chat Section */}
        <div className={`flex-1 flex flex-col ${isLiveMode ? 'lg:w-1/2 xl:w-2/5' : ''}`}>
          {!isLiveMode && (
            <div className="p-4 border-b border-dark-800">
              <SessionTimer elapsed={elapsed} formatted={timerFormatted} />
            </div>
          )}

          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            disabled={isEnding}
            isAudioMode={isLiveMode}
            isRecording={isRecordingMessage}
            onStartRecording={startMessageRecording}
            onStopRecording={stopMessageRecording}
            isTranscribing={isTranscribing}
            autoPlayAudio={true}
            onAudioPlay={handleAIAudioPlay}
            onAudioEnd={handleAIAudioEnd}
          />

          {/* End Session Button for Text-Only Mode */}
          {!isLiveMode && (
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

      {/* Mirror style for camera preview */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default InterviewSession;
