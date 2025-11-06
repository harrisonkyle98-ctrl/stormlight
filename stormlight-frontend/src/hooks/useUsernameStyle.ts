import { useEffect, useState } from 'react'
import { getGradientStyle } from '../utils/gradientUtils'

interface BadgeColorInfo {
  backgroundColor?: string
  gradientColors?: string[]
}

interface CachedData {
  badgeColorInfo: BadgeColorInfo | null
  timestamp: number
}

const badgeColorCache = new Map<string, CachedData>()
const CACHE_TTL = 60000

export const useUsernameStyle = (username: string, clanRank?: string): React.CSSProperties => {
  const [badgeColor, setBadgeColor] = useState<BadgeColorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const fetchBadgeColor = async () => {
      const now = Date.now()
      const cached = badgeColorCache.get(username)
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        setBadgeColor(cached.badgeColorInfo)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(username)}/badge-color`)
        if (response.ok) {
          const data = await response.json()
          const colorInfo = data.badgeColorInfo || null
          setBadgeColor(colorInfo)
          badgeColorCache.set(username, { badgeColorInfo: colorInfo, timestamp: now })
        } else {
          setBadgeColor(null)
          badgeColorCache.set(username, { badgeColorInfo: null, timestamp: now })
        }
      } catch (error) {
        console.error('Error fetching badge color:', error)
        setBadgeColor(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBadgeColor()
  }, [username, API_URL])

  if (badgeColor) {
    if (badgeColor.gradientColors && Array.isArray(badgeColor.gradientColors) && badgeColor.gradientColors.length === 2) {
      return {
        background: `linear-gradient(135deg, ${badgeColor.gradientColors[0]}, ${badgeColor.gradientColors[1]})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 600
      }
    } else if (badgeColor.backgroundColor) {
      return {
        color: badgeColor.backgroundColor,
        fontWeight: 600
      }
    }
  }

  if (!isLoading && clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(clanRank)) {
    return getGradientStyle(username, clanRank)
  }

  return { color: 'white' }
}
