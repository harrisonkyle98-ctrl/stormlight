import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Username } from '../ui/username'

interface MembersActiveTodayRowProps {
  member: {
    username: string
    xp_gained: number
  }
  rank: number
  formatNumber: (num: number) => string
  usernameToUrl: (username: string) => string
  clanRank?: string
}

/**
 * Styled Members Active Today row for /test page only
 * Uses floral pattern background (not diamond grid)
 * Entire row is clickable with keyboard accessibility
 * Matches Clan Log / Recent Activity row design principles
 */
export function MembersActiveTodayRow({
  member,
  rank,
  formatNumber,
  usernameToUrl,
  clanRank
}: MembersActiveTodayRowProps) {
  const navigate = useNavigate()
  const linkPath = `/clan-member/${usernameToUrl(member.username)}`

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
      className="test-members-active-row test-row-panel"
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onAuxClick={handleRowClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${member.username}'s profile`}
    >
      <div className="flex items-center justify-between py-2 px-3">
        {/* Left side: Rank number + Username */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Rank number */}
          <span className="test-members-active-rank">
            #{rank}
          </span>
          
          {/* Username with clan rank styling */}
          <span className="test-members-active-username">
            <Username username={member.username} clanRank={clanRank} />
          </span>
        </div>

        {/* Right side: XP gained + Arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="test-members-active-xp">
            +{formatNumber(member.xp_gained)}
          </span>
          <ChevronRight className="test-members-active-chevron w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
