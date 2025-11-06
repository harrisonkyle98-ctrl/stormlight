import { Link } from 'react-router-dom'
import { ActivityEntry, getActivityVisual } from '../../utils/activityLogUtils'

interface ActivityLogRowProps {
  activity: ActivityEntry
  formatTimeAgo: (timestamp: number) => string
  getGradientStyle: (username: string, rank?: string) => React.CSSProperties
  usernameToUrl: (username: string) => string
  clanRank?: string
  className?: string
}

/**
 * Shared component for rendering activity log entries with colored borders and icons
 * Used in both Home.tsx and ActivityTab.tsx
 */
export function ActivityLogRow({
  activity,
  formatTimeAgo,
  getGradientStyle,
  usernameToUrl,
  clanRank,
  className = 'bg-slate-700/50'
}: ActivityLogRowProps) {
  const { color, Icon } = getActivityVisual(activity)

  return (
    <div
      className={`flex items-stretch rounded-lg overflow-hidden ${className} border-2`}
      style={{ borderColor: color }}
    >
      {/* Left colored icon column */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color, width: '52px' }}
      >
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>

      {/* Right content column */}
      <div className="flex-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/clan-member/${usernameToUrl(activity.username)}`}
              className="text-white font-medium hover:text-blue-300 transition-colors"
              style={getGradientStyle(activity.username, clanRank)}
            >
              {activity.username}
            </Link>
            <span className="text-slate-300">{activity.text}</span>
          </div>
          <span className="text-slate-400 text-xs whitespace-nowrap ml-2">
            {formatTimeAgo(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}
