import { useEffect, useState } from 'react'
import { getGradientStyle } from '../../utils/gradientUtils'

interface UsernameProps {
  username: string
  clanRank?: string
  className?: string
  style?: React.CSSProperties
}

interface BadgeColorInfo {
  id: string
  backgroundColor?: string
  gradientColors?: string[]
}

interface CachedData {
  badgeColorInfo: BadgeColorInfo | null
  timestamp: number
}

const badgeColorCache = new Map<string, CachedData>()
const CACHE_TTL = 60000

export const clearUsernameColorCache = (username: string) => {
  badgeColorCache.delete(username)
  console.log(`[Username] Cleared cache for: ${username}`)
}

export const Username = ({ username, clanRank, className = '', style = {} }: UsernameProps) => {
  const [badgeColor, setBadgeColor] = useState<BadgeColorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const fetchBadgeColor = async () => {
      const now = Date.now()
      const cached = badgeColorCache.get(username)
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log(`[Username] Cache hit for ${username}:`, cached.badgeColorInfo)
        setBadgeColor(cached.badgeColorInfo)
        setIsLoading(false)
        return
      }

      try {
        console.log(`[Username] Fetching badge color for ${username} from ${API_URL}`)
        const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(username)}/badge-color`)
        if (response.ok) {
          const data = await response.json()
          console.log(`[Username] API response for ${username}:`, data)
          const colorInfo = data.badgeColorInfo || null
          console.log(`[Username] Extracted colorInfo for ${username}:`, colorInfo)
          setBadgeColor(colorInfo)
          badgeColorCache.set(username, { badgeColorInfo: colorInfo, timestamp: now })
        } else {
          console.log(`[Username] API returned non-OK status for ${username}:`, response.status)
          setBadgeColor(null)
          badgeColorCache.set(username, { badgeColorInfo: null, timestamp: now })
        }
      } catch (error) {
        console.error(`[Username] Error fetching badge color for ${username}:`, error)
        setBadgeColor(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBadgeColor()
  }, [username, API_URL])

  const getColorStyle = (): React.CSSProperties => {
    if (badgeColor) {
      console.log(`[Username] Applying badge color for ${username}:`, badgeColor)
      if (badgeColor.gradientColors && Array.isArray(badgeColor.gradientColors) && badgeColor.gradientColors.length === 2) {
        console.log(`[Username] Using gradient colors for ${username}`)
        return {
          ...style,
          background: `linear-gradient(135deg, ${badgeColor.gradientColors[0]}, ${badgeColor.gradientColors[1]})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 600
        }
      } else if (badgeColor.backgroundColor) {
        console.log(`[Username] Using solid color for ${username}:`, badgeColor.backgroundColor)
        return {
          ...style,
          color: badgeColor.backgroundColor,
          fontWeight: 600
        }
      }
    }

    if (!isLoading && clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(clanRank)) {
      console.log(`[Username] Using gradient fallback for clan leader ${username} (${clanRank})`)
      const gradientStyle = getGradientStyle(username, clanRank)
      return {
        ...style,
        ...gradientStyle
      }
    }

    console.log(`[Username] Using default style for ${username}`)
    return style
  }

  return (
    <span className={className} style={getColorStyle()}>
      {username}
    </span>
  )
}
