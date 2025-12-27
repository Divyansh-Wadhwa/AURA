/**
 * Video Perception Hook - Lightweight Version
 * =============================================
 * Extracts behavioral features from video stream using simple canvas analysis.
 * 
 * This version uses a robust canvas-based approach that doesn't rely on
 * heavy WASM modules that can crash in browsers.
 * 
 * Features extracted:
 * - Face presence detection (via brightness/motion in face region)
 * - Eye contact approximation (face centered in frame)
 * - Head motion variance (frame-to-frame pixel changes)
 * - Facial engagement score (motion in face region)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Constants
const FRAME_RATE = 5; // 5 FPS for analysis
const FRAME_INTERVAL = 1000 / FRAME_RATE;

/**
 * Calculate variance of an array of numbers
 */
const calculateVariance = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
};

/**
 * Clamp value to 0-1 range
 */
const clamp = (val) => Math.max(0, Math.min(1, val));

/**
 * Simple face detection using canvas pixel analysis
 * Looks for skin-tone colors in the center region of the frame
 */
const detectFaceSimple = (imageData, width, height) => {
  const data = imageData.data;
  
  // Analyze center region (where face typically is)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const regionSize = Math.min(width, height) * 0.4;
  
  let skinPixels = 0;
  let totalPixels = 0;
  
  const startX = Math.floor(centerX - regionSize / 2);
  const endX = Math.floor(centerX + regionSize / 2);
  const startY = Math.floor(centerY - regionSize / 2);
  const endY = Math.floor(centerY + regionSize / 2);
  
  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Simple skin tone detection (works for various skin tones)
      const isSkinTone = 
        r > 60 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - b > 15;
      
      if (isSkinTone) skinPixels++;
      totalPixels++;
    }
  }
  
  const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
  return skinRatio > 0.15; // Face detected if >15% skin-tone pixels
};

/**
 * Estimate eye contact based on face position in frame
 * If face is centered, assume eye contact
 */
const estimateEyeContact = (imageData, width, height, prevBrightness) => {
  const data = imageData.data;
  
  // Calculate brightness in center region
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const regionSize = Math.min(width, height) * 0.3;
  
  let totalBrightness = 0;
  let pixelCount = 0;
  
  const startX = Math.floor(centerX - regionSize / 2);
  const endX = Math.floor(centerX + regionSize / 2);
  const startY = Math.floor(centerY - regionSize / 2);
  const endY = Math.floor(centerY + regionSize / 2);
  
  for (let y = startY; y < endY; y += 3) {
    for (let x = startX; x < endX; x += 3) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
  }
  
  const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
  
  // If brightness is stable and in good range, assume looking at camera
  const brightnessStable = prevBrightness === null || 
    Math.abs(avgBrightness - prevBrightness) < 30;
  const goodBrightness = avgBrightness > 50 && avgBrightness < 220;
  
  return {
    eyeContact: brightnessStable && goodBrightness,
    brightness: avgBrightness
  };
};

/**
 * Calculate motion between frames
 */
const calculateMotion = (currentData, prevData, width, height) => {
  if (!prevData) return { motion: 0, engagement: 0.3 };
  
  let totalDiff = 0;
  let pixelCount = 0;
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < currentData.length; i += 16) {
    const diff = Math.abs(currentData[i] - prevData[i]);
    totalDiff += diff;
    pixelCount++;
  }
  
  const avgMotion = pixelCount > 0 ? totalDiff / pixelCount / 255 : 0;
  
  // Engagement: moderate motion is good (not too still, not too fidgety)
  // Optimal motion is around 0.02-0.08
  const engagement = avgMotion < 0.01 ? 0.2 : // Too still
                     avgMotion > 0.15 ? 0.3 : // Too fidgety
                     0.4 + avgMotion * 5; // Good range
  
  return { 
    motion: clamp(avgMotion * 10), 
    engagement: clamp(engagement) 
  };
};

/**
 * Main hook for video perception
 */
export const useVideoPerception = (options = {}) => {
  const { enabled = true, onMetricsUpdate } = options;

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [currentMetrics, setCurrentMetrics] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const videoElementRef = useRef(null);
  const intervalRef = useRef(null);
  const frameDataRef = useRef([]);
  const prevImageDataRef = useRef(null);
  const prevBrightnessRef = useRef(null);

  // Initialize (lightweight - just create canvas)
  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    try {
      setError(null);
      
      // Create canvas for frame extraction
      canvasRef.current = document.createElement('canvas');
      ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });

      setIsInitialized(true);
      console.log('[VideoPerception] Initialized (lightweight mode)');
      return true;

    } catch (err) {
      console.error('[VideoPerception] Initialization error:', err);
      setError(err.message);
      return false;
    }
  }, [isInitialized]);

  // Process a single frame
  const processFrame = useCallback((videoElement) => {
    if (!canvasRef.current || !ctxRef.current) {
      return null;
    }

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    // Set canvas size to match video (scaled down for performance)
    const scale = 0.25; // Process at 25% resolution
    const width = Math.floor((videoElement.videoWidth || 640) * scale);
    const height = Math.floor((videoElement.videoHeight || 480) * scale);
    
    canvas.width = width;
    canvas.height = height;

    // Draw current frame to canvas
    ctx.drawImage(videoElement, 0, 0, width, height);

    const timestamp = Date.now();
    let frameData = {
      timestamp,
      faceDetected: false,
      eyeContact: false,
      headMotionDelta: 0,
      facialActivity: 0.3 // Default moderate activity
    };

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Simple face detection
      frameData.faceDetected = detectFaceSimple(imageData, width, height);
      
      // Eye contact estimation
      if (frameData.faceDetected) {
        const eyeResult = estimateEyeContact(
          imageData, width, height, prevBrightnessRef.current
        );
        frameData.eyeContact = eyeResult.eyeContact;
        prevBrightnessRef.current = eyeResult.brightness;
      }
      
      // Motion and engagement calculation
      const motionResult = calculateMotion(
        imageData.data, 
        prevImageDataRef.current,
        width, 
        height
      );
      frameData.headMotionDelta = motionResult.motion;
      frameData.facialActivity = frameData.faceDetected ? motionResult.engagement : 0;
      
      // Store for next frame comparison
      prevImageDataRef.current = new Uint8ClampedArray(imageData.data);

    } catch (err) {
      console.warn('[VideoPerception] Frame processing error:', err);
    }

    return frameData;
  }, []);

  // Aggregate all frame data into session-level metrics
  const aggregateMetrics = useCallback(() => {
    const frames = frameDataRef.current;
    
    if (frames.length === 0) {
      return {
        video_available: 0,
        face_presence_ratio: 0,
        eye_contact_ratio: 0,
        head_motion_variance: 0,
        facial_engagement_score: 0,
        total_frames: 0
      };
    }

    const totalFrames = frames.length;
    const framesWithFace = frames.filter(f => f.faceDetected);
    const framesWithEyeContact = framesWithFace.filter(f => f.eyeContact);

    // Calculate ratios
    const facePresenceRatio = framesWithFace.length / totalFrames;
    const eyeContactRatio = framesWithFace.length > 0 
      ? framesWithEyeContact.length / framesWithFace.length 
      : 0;

    // Calculate head motion variance
    const headMotionDeltas = frames.map(f => f.headMotionDelta).filter(d => d > 0);
    const headMotionVariance = calculateVariance(headMotionDeltas);

    // Calculate facial engagement score (mean of facial activity)
    const facialActivities = framesWithFace.map(f => f.facialActivity);
    const facialEngagementScore = facialActivities.length > 0
      ? facialActivities.reduce((a, b) => a + b, 0) / facialActivities.length
      : 0;

    return {
      video_available: 1,
      face_presence_ratio: Math.round(clamp(facePresenceRatio) * 1000) / 1000,
      eye_contact_ratio: Math.round(clamp(eyeContactRatio) * 1000) / 1000,
      head_motion_variance: Math.round(clamp(headMotionVariance) * 1000) / 1000,
      facial_engagement_score: Math.round(clamp(facialEngagementScore) * 1000) / 1000,
      total_frames: totalFrames
    };
  }, []);

  // Start analyzing video stream
  const startAnalysis = useCallback(async (videoElement) => {
    if (!enabled || isAnalyzing) return false;

    // Initialize if needed
    if (!isInitialized) {
      const success = await initialize();
      if (!success) return false;
    }

    videoElementRef.current = videoElement;
    frameDataRef.current = [];
    prevImageDataRef.current = null;
    prevBrightnessRef.current = null;
    setIsAnalyzing(true);

    console.log('[VideoPerception] Starting analysis at', FRAME_RATE, 'FPS');

    // Start frame extraction interval
    intervalRef.current = setInterval(() => {
      if (!videoElementRef.current || videoElementRef.current.paused) return;

      const frameData = processFrame(videoElementRef.current);
      if (frameData) {
        frameDataRef.current.push(frameData);

        // Update current metrics periodically
        if (frameDataRef.current.length % 5 === 0) {
          const aggregated = aggregateMetrics();
          setCurrentMetrics(aggregated);
          if (onMetricsUpdate) {
            onMetricsUpdate(aggregated);
          }
        }
      }
    }, FRAME_INTERVAL);

    return true;
  }, [enabled, isAnalyzing, isInitialized, initialize, processFrame, aggregateMetrics, onMetricsUpdate]);

  // Stop analysis and return aggregated metrics
  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsAnalyzing(false);
    const finalMetrics = aggregateMetrics();
    console.log('[VideoPerception] Analysis stopped. Final metrics:', finalMetrics);
    return finalMetrics;
  }, [aggregateMetrics]);

  // Get current aggregated metrics without stopping
  const getMetrics = useCallback(() => {
    return aggregateMetrics();
  }, [aggregateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isAnalyzing,
    isInitialized,
    error,
    currentMetrics,
    
    // Methods
    initialize,
    startAnalysis,
    stopAnalysis,
    getMetrics,
    
    // Config
    frameRate: FRAME_RATE
  };
};

export default useVideoPerception;
