import React, { useEffect, useState } from 'react';

export default function HealthRing({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    // Animate score from 0 to target
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  let color = '#34d399'; // green
  if (animatedScore < 60) color = '#f87171'; // red
  else if (animatedScore < 85) color = '#fbbf24'; // yellow

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            transition: 'stroke-dashoffset 1.5s ease-out'
          }}
        />
      </svg>
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <span style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1 }}>{Math.round(animatedScore)}</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>out of 100</span>
      </div>
    </div>
  );
}
