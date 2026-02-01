import { Link } from 'react-router-dom'
import { ActivityEntry, getActivityVisual, categorizeActivity } from '../../utils/activityLogUtils'

interface ParchmentActivityLogRowProps {
  activity: ActivityEntry
  formatTimeAgo: (timestamp: number) => string
  usernameToUrl: (username: string) => string
}

/**
 * Styled activity log row for /test page only
 * Uses Members Active Today row styling with activity type coloring and pattern background
 */
export function ParchmentActivityLogRow({
  activity,
  formatTimeAgo,
  usernameToUrl
}: ParchmentActivityLogRowProps) {
  const { Icon, color } = getActivityVisual(activity)
  const activityType = categorizeActivity(activity.text)

  return (
    <div 
      className="test-log-row test-row-panel"
      data-activity-type={activityType}
      style={{ '--row-accent': color } as React.CSSProperties}
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
            <Link
              to={`/clan-member/${usernameToUrl(activity.username)}`}
              className="test-log-link hover:underline flex-shrink-0"
              style={{ color }}
            >
              {activity.username}
            </Link>
            <span className="test-log-text truncate">{activity.text}</span>
          </div>
          <span className="test-log-timestamp whitespace-nowrap ml-2 flex-shrink-0">
            {formatTimeAgo(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}
