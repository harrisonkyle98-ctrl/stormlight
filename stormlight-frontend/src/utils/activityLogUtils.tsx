import { LucideIcon, Compass, BarChart4, Castle, Package, Sword, Dices } from 'lucide-react'

export interface ActivityEntry {
  username: string
  text: string
  timestamp: number
  details?: string
  date?: string
}

export interface ActivityVisual {
  color: string
  Icon: LucideIcon
}

/**
 * Categorizes activity text based on RuneMetrics categories
 * Reference: https://runescape.wiki/w/RuneMetrics/Adventurer%27s_Log
 */
export function categorizeActivity(text: string): 'quest' | 'skill' | 'minigame' | 'item' | 'monster' | 'citadel' {
  const lowerText = text.toLowerCase()
  
  if (
    lowerText.includes('capped') ||
    lowerText.includes('citadel') ||
    lowerText.includes('fealty')
  ) {
    return 'citadel'
  }
  
  if (
    lowerText.includes('quest') ||
    lowerText.includes('achievement') ||
    lowerText.includes('task') ||
    lowerText.includes('completed')
  ) {
    return 'quest'
  }
  
  if (
    lowerText.includes('xp in') ||
    lowerText.includes('level') ||
    lowerText.includes('skill') ||
    lowerText.includes('mastery') ||
    lowerText.match(/\d+xp in/i)
  ) {
    return 'skill'
  }
  
  if (
    lowerText.includes('minigame') ||
    lowerText.includes('game') ||
    lowerText.includes('arena') ||
    lowerText.includes('wars') ||
    lowerText.includes('trouble brewing') ||
    lowerText.includes('pest control') ||
    lowerText.includes('barbarian assault')
  ) {
    return 'minigame'
  }
  
  if (
    lowerText.includes('killed') ||
    lowerText.includes('defeated') ||
    lowerText.includes('slain') ||
    lowerText.includes('boss') ||
    lowerText.match(/i killed \d+/i)
  ) {
    return 'monster'
  }
  
  return 'item'
}

/**
 * Returns the visual styling (color and icon) for an activity based on its category
 */
export function getActivityVisual(activity: ActivityEntry): ActivityVisual {
  const category = categorizeActivity(activity.text)
  
  switch (category) {
    case 'citadel':
      return {
        color: '#84c27a', // Green
        Icon: Castle
      }
    
    case 'quest':
      return {
        color: '#57a9c1', // Cyan blue
        Icon: Compass
      }
    
    case 'skill':
      return {
        color: '#5789c1', // Steel blue
        Icon: BarChart4
      }
    
    case 'minigame':
      return {
        color: '#9957c1', // Purple
        Icon: Dices
      }
    
    case 'item':
      return {
        color: '#be9a55', // Gold
        Icon: Package
      }
    
    case 'monster':
      return {
        color: '#af4f4f', // Red
        Icon: Sword
      }
  }
}
