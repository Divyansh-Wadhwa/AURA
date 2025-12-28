import { useState, useCallback, useRef, useEffect } from 'react';

// Avatar states
export const AVATAR_STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  ERROR: 'ERROR',
};

// Viseme mappings for lip sync
const VISEME_SHAPES = {
  silent: 0,      // Closed mouth
  aa: 0.9,        // Wide open (A, E)
  ee: 0.6,        // Medium open (I)
  oo: 0.5,        // Rounded (O, U)
  closed: 0.1,    // M, B, P
};

export const useAvatarController = () => {
  const [state, setState] = useState(AVATAR_STATES.IDLE);
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [eyeState, setEyeState] = useState('open'); // open, closed, halfClosed
  const [headTilt, setHeadTilt] = useState(0);
  const [eyebrowRaise, setEyebrowRaise] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const blinkTimeoutRef = useRef(null);
  const lastBlinkRef = useRef(Date.now());
  
  // Initialize audio context for lip sync
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Analyze audio for lip sync
  const analyzeAudio = useCallback((audioElement) => {
    if (!audioElement) return null;
    
    try {
      const audioContext = initAudioContext();
      
      // Check if already connected
      if (analyserRef.current) {
        return analyserRef.current;
      }
      
      const source = audioContext.createMediaElementSource(audioElement);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyserRef.current = analyser;
      
      return analyser;
    } catch (err) {
      console.error('[AvatarController] Audio analysis error:', err);
      return null;
    }
  }, [initAudioContext]);

  // Update mouth based on audio amplitude
  const updateMouthFromAudio = useCallback(() => {
    if (!analyserRef.current || state !== AVATAR_STATES.SPEAKING) {
      return;
    }
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average amplitude
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    
    // Normalize to 0-1 range with some smoothing
    const normalizedLevel = Math.min(1, average / 100);
    
    // Add some variation for natural feel
    const variation = Math.sin(Date.now() * 0.01) * 0.1;
    const mouthValue = Math.max(0, Math.min(1, normalizedLevel + variation));
    
    setMouthOpenness(mouthValue);
    
    // Subtle eyebrow movement on emphasis
    if (normalizedLevel > 0.6) {
      setEyebrowRaise(0.2);
    } else {
      setEyebrowRaise(0);
    }
    
    animationFrameRef.current = requestAnimationFrame(updateMouthFromAudio);
  }, [state]);

  // Simulated lip sync when no audio analysis available
  const simulateLipSync = useCallback(() => {
    if (state !== AVATAR_STATES.SPEAKING) {
      setMouthOpenness(0);
      return;
    }
    
    const time = Date.now() * 0.001;
    
    // Layered waves for natural speech pattern
    const wave1 = Math.sin(time * 8) * 0.4;
    const wave2 = Math.sin(time * 12) * 0.25;
    const wave3 = Math.sin(time * 4) * 0.15;
    
    const combined = Math.abs(wave1 + wave2 + wave3);
    const mouthValue = Math.min(1, combined + Math.random() * 0.1);
    
    setMouthOpenness(mouthValue);
    
    // Occasional eyebrow raise
    if (Math.random() < 0.02) {
      setEyebrowRaise(0.3);
      setTimeout(() => setEyebrowRaise(0), 300);
    }
    
    animationFrameRef.current = requestAnimationFrame(simulateLipSync);
  }, [state]);

  // Blinking logic
  const scheduleNextBlink = useCallback(() => {
    const delay = 2000 + Math.random() * 4000; // 2-6 seconds
    
    blinkTimeoutRef.current = setTimeout(() => {
      if (state !== AVATAR_STATES.ERROR) {
        setEyeState('closed');
        setTimeout(() => {
          setEyeState('open');
          scheduleNextBlink();
        }, 150);
      }
    }, delay);
  }, [state]);

  // Idle animation
  const runIdleAnimation = useCallback(() => {
    if (state !== AVATAR_STATES.IDLE && state !== AVATAR_STATES.LISTENING) {
      return;
    }
    
    const time = Date.now() * 0.001;
    
    // Subtle head movement
    const tilt = Math.sin(time * 0.5) * 2;
    setHeadTilt(tilt);
    
    // Subtle breathing through slight vertical movement
    animationFrameRef.current = requestAnimationFrame(runIdleAnimation);
  }, [state]);

  // State change handler
  const setAvatarState = useCallback((newState) => {
    console.log('[AvatarController] State change:', state, '->', newState);
    setState(newState);
    
    // Cancel ongoing animations
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Reset values
    setMouthOpenness(0);
    setEyebrowRaise(0);
    
    switch (newState) {
      case AVATAR_STATES.IDLE:
        runIdleAnimation();
        break;
      case AVATAR_STATES.LISTENING:
        // Slight head tilt when listening
        setHeadTilt(3);
        runIdleAnimation();
        break;
      case AVATAR_STATES.THINKING:
        // Eyes look away slightly
        setHeadTilt(-2);
        break;
      case AVATAR_STATES.SPEAKING:
        setHeadTilt(0);
        simulateLipSync();
        break;
      case AVATAR_STATES.ERROR:
        setMouthOpenness(0);
        setEyeState('halfClosed');
        break;
      default:
        break;
    }
  }, [state, runIdleAnimation, simulateLipSync]);

  // Play speech with lip sync
  const playSpeech = useCallback((audioElement) => {
    if (!audioElement) return;
    
    setAvatarState(AVATAR_STATES.SPEAKING);
    
    // Try to analyze actual audio
    const analyser = analyzeAudio(audioElement);
    if (analyser) {
      updateMouthFromAudio();
    }
    
    // Listen for audio end
    const handleEnded = () => {
      setAvatarState(AVATAR_STATES.IDLE);
      audioElement.removeEventListener('ended', handleEnded);
    };
    
    audioElement.addEventListener('ended', handleEnded);
  }, [setAvatarState, analyzeAudio, updateMouthFromAudio]);

  // Start blinking on mount
  useEffect(() => {
    scheduleNextBlink();
    
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleNextBlink]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    state,
    mouthOpenness,
    eyeState,
    headTilt,
    eyebrowRaise,
    setAvatarState,
    playSpeech,
    AVATAR_STATES,
  };
};

export default useAvatarController;
