import React, { useMemo } from 'react';

interface TimerBarProps {
  timeRemaining: number;
  period: number;
  isActive: boolean;
}

/**
 * Distinctive timer: main progress ring with glow + animated dot + inner ring.
 */
const TimerBar: React.FC<TimerBarProps> = ({ timeRemaining, period, isActive }) => {
  const size = 88;
  const strokeWidth = 4;
  const innerStroke = 1.5;
  const radius = (size - strokeWidth * 2) / 2;
  const innerRadius = radius - 10;
  const circumference = 2 * Math.PI * radius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const progress = useMemo(() => {
    if (!isActive) return 0;
    return timeRemaining / period;
  }, [timeRemaining, period, isActive]);

  const dashOffset = circumference * (1 - progress);
  const innerDashOffset = innerCircumference * (1 - progress);

  const getTheme = () => {
    if (timeRemaining <= 5) return {
      main: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)', inner: '#fca5a5',
      text: 'text-red-400', bg: 'rgba(239, 68, 68, 0.06)',
    };
    if (timeRemaining <= 10) return {
      main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', inner: '#fcd34d',
      text: 'text-amber-400', bg: 'rgba(245, 158, 11, 0.04)',
    };
    return {
      main: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', inner: '#6ee7b7',
      text: 'text-emerald-400', bg: 'rgba(16, 185, 129, 0.04)',
    };
  };

  const theme = getTheme();

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="relative">
        {/* Glow behind ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${theme.bg} 0%, transparent 70%)`,
            transform: 'scale(2)',
            animation: 'pulse-ring 3s ease-in-out infinite',
          }}
        />

        <svg width={size} height={size} className="timer-ring relative z-10">
          {/* Background rings */}
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={innerRadius}
            fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth={innerStroke} />

          {/* Inner progress */}
          <circle cx={size/2} cy={size/2} r={innerRadius}
            fill="none" stroke={theme.inner} strokeWidth={innerStroke}
            strokeLinecap="round" strokeDasharray={innerCircumference}
            strokeDashoffset={innerDashOffset} opacity={0.3}
            className="timer-ring-progress" />

          {/* Main progress */}
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={theme.main} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="timer-ring-progress"
            style={{ filter: `drop-shadow(0 0 8px ${theme.glow})` }} />

          {/* Dot at tip */}
          {progress > 0.03 && (
            <circle
              cx={size/2 + radius * Math.cos(2 * Math.PI * progress - Math.PI/2)}
              cy={size/2 + radius * Math.sin(2 * Math.PI * progress - Math.PI/2)}
              r={2.5} fill="white"
              style={{ filter: `drop-shadow(0 0 4px ${theme.main})`, transition: 'cx 1s linear, cy 1s linear' }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`font-mono text-xl font-bold ${theme.text} tabular-nums`}>
            {timeRemaining}
          </span>
          <span className="text-white/15 text-[8px] uppercase tracking-[0.2em] mt-0.5">sec</span>
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="w-36 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 linear"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${theme.main}, ${theme.inner})`,
            boxShadow: `0 0 8px ${theme.glow}`,
          }}
        />
      </div>
    </div>
  );
};

export default TimerBar;
