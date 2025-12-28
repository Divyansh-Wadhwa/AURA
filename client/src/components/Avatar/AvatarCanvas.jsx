import { useEffect, useCallback } from 'react';
import InterviewerAvatar from './InterviewerAvatar';
import useAvatarController, { AVATAR_STATES } from '../../hooks/useAvatarController';

const AvatarCanvas = ({
  isAISpeaking = false,
  isUserRecording = false,
  isThinking = false,
  onAudioPlay,
  onAudioEnd,
  className = '',
}) => {
  const {
    state,
    mouthOpenness,
    eyeState,
    headTilt,
    eyebrowRaise,
    setAvatarState,
  } = useAvatarController();

  // Sync external state with avatar state
  useEffect(() => {
    if (isAISpeaking) {
      setAvatarState(AVATAR_STATES.SPEAKING);
    } else if (isThinking) {
      setAvatarState(AVATAR_STATES.THINKING);
    } else if (isUserRecording) {
      setAvatarState(AVATAR_STATES.LISTENING);
    } else {
      setAvatarState(AVATAR_STATES.IDLE);
    }
  }, [isAISpeaking, isUserRecording, isThinking, setAvatarState]);

  // Get state label for display
  const getStateLabel = () => {
    switch (state) {
      case AVATAR_STATES.SPEAKING:
        return 'Speaking...';
      case AVATAR_STATES.LISTENING:
        return 'Listening...';
      case AVATAR_STATES.THINKING:
        return 'Thinking...';
      default:
        return 'Ready';
    }
  };

  const getStateColor = () => {
    switch (state) {
      case AVATAR_STATES.SPEAKING:
        return 'text-primary-400';
      case AVATAR_STATES.LISTENING:
        return 'text-green-400';
      case AVATAR_STATES.THINKING:
        return 'text-yellow-400';
      default:
        return 'text-dark-400';
    }
  };

  return (
    <div className={`w-full h-full bg-gradient-to-b from-dark-900 to-dark-950 flex flex-col items-center justify-center ${className}`}>
      {/* Avatar container */}
      <div className="relative w-72 h-80">
        <InterviewerAvatar
          state={state}
          mouthOpenness={mouthOpenness}
          eyeState={eyeState}
          headTilt={headTilt}
          eyebrowRaise={eyebrowRaise}
        />
      </div>

      {/* State indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          state === AVATAR_STATES.SPEAKING ? 'bg-primary-500 animate-pulse' :
          state === AVATAR_STATES.LISTENING ? 'bg-green-500 animate-pulse' :
          state === AVATAR_STATES.THINKING ? 'bg-yellow-500 animate-pulse' :
          'bg-dark-500'
        }`} />
        <span className={`text-sm font-medium ${getStateColor()}`}>
          {getStateLabel()}
        </span>
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default AvatarCanvas;
