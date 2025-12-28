import { useEffect, useRef, useState } from 'react';
import { AVATAR_STATES } from '../../hooks/useAvatarController';

const InterviewerAvatar = ({
  state = AVATAR_STATES.IDLE,
  mouthOpenness = 0,
  eyeState = 'open',
  headTilt = 0,
  eyebrowRaise = 0,
  className = '',
}) => {
  const [breatheOffset, setBreatheOffset] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const animationRef = useRef(null);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const time = Date.now() * 0.001;
      
      // Subtle breathing
      setBreatheOffset(Math.sin(time * 1.2) * 3);
      
      // Glow pulse when speaking
      if (state === AVATAR_STATES.SPEAKING) {
        const pulse = Math.abs(Math.sin(time * 6) * 0.4 + Math.sin(time * 10) * 0.3);
        setGlowIntensity(0.3 + pulse);
      } else if (state === AVATAR_STATES.LISTENING) {
        setGlowIntensity(0.2 + Math.sin(time * 2) * 0.1);
      } else {
        setGlowIntensity(0.15);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  // Colors - modern, professional palette
  const primaryColor = '#6366F1'; // Indigo
  const secondaryColor = '#8B5CF6'; // Purple
  const accentColor = '#F59E0B'; // Amber for glow
  const darkColor = '#1E1B4B'; // Dark indigo

  // Sound wave bars based on mouth openness
  const getWaveBars = () => {
    const bars = [];
    const barCount = 5;
    
    for (let i = 0; i < barCount; i++) {
      const baseHeight = 8;
      const maxHeight = 25;
      const phase = (Date.now() * 0.008 + i * 0.5);
      const waveHeight = state === AVATAR_STATES.SPEAKING 
        ? baseHeight + Math.abs(Math.sin(phase)) * (maxHeight - baseHeight) * mouthOpenness
        : baseHeight + Math.sin(Date.now() * 0.002 + i) * 2;
      
      bars.push(
        <rect
          key={i}
          x={130 + i * 10}
          y={185 - waveHeight / 2}
          width="6"
          height={waveHeight}
          rx="3"
          fill={state === AVATAR_STATES.SPEAKING ? accentColor : primaryColor}
          opacity={state === AVATAR_STATES.SPEAKING ? 0.9 : 0.5}
        />
      );
    }
    return bars;
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full max-w-[280px] max-h-[280px]"
        style={{
          transform: `rotate(${headTilt * 0.5}deg) translateY(${breatheOffset}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <defs>
          {/* Gradient for avatar body */}
          <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          
          {/* Glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Outer ring gradient */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity={glowIntensity} />
            <stop offset="50%" stopColor={primaryColor} stopOpacity={glowIntensity * 0.5} />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity={glowIntensity} />
          </linearGradient>
        </defs>

        {/* Outer glow ring */}
        <circle
          cx="150"
          cy="150"
          r="130"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="4"
          opacity={glowIntensity}
        />
        
        {/* Second ring */}
        <circle
          cx="150"
          cy="150"
          r="120"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Main avatar circle - abstract head */}
        <circle
          cx="150"
          cy="130"
          r="70"
          fill="url(#avatarGradient)"
          filter={state === AVATAR_STATES.SPEAKING ? "url(#glow)" : "none"}
        />

        {/* Abstract face elements */}
        {/* Eyes - simple elegant dots */}
        <g>
          {eyeState === 'closed' ? (
            <>
              <path
                d="M 120 120 Q 130 125 140 120"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 160 120 Q 170 125 180 120"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <circle cx="130" cy="118" r="8" fill="white" opacity="0.95" />
              <circle cx="170" cy="118" r="8" fill="white" opacity="0.95" />
              {/* Pupils */}
              <circle cx="130" cy="118" r="4" fill={darkColor} />
              <circle cx="170" cy="118" r="4" fill={darkColor} />
              {/* Eye shine */}
              <circle cx="132" cy="116" r="2" fill="white" opacity="0.8" />
              <circle cx="172" cy="116" r="2" fill="white" opacity="0.8" />
            </>
          )}
        </g>

        {/* Eyebrows - subtle arcs */}
        <g style={{ transform: `translateY(${-eyebrowRaise * 5}px)` }}>
          <path
            d="M 115 100 Q 130 95 145 102"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 155 102 Q 170 95 185 100"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Mouth area - sound wave visualizer */}
        <g>
          {state === AVATAR_STATES.SPEAKING ? (
            getWaveBars()
          ) : (
            /* Subtle smile when not speaking */
            <path
              d="M 135 150 Q 150 160 165 150"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.7"
            />
          )}
        </g>

        {/* Body/shoulders hint */}
        <ellipse
          cx="150"
          cy="240"
          rx="55"
          ry="35"
          fill="url(#avatarGradient)"
          opacity="0.8"
        />

        {/* Neck connector */}
        <rect
          x="135"
          y="195"
          width="30"
          height="50"
          fill={primaryColor}
          opacity="0.8"
        />

        {/* Status indicator ring */}
        {state === AVATAR_STATES.SPEAKING && (
          <circle
            cx="150"
            cy="130"
            r="75"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity={glowIntensity}
          >
            <animate
              attributeName="r"
              values="72;80;72"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.2;0.6"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {state === AVATAR_STATES.LISTENING && (
          <>
            <circle
              cx="150"
              cy="130"
              r="75"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              opacity="0.5"
            >
              <animate
                attributeName="r"
                values="72;78;72"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Listening indicator */}
            <circle cx="215" cy="85" r="6" fill="#10B981" opacity="0.8">
              <animate
                attributeName="opacity"
                values="0.8;0.4;0.8"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          </>
        )}

        {state === AVATAR_STATES.THINKING && (
          <g>
            <circle cx="200" cy="80" r="4" fill={primaryColor} opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="215" cy="70" r="3" fill={primaryColor} opacity="0.6">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="228" cy="65" r="2" fill={primaryColor} opacity="0.4">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
};

export default InterviewerAvatar;
