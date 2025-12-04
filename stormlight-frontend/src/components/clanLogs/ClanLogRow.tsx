import { Link } from 'react-router-dom'
import { ClanLogEntry, getLogVisual } from '../../utils/clanLogUtils'
import { Username } from '../ui/username'

interface ClanLogRowProps {
  entry: ClanLogEntry
  formatTimeAgo: (timestamp: number) => string
  getRankIcon?: (rank: string) => string
  usernameToUrl: (username: string) => string
}

/**
 * Shared component for rendering clan log entries with colored borders and icons
 * Used in both Home.tsx and MemberLogTab.tsx
 */
export function ClanLogRow({
  entry,
  formatTimeAgo,
  getRankIcon,
  usernameToUrl
}: ClanLogRowProps) {
  const { color, Icon, message } = getLogVisual(entry, getRankIcon)
  
  const isCompetitionEvent = entry.event_type === 'competition_start' || entry.event_type === 'competition_end'
  const linkPath = isCompetitionEvent 
    ? `/competitions/${entry.old_rank}` 
    : `/clan-member/${usernameToUrl(entry.username)}`

  // Convert hex color to rgba with 0.8 opacity for border
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Slate-700 (#334155) with 0.8 opacity
  const slateBackground = 'rgba(51, 65, 85, 0.8)'

  return (
    <div
      className="flex items-stretch overflow-hidden border-2"
      style={{ borderColor: hexToRgba(color, 0.8), backgroundColor: slateBackground }}
    >
      {/* Left colored icon column */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: hexToRgba(color, 0.8), width: '52px' }}
      >
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>

      {/* Right content column */}
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              to={linkPath}
              className="text-white font-medium hover:text-blue-300 transition-colors flex-shrink-0"
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
            <span className="text-slate-300 truncate">{message}</span>
          </div>
          <span className="text-slate-400 text-xs whitespace-nowrap ml-2 flex-shrink-0">
            {formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}
          </span>
        </div>
      </div>
    </div>
  )
}
