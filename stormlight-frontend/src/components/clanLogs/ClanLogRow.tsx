import { Link } from 'react-router-dom'
import { ClanLogEntry, getLogVisual } from '../../utils/clanLogUtils'

interface ClanLogRowProps {
  entry: ClanLogEntry
  formatTimeAgo: (timestamp: number) => string
  getGradientStyle: (username: string, rank?: string) => React.CSSProperties
  getRankIcon?: (rank: string) => string
  usernameToUrl: (username: string) => string
  className?: string
}

/**
 * Shared component for rendering clan log entries with colored borders and icons
 * Used in both Home.tsx and MemberLogTab.tsx
 */
export function ClanLogRow({
  entry,
  formatTimeAgo,
  getGradientStyle,
  getRankIcon,
  usernameToUrl,
  className = 'bg-slate-700/50'
}: ClanLogRowProps) {
  const { color, Icon, message } = getLogVisual(entry, getRankIcon)

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
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/clan-member/${usernameToUrl(entry.username)}`}
            className="text-white font-medium hover:text-blue-300 transition-colors"
            style={getGradientStyle(entry.username, entry.new_rank || entry.old_rank)}
          >
            {entry.username}
          </Link>
          <span className="text-slate-300">{message}</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">
          {formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}
        </p>
      </div>
    </div>
  )
}
