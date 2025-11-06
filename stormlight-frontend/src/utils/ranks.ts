/**
 * Rank color mappings for clan ranks
 * Used for badges, promotions, and other rank-related styling
 */
export const RANK_COLORS: { [key: string]: string } = {
  'Owner': '#ff6b35',
  'Deputy Owner': '#ff8c42',
  'Overseer': '#ffa726',
  'Coordinator': '#ffb74d',
  'Organiser': '#bbbbbb',
  'Admin': '#bb8970',
  'General': '#af8d4d',
  'Captain': '#888888',
  'Lieutenant': '#b46354',
  'Sergeant': '#b78d5b',
  'Corporal': '#b78d5b',
  'Recruit': '#b78d5b'
}

/**
 * Get the color for a given rank
 * @param rank - The clan rank name
 * @returns The hex color code for the rank, or a default color if rank is not found
 */
export function getRankColor(rank?: string): string {
  if (!rank) {
    return '#b78d5b' // Default recruit color
  }
  return RANK_COLORS[rank] || '#b78d5b'
}
