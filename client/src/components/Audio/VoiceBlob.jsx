import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle system for the blob - smaller, more reactive
const ParticleBlob = ({ 
  isSpeaking = false, 
  isListening = false,
  isRecording = false,
}) => {
  const pointsRef = useRef();
  const materialRef = useRef();

  // Generate particle positions in a spherical distribution
  const { positions, originalPositions, count } = useMemo(() => {
    const count = 600; // Fewer particles for smaller blob
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      // Vary radius for depth - denser at center
      const radiusVariation = 0.7 + Math.random() * 0.3;
      const radius = 0.8 * radiusVariation; // Smaller base radius
      
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

  // Animation loop with simulated voice reactivity
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;
    
    const time = state.clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position.array;
    
    // Simulated audio level using multiple sine waves for organic feel
    let simulatedLevel = 0;
    let targetBrightness = 0.5;
    
    if (isSpeaking) {
      // Simulate speech patterns with layered oscillations
      const wave1 = Math.sin(time * 8) * 0.3;  // Fast vocal rhythm
      const wave2 = Math.sin(time * 12) * 0.2; // Higher frequency detail
      const wave3 = Math.sin(time * 3) * 0.15; // Slower envelope
      const wave4 = Math.sin(time * 20) * 0.1; // Subtle high-freq
      
      // Combine waves and add randomness for natural feel
      simulatedLevel = Math.abs(wave1 + wave2 + wave3 + wave4);
      simulatedLevel = Math.min(1, simulatedLevel + Math.random() * 0.1);
      targetBrightness = 0.7 + simulatedLevel * 0.3;
    } else if (isRecording) {
      // User recording - gentle pulse
      simulatedLevel = 0.2 + Math.sin(time * 4) * 0.15;
      targetBrightness = 0.6;
    } else if (isListening) {
      // Idle listening - subtle breathing
      simulatedLevel = 0.05 + Math.sin(time * 1.5) * 0.05;
      targetBrightness = 0.5;
    }
    
    // Calculate scale based on simulated level
    const baseScale = 1.0;
    const expansionAmount = isSpeaking ? simulatedLevel * 0.35 : simulatedLevel * 0.15;
    const scale = baseScale + expansionAmount;
    
    // Gentle bobbing
    const bobSpeed = isSpeaking ? 2 : 0.8;
    const bobAmount = isSpeaking ? 0.03 : 0.02;
    const bobOffset = Math.sin(time * bobSpeed) * bobAmount;
    
    // Update particle positions
    for (let i = 0; i < count; i++) {
      const ox = originalPositions[i * 3];
      const oy = originalPositions[i * 3 + 1];
      const oz = originalPositions[i * 3 + 2];
      
      // Per-particle variation for organic movement
      const particlePhase = i * 0.05;
      const particleWave = isSpeaking 
        ? Math.sin(time * 6 + particlePhase) * 0.03 * simulatedLevel
        : Math.sin(time * 0.5 + particlePhase) * 0.01;
      
      const particleScale = scale + particleWave;
      
      positions[i * 3] = ox * particleScale;
      positions[i * 3 + 1] = oy * particleScale + bobOffset;
      positions[i * 3 + 2] = oz * particleScale;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Smooth brightness transition
    const currentOpacity = materialRef.current.opacity;
    materialRef.current.opacity += (targetBrightness - currentOpacity) * 0.1;
    
    // Slow rotation
    pointsRef.current.rotation.y += 0.002;
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
        size={0.025}
        color="#F5A623"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Subtle glow effect layer
const GlowLayer = ({ isSpeaking }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Simulated pulsing glow synced with speech
    let glowScale = 1.0;
    let glowOpacity = 0.08;
    
    if (isSpeaking) {
      const pulse = Math.abs(Math.sin(time * 8) * 0.15 + Math.sin(time * 12) * 0.1);
      glowScale = 1.0 + pulse * 0.3;
      glowOpacity = 0.1 + pulse * 0.08;
    } else {
      glowScale = 1.0 + Math.sin(time * 1.5) * 0.05;
    }
    
    meshRef.current.scale.setScalar(glowScale);
    meshRef.current.material.opacity += (glowOpacity - meshRef.current.material.opacity) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.9, 32, 32]} />
      <meshBasicMaterial
        color="#F5A623"
        transparent
        opacity={0.08}
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
  className = '' 
}) => {
  return (
    <div className={`w-full h-full bg-dark-950 flex items-center justify-center ${className}`}>
      <div className="w-64 h-64 relative">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.4} color="#F5A623" />
          
          <ParticleBlob 
            isSpeaking={isSpeaking}
            isListening={isListening}
            isRecording={isRecording}
          />
          
          <GlowLayer isSpeaking={isSpeaking} />
        </Canvas>
      </div>
    </div>
  );
};

export default VoiceBlob;
