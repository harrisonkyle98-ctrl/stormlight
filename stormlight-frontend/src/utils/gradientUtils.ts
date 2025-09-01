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
  const normalizedUsername = username.replace(/\u00A0/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim()
  
  const usernameGradients: { [key: string]: [string, string] } = {
    'Space Flyer': ['#0047ab', '#9abcf7'],
    'Papa Cody': ['#64c2f5', '#c5e7ea'],
    'lm Kyle': ['#9c68cc', '#c0e5f9'],
    'Dr M MD': ['#20962e', '#2ceb4f'],
    'RoxyPT': ['#ff7b00', '#ffcd77'],
    'Superhypered': ['#ffd000', '#fff598'],
    'The Unseen': ['#131313', '#e6e6e6'],
    'lts Unseen': ['#131313', '#e6e6e6'],
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

  const normalizedUsername = username.replace(/\u00A0/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim()
  const [color1, color2] = getGradientColors(normalizedUsername, clanRank)
  return {
    background: `linear-gradient(135deg, ${color1}, ${color2})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  }
}

export interface MilestoneBadge {
  id: string
  name: string
  backgroundColor: string
  gradientBackground?: string
  icon: string
}

export const checkPlayerMilestones = (stats: any, questData?: any, clanRank?: string, username?: string): MilestoneBadge[] => {
  const badges: MilestoneBadge[] = []
  
  if (clanRank) {
    const rankImageMap: { [key: string]: string } = {
      'Owner': 'owner.png',
      'Deputy Owner': 'depowner.png',
      'Overseer': 'overseer.png',
      'Coordinator': 'coordinator.png',
      'Organiser': 'organizer.png',
      'Admin': 'admin.png',
      'General': 'general.png',
      'Captain': 'captain.png',
      'Lieutenant': 'lieutenant.png',
      'Sergeant': 'sergeant.png',
      'Corporal': 'corporal.png',
      'Recruit': 'recruit.png'
    }
    
    const rankColors: { [key: string]: string } = {
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
    
    const imageName = rankImageMap[clanRank]
    if (imageName) {
      let gradientBackground = undefined
      
      if (username && ['Owner', 'Deputy Owner', 'Overseer'].includes(clanRank)) {
        const [color1, color2] = getGradientColors(username, clanRank)
        gradientBackground = `linear-gradient(135deg, ${color1}, ${color2})`
      }
      
      badges.push({
        id: `rank-${clanRank.toLowerCase().replace(/\s+/g, '-')}`,
        name: clanRank,
        backgroundColor: rankColors[clanRank] || '#b78d5b',
        gradientBackground,
        icon: `/assets/ranks/${imageName}`
      })
    }
  }
  
  if (!stats) return badges
  
  const skills = Object.entries(stats).filter(([key]) => key !== 'overall')
  
  if (skills.length === 0) return badges
  
  const totalXp = skills.reduce((sum, [_, data]: [string, any]) => sum + (data.xp || 0), 0)
  if (totalXp >= 5800000000) {
    badges.push({
      id: 'max-xp',
      name: 'Max XP',
      backgroundColor: '#bf0026',
      icon: '/icons/xp.png'
    })
  }
  
  const masterMaxedSkills = skills.filter(([_, data]: [string, any]) => data.level >= 120)
  if (masterMaxedSkills.length === skills.length) {
    badges.push({
      id: 'master-maxed',
      name: 'Master Maxed',
      backgroundColor: '#99001f',
      icon: '/icons/overall.png'
    })
  }
  
  const maxedSkills = skills.filter(([_, data]: [string, any]) => data.level >= 99)
  if (maxedSkills.length === skills.length) {
    badges.push({
      id: 'maxed',
      name: 'Maxed',
      backgroundColor: '#99003b',
      icon: '/icons/overall.png'
    })
  }
  
  if (questData && questData.quest_summary && questData.quest_summary.questsnotstarted === 0) {
    badges.push({
      id: 'quest-cape',
      name: 'Quest Cape',
      backgroundColor: '#438da9',
      icon: '/assets/ranks/quest.png'
    })
  }
  
  return badges
}
