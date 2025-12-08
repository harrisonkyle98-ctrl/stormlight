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
  progressColor = '#2ecc71',
  remainingColor = '#1b8a4a'
}) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage))
  const radius = size / 2
  const centerX = size / 2
  const centerY = size / 2
  
  // Calculate the angle for the progress slice (in radians)
  // Start from top (12 o'clock position) and go clockwise
  const progressAngle = (normalizedPercentage / 100) * 2 * Math.PI
  
  // Calculate end point of the progress arc
  // Start from top (-90 degrees or -PI/2 radians)
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + progressAngle
  
  // Calculate the arc path for the progress slice
  const progressEndX = centerX + radius * Math.cos(endAngle)
  const progressEndY = centerY + radius * Math.sin(endAngle)
  
  // Large arc flag: 1 if angle > 180 degrees, 0 otherwise
  const largeArcFlag = progressAngle > Math.PI ? 1 : 0
  
  // Create pie slice path for progress (from center, to top, arc to end, back to center)
  const progressPath = normalizedPercentage > 0 && normalizedPercentage < 100
    ? `M ${centerX} ${centerY} L ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${progressEndX} ${progressEndY} Z`
    : normalizedPercentage >= 100
    ? `M ${centerX} ${centerY} m -${radius} 0 a ${radius} ${radius} 0 1 1 ${radius * 2} 0 a ${radius} ${radius} 0 1 1 -${radius * 2} 0`
    : ''
  
  // Create pie slice path for remaining (from center, to progress end, arc to top, back to center)
  const remainingPath = normalizedPercentage > 0 && normalizedPercentage < 100
    ? `M ${centerX} ${centerY} L ${progressEndX} ${progressEndY} A ${radius} ${radius} 0 ${1 - largeArcFlag} 1 ${centerX} ${centerY - radius} Z`
    : normalizedPercentage <= 0
    ? `M ${centerX} ${centerY} m -${radius} 0 a ${radius} ${radius} 0 1 1 ${radius * 2} 0 a ${radius} ${radius} 0 1 1 -${radius * 2} 0`
    : ''

  return (
    <div 
      className="flex flex-col items-center justify-center relative"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Remaining slice (darker green) */}
        {remainingPath && (
          <path
            d={remainingPath}
            fill={remainingColor}
            className="transition-all duration-500 ease-out"
          />
        )}
        {/* Progress slice (brighter green) */}
        {progressPath && (
          <path
            d={progressPath}
            fill={progressColor}
            className="transition-all duration-500 ease-out"
          />
        )}
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
