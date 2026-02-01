import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ActivityEntry, getActivityVisual, categorizeActivity } from '../../utils/activityLogUtils'

interface ParchmentActivityLogRowProps {
  activity: ActivityEntry
  formatTimeAgo: (timestamp: number) => string
  usernameToUrl: (username: string) => string
}

/**
 * Styled activity log row for /test page only
 * Uses Members Active Today row styling with activity type coloring and pattern background
 * Entire row is clickable with keyboard accessibility
 */
export function ParchmentActivityLogRow({
  activity,
  formatTimeAgo,
  usernameToUrl
}: ParchmentActivityLogRowProps) {
  const navigate = useNavigate()
  const { Icon, color } = getActivityVisual(activity)
  const activityType = categorizeActivity(activity.text)
  const linkPath = `/clan-member/${usernameToUrl(activity.username)}`

  const handleRowClick = (e: React.MouseEvent) => {
    // Allow middle-click and ctrl/cmd+click to open in new tab
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      window.open(linkPath, '_blank')
      return
    }
    navigate(linkPath)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(linkPath)
    }
  }

  return (
    <div 
      className="test-log-row test-row-panel"
      data-activity-type={activityType}
      style={{ '--row-accent': color } as React.CSSProperties}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onAuxClick={handleRowClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${activity.username}'s profile`}
    >
      <div className="flex items-center gap-3 py-2 px-3">
        {/* Icon container - recolored by activity type */}
        <div 
          className="test-log-icon flex items-center justify-center flex-shrink-0 w-8 h-8 rounded"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`
          }}
        >
          <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="test-log-link flex-shrink-0">
              {activity.username}
            </span>
            <span className="test-log-text truncate">{activity.text}</span>
          </div>
          <div className="flex items-center flex-shrink-0">
            <span className="test-log-timestamp whitespace-nowrap">
              {formatTimeAgo(activity.timestamp)}
            </span>
            <ChevronRight className="test-log-chevron w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
