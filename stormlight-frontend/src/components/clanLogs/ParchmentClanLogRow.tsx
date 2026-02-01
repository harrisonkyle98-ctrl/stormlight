import { Link } from 'react-router-dom'
import { ClanLogEntry, getLogVisual, normalizeLogType } from '../../utils/clanLogUtils'

interface ParchmentClanLogRowProps {
  entry: ClanLogEntry
  formatTimeAgo: (timestamp: number) => string
  getRankIcon?: (rank: string) => string
  usernameToUrl: (username: string) => string
}

/**
 * Styled clan log row for /test page only
 * Uses Members Active Today row styling with log type coloring and pattern background
 */
export function ParchmentClanLogRow({
  entry,
  formatTimeAgo,
  getRankIcon,
  usernameToUrl
}: ParchmentClanLogRowProps) {
  const { Icon, message, color } = getLogVisual(entry, getRankIcon)
  const logType = normalizeLogType(entry.event_type)
  
  const isCompetitionEvent = entry.event_type === 'competition_start' || entry.event_type === 'competition_end'
  const linkPath = isCompetitionEvent 
    ? `/competitions/${entry.old_rank}` 
    : `/clan-member/${usernameToUrl(entry.username)}`

  return (
    <div 
      className="test-log-row test-row-panel"
      data-log-type={logType}
      style={{ '--row-accent': color } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 py-2 px-3">
        {/* Icon container - recolored by log type */}
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              to={linkPath}
              className="test-log-link hover:underline flex-shrink-0"
              style={{ color }}
            >
              {entry.username}
            </Link>
            <span className="test-log-text truncate">{message}</span>
          </div>
          <span className="test-log-timestamp whitespace-nowrap ml-2 flex-shrink-0">
            {formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}
          </span>
        </div>
      </div>
    </div>
  )
}
