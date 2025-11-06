/**
 * Utility functions for username color rendering based on selected badges
 */

interface BadgeColorInfo {
  backgroundColor?: string
  gradientColors?: string[]
}

/**
 * Get the color style for a username based on their selected badge
 * @param selectedBadgeId - The ID of the selected badge (if any)
 * @param eligibleBadges - Array of badges eligible for username color override
 * @returns CSS style object for the username
 */
export const getUsernameColorStyle = (
  selectedBadgeId: string | null | undefined,
  eligibleBadges: BadgeColorInfo[]
): React.CSSProperties => {
  if (!selectedBadgeId || !eligibleBadges || eligibleBadges.length === 0) {
    return {}
  }

  const selectedBadge = eligibleBadges.find((badge: any) => badge.id === selectedBadgeId)
  
  if (!selectedBadge) {
    return {}
  }

  if (selectedBadge.gradientColors && Array.isArray(selectedBadge.gradientColors) && selectedBadge.gradientColors.length === 2) {
    return {
      background: `linear-gradient(135deg, ${selectedBadge.gradientColors[0]}, ${selectedBadge.gradientColors[1]})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontWeight: 600
    }
  } else if (selectedBadge.backgroundColor) {
    return {
      color: selectedBadge.backgroundColor,
      fontWeight: 600
    }
  }

  return {}
}

/**
 * Get the CSS class name for username color styling
 * @param selectedBadgeId - The ID of the selected badge (if any)
 * @returns CSS class name string
 */
export const getUsernameColorClass = (selectedBadgeId: string | null | undefined): string => {
  return selectedBadgeId ? 'username-with-badge-color' : ''
}

/**
 * Fetch username color data for a specific user
 * @param username - The username to fetch color data for
 * @param apiUrl - The API base URL
 * @returns Promise with badge color info
 */
export const fetchUsernameColorData = async (
  username: string,
  apiUrl: string
): Promise<{ selectedBadgeId: string | null; badgeColorInfo: BadgeColorInfo | null }> => {
  try {
    const response = await fetch(`${apiUrl}/api/player/${encodeURIComponent(username)}/badge-color`)
    
    if (response.ok) {
      const data = await response.json()
      return {
        selectedBadgeId: data.selectedBadgeId || null,
        badgeColorInfo: data.badgeColorInfo || null
      }
    }
  } catch (error) {
    console.error('Error fetching username color data:', error)
  }
  
  return { selectedBadgeId: null, badgeColorInfo: null }
}
