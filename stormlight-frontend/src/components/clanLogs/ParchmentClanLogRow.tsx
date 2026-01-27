import { Link } from 'react-router-dom'
import { ClanLogEntry, getLogVisual } from '../../utils/clanLogUtils'

interface ParchmentClanLogRowProps {
  entry: ClanLogEntry
  formatTimeAgo: (timestamp: number) => string
  getRankIcon?: (rank: string) => string
  usernameToUrl: (username: string) => string
}

/**
 * Parchment-styled clan log row for /test page only
 * Individual torn parchment strip appearance
 */
export function ParchmentClanLogRow({
  entry,
  formatTimeAgo,
  getRankIcon,
  usernameToUrl
}: ParchmentClanLogRowProps) {
  const { Icon, message } = getLogVisual(entry, getRankIcon)
  
  const isCompetitionEvent = entry.event_type === 'competition_start' || entry.event_type === 'competition_end'
  const linkPath = isCompetitionEvent 
    ? `/competitions/${entry.old_rank}` 
    : `/clan-member/${usernameToUrl(entry.username)}`

  return (
    <div className="parchment-log-entry">
      <div className="flex items-center gap-3">
        {/* Icon - embossed/printed style */}
        <div className="parchment-icon flex items-center justify-center flex-shrink-0 w-8 h-8 rounded">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              to={linkPath}
              className="parchment-text-link hover:underline flex-shrink-0"
            >
              {entry.username}
            </Link>
            <span className="parchment-text truncate">{message}</span>
          </div>
          <span className="parchment-timestamp whitespace-nowrap ml-2 flex-shrink-0">
            {formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}
          </span>
        </div>
      </div>
    </div>
  )
}
