import { LucideIcon, Compass, BarChart4, Castle, Scroll, Sword } from 'lucide-react'

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
export function categorizeActivity(text: string): 'quest' | 'skill' | 'minigame' | 'item' | 'monster' {
  const lowerText = text.toLowerCase()
  
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
    lowerText.includes('castle') ||
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
    case 'quest':
      return {
        color: '#60a5fa', // Tailwind blue-400
        Icon: Compass
      }
    
    case 'skill':
      return {
        color: '#22c55e', // Tailwind green-500
        Icon: BarChart4
      }
    
    case 'minigame':
      return {
        color: '#991b1b', // Tailwind red-800
        Icon: Castle
      }
    
    case 'item':
      return {
        color: '#ca8a04', // Tailwind yellow-600
        Icon: Scroll
      }
    
    case 'monster':
      return {
        color: '#ef4444', // Tailwind red-500
        Icon: Sword
      }
  }
}
