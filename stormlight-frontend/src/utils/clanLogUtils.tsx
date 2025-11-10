import { ReactNode } from 'react'
import { ArrowBigUp, ArrowBigDown, UserCheck, UserRoundX, Trophy, LucideIcon } from 'lucide-react'
import { getRankColor } from './ranks'

/**
 * Color constants for clan log events
 */
export const JOIN_COLOR = '#22c55e' // green-500
export const LEAVE_COLOR = '#ef4444' // red-500
export const DEMOTION_COLOR = '#ef4444' // red-500
export const COMPETITION_COLOR = '#8c5aab' // Purple

/**
 * Normalize event type to lowercase standard format
 */
export function normalizeLogType(eventType: string): string {
  return eventType.toLowerCase()
}

/**
 * Interface for clan log entry
 */
export interface ClanLogEntry {
  id: number
  username: string
  event_type: string
  old_rank?: string
  new_rank?: string
  timestamp: string
}

/**
 * Get visual properties (color, icon, message) for a clan log entry
 */
export function getLogVisual(entry: ClanLogEntry, getRankIcon?: (rank: string) => string): {
  color: string
  Icon: LucideIcon
  message: ReactNode
} {
  const eventType = normalizeLogType(entry.event_type)

  switch (eventType) {
    case 'join':
      return {
        color: JOIN_COLOR,
        Icon: UserCheck,
        message: 'joined the clan'
      }

    case 'leave':
      return {
        color: LEAVE_COLOR,
        Icon: UserRoundX,
        message: 'left the clan'
      }

    case 'rank_up':
      return {
        color: getRankColor(entry.new_rank),
        Icon: ArrowBigUp,
        message: getRankIcon ? (
          <span className="flex items-center gap-1">
            promoted from
            <img src={getRankIcon(entry.old_rank || '')} alt={entry.old_rank} className="w-4 h-4 mx-1" />
            to
            <img src={getRankIcon(entry.new_rank || '')} alt={entry.new_rank} className="w-4 h-4 mx-1" />
          </span>
        ) : (
          `promoted from ${entry.old_rank || 'Unknown'} to ${entry.new_rank || 'Unknown'}`
        )
      }

    case 'rank_down':
      return {
        color: DEMOTION_COLOR,
        Icon: ArrowBigDown,
        message: getRankIcon ? (
          <span className="flex items-center gap-1">
            demoted from
            <img src={getRankIcon(entry.old_rank || '')} alt={entry.old_rank} className="w-4 h-4 mx-1" />
            to
            <img src={getRankIcon(entry.new_rank || '')} alt={entry.new_rank} className="w-4 h-4 mx-1" />
          </span>
        ) : (
          `demoted from ${entry.old_rank || 'Unknown'} to ${entry.new_rank || 'Unknown'}`
        )
      }

    case 'name_change':
      return {
        color: '#eab308', // yellow-500
        Icon: UserCheck,
        message: `changed their name from ${entry.old_rank || 'Unknown'}`
      }

    case 'competition_start':
      return {
        color: COMPETITION_COLOR,
        Icon: Trophy,
        message: 'has started'
      }

    case 'competition_end':
      return {
        color: COMPETITION_COLOR,
        Icon: Trophy,
        message: 'has ended'
      }

    default:
      return {
        color: '#64748b', // slate-500
        Icon: UserCheck,
        message: 'clan event'
      }
  }
}
