/**
 * Onboarding Page - AI Voice Conversation
 * 
 * Captures user's natural communication patterns through a
 * short, low-pressure voice conversation (60-90 seconds).
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

// Casual get-to-know-you questions
const ONBOARDING_QUESTIONS = [
  "Hey there! It's great to meet you. How are you doing today?",
  "Nice! So tell me, where are you from?",
  "That's cool! What do you do? Like what's your work or study situation?",
  "Awesome! And what made you want to try out AURA today?",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, markOnboardingComplete } = useAuth();
  const { startSession, sendAudioMessage, endSession } = useSession();

  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1-4 = questions, 5 = processing
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  // Check if user already completed onboarding - redirect to dashboard
  useEffect(() => {
    if (user?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Timer for session duration
  useEffect(() => {
    if (currentStep > 0 && currentStep <= ONBOARDING_QUESTIONS.length) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep]);

  // Create onboarding session on start
  const startOnboarding = async () => {
    if (!user) {
      setError('Please wait for authentication to complete...');
      return;
    }

    setIsStarting(true);
    setError('');
    
    try {
      const result = await startSession({
        scenario: 'onboarding',
        interactionMode: 'live',
        sessionType: 'onboarding',
      });
      if (result.success) {
        setSessionId(result.data.sessionId || result.data._id);
        setCurrentStep(1);
        speakText(ONBOARDING_QUESTIONS[0]);
      } else {
        setError(result.error || 'Failed to start onboarding. Please try again.');
      }
    } catch (err) {
      setError('Failed to start onboarding. Please try again.');
      console.error('Onboarding error:', err);
    } finally {
      setIsStarting(false);
    }
  };

  // ElevenLabs TTS via backend
  const speakText = async (text) => {
    setIsAISpeaking(true);
    
    try {
      // Call backend TTS endpoint
      const response = await api.post('/tts/speak', { text }, { responseType: 'blob' });
      
      // Create audio URL and play
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsAISpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsAISpeaking(false);
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser TTS
        fallbackSpeak(text);
      };
      
      await audio.play();
    } catch (err) {
      console.error('ElevenLabs TTS error:', err);
      // Fallback to browser TTS
      fallbackSpeak(text);
    }
  };

  // Fallback browser TTS
  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = () => setIsAISpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsAISpeaking(false), 2000);
    }
  };

  // Start recording user response
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
      
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await processResponse(audioBlob);
      };

      mediaRecorder.start(500);
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
      console.error('Microphone error:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Process the recorded response
  const processResponse = async (audioBlob) => {
    const nextStep = currentStep + 1;
    
    // Send audio to backend and get LLM response
    if (sessionId) {
      try {
        const result = await sendAudioMessage(sessionId, audioBlob);
        
        // If we got an AI response, speak it
        if (result?.success && result?.response) {
          // Check if we've completed all questions
          if (nextStep > ONBOARDING_QUESTIONS.length) {
            await finishOnboarding();
          } else {
            setCurrentStep(nextStep);
            // Speak the AI response
            await speakText(result.response);
          }
          return;
        }
      } catch (err) {
        console.error('Error sending audio:', err);
      }
    }
    
    // Fallback to predefined questions if no AI response
    if (nextStep <= ONBOARDING_QUESTIONS.length) {
      setCurrentStep(nextStep);
      speakText(ONBOARDING_QUESTIONS[nextStep - 1]);
    } else {
      await finishOnboarding();
    }
  };

  // Finish onboarding
  const finishOnboarding = async () => {
    setCurrentStep(ONBOARDING_QUESTIONS.length + 1);

    try {
      // End the session
      if (sessionId) {
        await endSession(sessionId);
      }
      // Mark onboarding as complete in backend
      await api.post('/auth/complete-onboarding', { skipped: false });
      // Update local state to prevent redirect loop
      markOnboardingComplete();
      
      // Redirect to dashboard after brief delay
      setTimeout(() => {
        navigate('/dashboard', { state: { fromOnboarding: true }, replace: true });
      }, 2000);
    } catch (err) {
      console.error('Error finishing onboarding:', err);
      markOnboardingComplete();
      // Still redirect even on error
      setTimeout(() => {
        navigate('/dashboard', { state: { fromOnboarding: true }, replace: true });
      }, 1500);
    }
  };

  // Skip onboarding - mark as completed and go to dashboard
  const skipOnboarding = async () => {
    try {
      // Mark onboarding as complete (skipped) in backend
      await api.post('/auth/complete-onboarding', { skipped: true });
      // Update local state to prevent redirect loop
      markOnboardingComplete();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      markOnboardingComplete();
    }
    navigate('/dashboard', { replace: true });
  };

  // Format elapsed time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Intro screen
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to AURA, {user?.name?.split(' ')[0]}!
            </h1>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Before we begin, I'd love to have a quick chat with you. 
              This isn't a test—just a friendly conversation to help me 
              understand how you naturally communicate.
            </p>

            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 text-left">
                <MessageCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                <p className="text-sm text-primary-800">
                  This takes about 60-90 seconds. Just speak naturally—there are no right or wrong answers.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={startOnboarding}
              disabled={!user || isStarting}
              className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Let's Chat
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              onClick={skipOnboarding}
              disabled={!user}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Processing screen
  if (currentStep > ONBOARDING_QUESTIONS.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Thanks for sharing!
            </h2>

            <p className="text-gray-600 mb-4">
              Preparing your personalized dashboard...
            </p>

            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main conversation screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">Getting to know you</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{formatTime(elapsedTime)}</span>
          <div className="flex gap-1">
            {ONBOARDING_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentStep ? 'bg-primary-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Voice indicator */}
        <div className="w-32 h-32 mb-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
          {isAISpeaking ? (
            <div className="animate-pulse">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
          ) : isRecording ? (
            <div className="animate-pulse">
              <Mic className="w-16 h-16 text-white" />
            </div>
          ) : (
            <Sparkles className="w-16 h-16 text-white" />
          )}
        </div>

        {/* Current question */}
        <div className="max-w-md text-center mb-8">
          <p className="text-white text-lg leading-relaxed">
            {ONBOARDING_QUESTIONS[currentStep - 1]}
          </p>
        </div>

        {/* Status indicators */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm">Listening...</span>
          </div>
        )}

        {isAISpeaking && (
          <div className="flex items-center gap-2 text-primary-400 mb-4">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Speaking...</span>
          </div>
        )}
      </main>

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
        <div className="max-w-md mx-auto">
          {!isAISpeaking && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAISpeaking}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-900'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Tap to finish speaking
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Tap to respond
                </>
              )}
            </button>
          )}

          {isAISpeaking && (
            <div className="text-center text-gray-400 text-sm">
              Wait for me to finish...
            </div>
          )}
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-xl shadow-lg max-w-sm">
          <p className="text-sm">{error}</p>
          <button onClick={() => setError('')} className="absolute top-2 right-2 text-white/80 hover:text-white">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
