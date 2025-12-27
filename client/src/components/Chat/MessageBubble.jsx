import { useState, useEffect, useRef } from 'react';
import { User, Bot, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';

const AudioPlayer = ({ audioUrl, token, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay && !hasAutoPlayed.current) {
        hasAutoPlayed.current = true;
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    };
    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [autoPlay]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Playback failed');
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  // Build audio URL with auth token
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const authToken = localStorage.getItem('aura_token');
  let fullAudioUrl = audioUrl;
  if (audioUrl?.startsWith('/api/')) {
    const baseUrl = `${API_URL.replace('/api', '')}${audioUrl}`;
    fullAudioUrl = authToken ? `${baseUrl}?token=${authToken}` : baseUrl;
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 mt-1">
        Audio unavailable
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-700">
      <audio ref={audioRef} src={fullAudioUrl} preload="metadata" />
      
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-400 flex items-center justify-center transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 h-1 bg-dark-600 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={toggleMute}
        className="p-1 text-dark-400 hover:text-white transition-colors"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

const MessageBubble = ({ role, content, audioUrl, autoPlayAudio = false }) => {
  const isUser = role === 'user';
  const token = localStorage.getItem('aura_token');

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-accent-500 to-primary-500'
            : 'bg-gradient-to-br from-primary-600 to-secondary-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-md'
            : 'bg-dark-800 text-dark-100 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        {audioUrl && !isUser && (
          <AudioPlayer audioUrl={audioUrl} token={token} autoPlay={autoPlayAudio} />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
