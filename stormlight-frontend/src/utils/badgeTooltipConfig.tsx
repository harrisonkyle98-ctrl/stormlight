import React from 'react'
import { MilestoneBadge } from './gradientUtils'
import { TooltipRow } from '../components/ui/tooltip'

interface PlayerStats {
  stats: {
    overall: {
      rank: number | null
      level: number
      xp: number
    }
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
    }
  }
  league_points?: number
  league_rank?: number
  quest_points?: number
}

interface QuestData {
  quest_summary?: {
    questsstarted: number
    questscomplete: number
    questsnotstarted: number
  }
}

export interface BadgeTooltipConfig {
  title: string
  imageSrc?: string
  headerTag?: React.ReactNode
  rows?: TooltipRow[]
  footerText?: string
  className: string
}

const LEAGUE_TIERS = ['bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune', 'dragon'] as const

function getLeagueTierFromId(badgeId: string): string | null {
  if (!badgeId.startsWith('league-')) return null
  const tier = badgeId.replace('league-', '')
  return LEAGUE_TIERS.includes(tier as any) ? tier : null
}

export function getBadgeTooltipConfig(
  badge: MilestoneBadge & { id: string },
  playerData: PlayerStats,
  questData?: QuestData
): BadgeTooltipConfig {
  const isLeague = badge.id.startsWith('league-')
  const tierSlug = getLeagueTierFromId(badge.id)

  if (badge.id === 'master-maxed' || badge.id === 'maxed' || badge.id === 'max-xp') {
    return {
      title: badge.name,
      imageSrc: badge.icon,
      className: 'skill-tooltip',
      rows: [
        {
          label: 'Total Level:',
          value: String(playerData.stats.overall.level || 0)
        },
        {
          label: 'Total XP:',
          value: (playerData.stats.overall.xp || 0).toLocaleString()
        }
      ],
      footerText: playerData.stats.overall.rank
        ? `Overall Rank: #${playerData.stats.overall.rank.toLocaleString()}`
        : undefined
    }
  }

  if (badge.id === 'quest-cape') {
    return {
      title: badge.name,
      imageSrc: badge.icon,
      className: 'skill-tooltip',
      rows: [
        {
          label: 'Quest Points:',
          value: String(playerData.quest_points || 0)
        },
        {
          label: 'Completed:',
          value: String(questData?.quest_summary?.questscomplete || 0)
        }
      ]
    }
  }

  if (isLeague && tierSlug) {
    const tierLabel = tierSlug.charAt(0).toUpperCase() + tierSlug.slice(1)
    
    return {
      title: 'Leagues: Catalyst',
      imageSrc: badge.icon,
      className: 'skill-tooltip',
      headerTag: (
        <span
          className="tooltip-skill-tag"
          style={{
            background: badge.gradientBackground || badge.backgroundColor,
            color: '#fff'
          }}
        >
          {tierLabel}
        </span>
      ),
      rows: [
        {
          label: 'League Points:',
          value: playerData.league_points?.toLocaleString() ?? '—'
        }
      ],
      footerText: playerData.league_rank
        ? `League Rank: #${playerData.league_rank.toLocaleString()}`
        : undefined
    }
  }

  if (badge.id.startsWith('custom-')) {
    return {
      title: badge.name,
      imageSrc: badge.icon,
      className: 'skill-tooltip'
    }
  }

  return {
    title: badge.name,
    imageSrc: badge.icon,
    className: 'skill-tooltip'
  }
}
