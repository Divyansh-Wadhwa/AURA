import { useState, useRef, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAudioPlayer = (options = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [volume, setVolumeState] = useState(options.initialVolume || 1);
  const [playbackRate, setPlaybackRateState] = useState(options.initialPlaybackRate || 1);

  const audioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingQueueRef = useRef(false);

  const { autoPlay = true, onEnded, onError } = options;

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      onEnded?.();
      
      // Play next in queue
      playNextInQueue();
    };

    const handleError = (e) => {
      const errorMessage = e.target?.error?.message || 'Audio playback error';
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(errorMessage);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update playback rate when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length > 0) {
      const nextAudio = audioQueueRef.current.shift();
      playAudio(nextAudio.url, nextAudio.token);
    } else {
      isPlayingQueueRef.current = false;
    }
  }, []);

  const playAudio = useCallback(async (url, token) => {
    if (!audioRef.current) return;

    try {
      setError(null);
      setIsLoading(true);
      setCurrentTime(0);

      // Build full URL if it's a relative path
      let audioUrl = url;
      if (url.startsWith('/api/')) {
        audioUrl = `${API_URL.replace('/api', '')}${url}`;
      }

      // Add auth token to request if provided
      if (token) {
        const response = await fetch(audioUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
      }

      audioRef.current.src = audioUrl;
      await audioRef.current.load();
      
      if (autoPlay) {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      onError?.(err.message);
    }
  }, [autoPlay, onError]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(audioRef.current.currentTime);
  }, [duration]);

  const setVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    setPlaybackRateState(clampedRate);
  }, []);

  const queueAudio = useCallback((url, token) => {
    audioQueueRef.current.push({ url, token });
    
    if (!isPlayingQueueRef.current && !isPlaying) {
      isPlayingQueueRef.current = true;
      playNextInQueue();
    }
  }, [isPlaying, playNextInQueue]);

  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  return {
    isPlaying,
    isPaused,
    isLoading,
    currentTime,
    duration,
    error,
    volume,
    playbackRate,
    playAudio,
    play,
    pause,
    stop,
    toggle,
    seek,
    setVolume,
    setPlaybackRate,
    queueAudio,
    clearQueue,
    progress: duration > 0 ? (currentTime / duration) * 100 : 0,
  };
};

export default useAudioPlayer;
