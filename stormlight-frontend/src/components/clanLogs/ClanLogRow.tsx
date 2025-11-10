import { Link } from 'react-router-dom'
import { ClanLogEntry, getLogVisual } from '../../utils/clanLogUtils'
import { Username } from '../ui/username'

interface ClanLogRowProps {
  entry: ClanLogEntry
  formatTimeAgo: (timestamp: number) => string
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
  getRankIcon,
  usernameToUrl,
  className = 'bg-slate-700/50'
}: ClanLogRowProps) {
  const { color, Icon, message } = getLogVisual(entry, getRankIcon)
  
  const isCompetitionEvent = entry.event_type === 'competition_start' || entry.event_type === 'competition_end'
  const linkPath = isCompetitionEvent 
    ? `/competitions/${entry.old_rank}` 
    : `/clan-member/${usernameToUrl(entry.username)}`

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
              to={linkPath}
              className="text-white font-medium hover:text-blue-300 transition-colors"
            >
              {isCompetitionEvent ? (
                <span>{entry.username}</span>
              ) : (
                <Username
                  username={entry.username}
                  clanRank={entry.new_rank || entry.old_rank}
                />
              )}
            </Link>
            <span className="text-slate-300">{message}</span>
          </div>
          <span className="text-slate-400 text-xs whitespace-nowrap ml-2">
            {formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}
          </span>
        </div>
      </div>
    </div>
  )
}
