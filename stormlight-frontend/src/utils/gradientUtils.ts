interface ClanMember {
  username: string
  clan_rank: string
  total_xp: number
  kills: number
}

let clanMembersCache: ClanMember[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000

export const fetchClanMembers = async (): Promise<ClanMember[]> => {
  const now = Date.now()
  if (clanMembersCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return clanMembersCache
  }

  try {
    const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
    const response = await fetch(`${API_URL}/api/clan/members?limit=1000`)
    if (response.ok) {
      const data = await response.json()
      clanMembersCache = data.members
      cacheTimestamp = now
      return data.members
    }
  } catch (error) {
    console.error('Error fetching clan members for gradients:', error)
  }
  return []
}

export const getGradientColors = (username: string, rank?: string): [string, string] => {
  const normalizedUsername = username.replace(/\u00A0/g, ' ').replace(/%20/g, ' ').trim()
  
  const usernameGradients: { [key: string]: [string, string] } = {
    'Space Flyer': ['#0047ab', '#9abcf7'],
    'Papa Cody': ['#64c2f5', '#c5e7ea'],
    'lm Kyle': ['#9c68cc', '#c0e5f9'],
    'Dr M MD': ['#20962e', '#2ceb4f'],
    'RoxyPT': ['#ff7b00', '#ffcd77'],
    'Superhypered': ['#ffd000', '#fff598'],
    'The Unseen': ['#131313', '#e6e6e6'],
    'Its Unseen': ['#131313', '#e6e6e6'],
    'Wondersgal': ['#970000', '#ff0000']
  }

  if (usernameGradients[normalizedUsername]) {
    return usernameGradients[normalizedUsername]
  }

  const rankGradients: { [key: string]: [string, string] } = {
    'Coordinator': ['#ffb50a', '#ffdf75'],
    'Organiser': ['#bbbbbb', '#e0e0e0'],
    'Admin': ['#bb8970', '#d3b2a2'],
    'General': ['#af8d4d', '#c8b083'],
    'Captain': ['#888888', '#aaaaaa'],
    'Lieutenant': ['#b46354', '#c88d82'],
    'Sergeant': ['#b78d5b', '#c9a984'],
    'Corporal': ['#b78d5b', '#c9a984'],
    'Recruit': ['#b78d5b', '#c9a984']
  }

  return rankGradients[rank || ''] || ['#b78d5b', '#c9a984']
}

export const getGradientStyle = (username: string, clanRank?: string) => {
  if (!clanRank || !['Owner', 'Deputy Owner', 'Overseer'].includes(clanRank)) {
    return { color: 'white' }
  }

  const normalizedUsername = username.replace(/\u00A0/g, ' ').replace(/%20/g, ' ').trim()
  const [color1, color2] = getGradientColors(normalizedUsername, clanRank)
  return {
    background: `linear-gradient(135deg, ${color1}, ${color2})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  }
}
