import { Link } from 'react-router-dom'
import { ActivityEntry, getActivityVisual } from '../../utils/activityLogUtils'

interface ParchmentActivityLogRowProps {
  activity: ActivityEntry
  formatTimeAgo: (timestamp: number) => string
  usernameToUrl: (username: string) => string
}

/**
 * Parchment-styled activity log row for /test page only
 * Individual torn parchment strip appearance
 */
export function ParchmentActivityLogRow({
  activity,
  formatTimeAgo,
  usernameToUrl
}: ParchmentActivityLogRowProps) {
  const { Icon } = getActivityVisual(activity)

  return (
    <div className="parchment-log-entry">
      <div className="flex items-center gap-3">
        {/* Icon - embossed/printed style */}
        <div className="parchment-icon flex items-center justify-center flex-shrink-0 w-8 h-8 rounded">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <Link
              to={`/clan-member/${usernameToUrl(activity.username)}`}
              className="parchment-text-link hover:underline flex-shrink-0"
            >
              {activity.username}
            </Link>
            <span className="parchment-text truncate">{activity.text}</span>
          </div>
          <span className="parchment-timestamp whitespace-nowrap ml-2 flex-shrink-0">
            {formatTimeAgo(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}
