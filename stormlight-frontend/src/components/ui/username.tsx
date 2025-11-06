import { useEffect, useState } from 'react'

interface UsernameProps {
  username: string
  className?: string
  style?: React.CSSProperties
}

interface BadgeColorInfo {
  id: string
  backgroundColor?: string
  gradientColors?: string[]
}

export const Username = ({ username, className = '', style = {} }: UsernameProps) => {
  const [badgeColor, setBadgeColor] = useState<BadgeColorInfo | null>(null)
  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const fetchBadgeColor = async () => {
      try {
        const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(username)}/badge-color`)
        if (response.ok) {
          const data = await response.json()
          if (data.badgeColorInfo) {
            setBadgeColor(data.badgeColorInfo)
          }
        }
      } catch (error) {
        console.error('Error fetching badge color:', error)
      }
    }

    fetchBadgeColor()
  }, [username, API_URL])

  const getColorStyle = (): React.CSSProperties => {
    if (!badgeColor) {
      return style
    }

    if (badgeColor.gradientColors && Array.isArray(badgeColor.gradientColors) && badgeColor.gradientColors.length === 2) {
      return {
        ...style,
        background: `linear-gradient(135deg, ${badgeColor.gradientColors[0]}, ${badgeColor.gradientColors[1]})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 600
      }
    } else if (badgeColor.backgroundColor) {
      return {
        ...style,
        color: badgeColor.backgroundColor,
        fontWeight: 600
      }
    }

    return style
  }

  return (
    <span className={className} style={getColorStyle()}>
      {username}
    </span>
  )
}
