import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle system for the blob
const ParticleBlob = ({ 
  isSpeaking = false, 
  isListening = false,
  audioLevel = 0,
  intensity = 1 
}) => {
  const pointsRef = useRef();
  const materialRef = useRef();
  
  // Animation state
  const animState = useRef({
    targetScale: 1,
    currentScale: 1,
    targetBrightness: 0.6,
    currentBrightness: 0.6,
    bobOffset: 0,
    breatheOffset: 0,
  });

  // Generate particle positions in a spherical distribution
  const { positions, originalPositions, count } = useMemo(() => {
    const count = 800; // Number of particles
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      // Vary radius for depth - denser at center
      const radiusVariation = 0.7 + Math.random() * 0.3;
      const radius = 1.5 * radiusVariation;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }
    
    return { positions, originalPositions, count };
  }, []);

  // Update animation targets based on state
  useEffect(() => {
    const state = animState.current;
    
    if (isSpeaking) {
      // Expand and brighten when speaking
      const expansionFactor = 1 + (audioLevel * 0.3 * intensity);
      state.targetScale = Math.min(1.4, expansionFactor);
      state.targetBrightness = Math.min(1.0, 0.7 + audioLevel * 0.3);
    } else if (isListening) {
      // Subtle pulse when listening
      state.targetScale = 1.05;
      state.targetBrightness = 0.65;
    } else {
      // Idle state - return to rest
      state.targetScale = 1.0;
      state.targetBrightness = 0.6;
    }
  }, [isSpeaking, isListening, audioLevel, intensity]);

  // Animation loop
  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return;
    
    const anim = animState.current;
    const time = state.clock.elapsedTime;
    
    // Smooth interpolation for scale and brightness
    const lerpFactor = isSpeaking ? 0.08 : 0.03;
    anim.currentScale += (anim.targetScale - anim.currentScale) * lerpFactor;
    anim.currentBrightness += (anim.targetBrightness - anim.currentBrightness) * lerpFactor;
    
    // Organic bobbing motion (sinusoidal)
    const bobSpeed = isSpeaking ? 0.8 : 0.4;
    const bobAmplitude = isSpeaking ? 0.15 : 0.08;
    anim.bobOffset = Math.sin(time * bobSpeed) * bobAmplitude;
    
    // Breathing effect
    const breatheSpeed = 0.3;
    const breatheAmplitude = 0.02;
    anim.breatheOffset = Math.sin(time * breatheSpeed) * breatheAmplitude;
    
    // Update particle positions
    const positions = pointsRef.current.geometry.attributes.position.array;
    const scale = anim.currentScale + anim.breatheOffset;
    
    for (let i = 0; i < count; i++) {
      const ox = originalPositions[i * 3];
      const oy = originalPositions[i * 3 + 1];
      const oz = originalPositions[i * 3 + 2];
      
      // Apply scale with slight per-particle variation for organic feel
      const particleVariation = 1 + Math.sin(time * 0.5 + i * 0.1) * 0.02;
      
      positions[i * 3] = ox * scale * particleVariation;
      positions[i * 3 + 1] = oy * scale * particleVariation + anim.bobOffset;
      positions[i * 3 + 2] = oz * scale * particleVariation;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Update material opacity/brightness
    materialRef.current.opacity = anim.currentBrightness;
    
    // Subtle rotation
    pointsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.04}
        color="#F5A623"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Glow effect layer
const GlowLayer = ({ isSpeaking, audioLevel }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Pulsing glow
    const baseScale = isSpeaking ? 2.2 + audioLevel * 0.5 : 2.0;
    const pulse = Math.sin(time * 0.5) * 0.1;
    meshRef.current.scale.setScalar(baseScale + pulse);
    
    // Adjust opacity
    meshRef.current.material.opacity = isSpeaking ? 0.15 + audioLevel * 0.1 : 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#F5A623"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// Main VoiceBlob component
const VoiceBlob = ({ 
  isSpeaking = false, 
  isListening = false, 
  isRecording = false,
  audioLevel = 0,
  className = '' 
}) => {
  // Determine intensity based on combined states
  const intensity = isRecording ? 1.2 : 1;
  const effectiveAudioLevel = Math.min(1, audioLevel);

  return (
    <div className={`w-full h-full bg-dark-950 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#F5A623" />
        
        <ParticleBlob 
          isSpeaking={isSpeaking}
          isListening={isListening}
          audioLevel={effectiveAudioLevel}
          intensity={intensity}
        />
        
        <GlowLayer 
          isSpeaking={isSpeaking}
          audioLevel={effectiveAudioLevel}
        />
      </Canvas>
      
      {/* Subtle vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
};

export default VoiceBlob;
