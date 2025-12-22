import { useState, useRef, useCallback } from 'react';

export const useMediaRecorder = (options = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkIndexRef = useRef(0);

  const {
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 128000,
    timeslice = 5000,
    onChunkAvailable,
  } = options;

  const startRecording = useCallback(async (existingStream = null) => {
    try {
      setError(null);
      chunkIndexRef.current = 0;
      setAudioChunks([]);

      let stream = existingStream;
      
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
        audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunk = event.data;
          setAudioChunks((prev) => [...prev, chunk]);
          
          if (onChunkAvailable) {
            chunk.arrayBuffer().then((buffer) => {
              onChunkAvailable(buffer, chunkIndexRef.current);
              chunkIndexRef.current += 1;
            });
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(event.error?.message || 'Recording error');
        setIsRecording(false);
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
      };

      mediaRecorder.start(timeslice);
      setIsRecording(true);

      return true;
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      return false;
    }
  }, [mimeType, audioBitsPerSecond, timeslice, onChunkAvailable]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          setIsRecording(false);
          resolve(audioChunks);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(audioChunks);
      }
    });
  }, [isRecording, audioChunks]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  }, []);

  const getAudioBlob = useCallback(() => {
    if (audioChunks.length === 0) return null;
    return new Blob(audioChunks, { type: mimeType });
  }, [audioChunks, mimeType]);

  const getAudioUrl = useCallback(() => {
    const blob = getAudioBlob();
    return blob ? URL.createObjectURL(blob) : null;
  }, [getAudioBlob]);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    setAudioChunks([]);
    setIsRecording(false);
    setError(null);
    chunkIndexRef.current = 0;
  }, []);

  return {
    isRecording,
    audioChunks,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    getAudioUrl,
    cleanup,
    chunkCount: audioChunks.length,
  };
};

export default useMediaRecorder;
