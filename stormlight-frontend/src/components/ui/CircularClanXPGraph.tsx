import React from 'react'

interface CircularClanXPGraphProps {
  percentage: number
  size?: number
  strokeWidth?: number
  progressColor?: string
  remainingColor?: string
}

export const CircularClanXPGraph: React.FC<CircularClanXPGraphProps> = ({
  percentage,
  size = 96,
  strokeWidth = 8,
  progressColor = '#2ecc71',
  remainingColor = '#e74c3c'
}) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (normalizedPercentage / 100) * circumference

  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={remainingColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div 
        className="absolute flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-lg font-bold" style={{ color: 'var(--tooltip-text, #cbd5e1)' }}>
          {normalizedPercentage.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
