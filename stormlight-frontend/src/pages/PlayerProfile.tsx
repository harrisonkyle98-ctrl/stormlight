import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, User, Scroll, Trophy, Package, Activity, BarChart3, Compass, BarChart2, FileText, RefreshCw, Plus, CircleCheck, CircleStar } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { getSkillIcon } from '../utils/skillIcons'
import { checkPlayerMilestones } from '../utils/gradientUtils'
import { urlToUsername } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import { useAuth } from '../contexts/AuthContext'
import { useProfileGains } from '../contexts/ProfileGainsContext'
import { Tooltip } from '../components/ui/tooltip'
import { getSkillCategory } from '../utils/skillCategory'
import { BadgeAssignmentModal } from '../components/ui/badge-assignment-modal'
import { DropsTab } from '../components/tabs/DropsTab'
import { ActivityTab } from '../components/tabs/ActivityTab'
import { QuestsTab } from '../components/tabs/QuestsTab'
import { AnalyticsTab } from '../components/tabs/AnalyticsTab'
import { CompetitionsTab } from '../components/tabs/CompetitionsTab'
import { LogTab } from '../components/tabs/LogTab'
import { AccountStatsCard } from '../components/profile/AccountStatsCard'
import { usePageTitle } from '../hooks/usePageTitle'
import { 
  AccountStatsCardSkeleton, 
  ProfileOverviewSkeleton, 
  ClueScrollsSkeleton, 
  SkillsGridSkeleton,
  TabsSkeleton
} from '../components/profile/ProfileSkeletons'
import { CircularClanXPGraph } from '../components/ui/CircularClanXPGraph'
import { getBadgeTooltipConfig } from '../utils/badgeTooltipConfig'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import '../styles/fantasy-container.css'

interface CustomBadge {
  id: string
  name: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
}

interface PlayerStats {
  badges?: Array<{ id: string; name: string; imageUrl: string; type: string }>
  custom_badges?: CustomBadge[]
  username: string
  clan_xp?: number
  clan_rank_number?: number
  runescore?: number
  clue_scrolls?: {
    easy?: number
    medium?: number
    hard?: number
    elite?: number
    master?: number
  }
  league_points?: number
  league_rank?: number
  stats: {
    overall: {
      rank: number | null
      level: number
      xp: number
      combatlevel: number
      level_change?: number
      xp_change?: number
      rank_change?: number
      xp_today?: number
      xp_yesterday?: number
      xp_period1?: number
      xp_period2?: number
    }
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
      level_change?: number
      xp_change?: number
      rank_change?: number
      xp_today?: number
      xp_yesterday?: number
      xp_period1?: number
      xp_period2?: number
    }
  }
  quest_points?: number
  last_updated: string
  clan_rank?: string
  is_verified?: boolean
}

const PlayerProfile = () => {
  const { username } = useParams<{ username: string }>()
  const decodedUsername = username ? urlToUsername(username) : ''
  
  // Dynamic page title based on player username
  usePageTitle(decodedUsername || 'Profile')
  
  const { user } = useAuth()
  const { publish } = useProfileGains()
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)

  // Helper function to abbreviate XP values >= 100M for profile card header only
  const formatXpAbbreviated = (xp: number): string => {
    const billion = 1_000_000_000
    const million = 1_000_000
    if (xp >= billion) {
      const value = xp / billion
      // Format with up to 2 decimal places, remove trailing zeros
      const formatted = value.toFixed(2).replace(/\.?0+$/, '')
      return `${formatted}B`
    }
    if (xp >= 100 * million) {
      const value = xp / million
      // Format with up to 2 decimal places, remove trailing zeros
      const formatted = value.toFixed(2).replace(/\.?0+$/, '')
      return `${formatted}M`
    }
    return xp.toLocaleString()
  }
  const [questData, setQuestData] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('skills')
  const [period1, setPeriod1] = useState('today')
  const [period2, setPeriod2] = useState('yesterday')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false)
  const [badgeModalLoading, setBadgeModalLoading] = useState(false)
  const [badgeModalError, setBadgeModalError] = useState<string | null>(null)
  const [modalCustomBadges, setModalCustomBadges] = useState<CustomBadge[]>([])
    const [citadelCaps, setCitadelCaps] = useState<number | null>(null)
    const [capDates, setCapDates] = useState<string[]>([])
    const [overallHiscoresRank, setOverallHiscoresRank] = useState<number | null>(null)

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    // Badge tier weights for hierarchical badges (same as ClanHiscores)
    const PVM_TIER_WEIGHTS: Record<number, number> = {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
    }
    const DXP_TIER_WEIGHTS: Record<number, number> = {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
    }

    useEffect(() => {
      if (username) {
        fetchPlayerStats()
        fetchQuestData()
        fetchCitadelCaps()
        fetchOverallHiscoresRank()
        if (user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)) {
          fetchCustomBadges()
        }
      }
    }, [username, period1, period2, user])

  const fetchPlayerStats = async () => {
    try {
      const decodedUsername = urlToUsername(username || '')
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/stats/history?period1=${period1}&period2=${period2}&_t=${cacheBuster}`
      console.log('🔄 Fetching player stats with history...', { username: decodedUsername, requestUrl })
      const response = await fetch(requestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Player stats with history fetched:', { 
          username: data.username, 
          combatlevel: data.stats?.overall?.combatlevel,
          rank_changes: Object.keys(data.stats).filter(skill => data.stats[skill].rank_change !== 0).length,
          last_updated: data.last_updated,
          custom_badges_count: data.custom_badges?.length || 0,
          has_custom_badges_field: 'custom_badges' in data,
          has_clan_xp_field: 'clan_xp' in data,
          clan_xp_value: data.clan_xp,
          has_clan_rank_number_field: 'clan_rank_number' in data,
          clan_rank_number_value: data.clan_rank_number
        })
        console.log('🎯 CLAN DEBUG: API returned clan_xp =', data.clan_xp, 'clan_rank_number =', data.clan_rank_number)
        console.log('🎯 BADGE DEBUG: custom_badges from API:', data.custom_badges)
        setPlayerData(data)
        console.log('🎯 CLAN DEBUG: setPlayerData called, React should re-render with new data')
        console.log('🎯 BADGE DEBUG: State updated, badges should now be available for rendering')
        
        if (period1 === 'today') {
          const xpToday = data.stats?.overall?.xp_gain_period1 || 0
          publish(decodedUsername, {
            xpToday,
            lastUpdated: Date.now(),
            period1,
            period2
          })
          console.log('📊 Published to ProfileGainsContext:', { username: decodedUsername, xpToday, period1, period2 })
        }
      } else {
        setError('Clan member not found or stats unavailable')
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setError('Failed to load player stats')
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchQuestData = async () => {
    try {
      const decodedUsername = urlToUsername(username || '')
      const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/quests`)
      if (response.ok) {
        const data = await response.json()
        setQuestData(data)
      }
    } catch (error) {
      console.error('Error fetching quest data for badges:', error)
    }
  }

      const fetchCitadelCaps = async () => {
        try {
          const decodedUsername = urlToUsername(username || '')
          const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/citadel-caps`)
          if (response.ok) {
            const data = await response.json()
            setCitadelCaps(data.total_caps)
            setCapDates(data.cap_dates || [])
          }
        } catch (error) {
          console.error('Error fetching citadel caps:', error)
        }
      }

    // Fetch user's Overall Hiscores rank (1, 2, 3, or null if not in top 3)
    const fetchOverallHiscoresRank = async () => {
      try {
        const decodedUsername = urlToUsername(username || '')
      
        // Fetch all clan members with their badges
        const membersResponse = await fetch(`${API_URL}/api/clan/members?limit=250`)
        const membersData = await membersResponse.json()
      
        // Fetch all custom badges to get category and tier info
        const badgesResponse = await fetch(`${API_URL}/api/badges`)
        const badgesData = await badgesResponse.json()
      
        const badgeMap = new Map<string, { category?: string; hierarchyTier?: number }>()
        if (badgesData.badges) {
          badgesData.badges.forEach((badge: { id: string; category?: string; hierarchyTier?: number }) => {
            badgeMap.set(badge.id, badge)
          })
        }
      
        // Process members and calculate badge scores (same logic as ClanHiscores)
        interface MemberScore {
          username: string
          badgeScore: number
          totalBadges: number
        }
      
        const processedMembers: MemberScore[] = (membersData.members || []).map((member: { username: string; badges?: Array<string | { id: string }> }) => {
          let skillBadgeScore = 0
          let pvmBadgeScore = 0
          let dxpBadgeScore = 0
          let skillBadgeCount = 0
          let pvmBadgeCount = 0
          let dxpBadgeCount = 0
        
          if (member.badges && Array.isArray(member.badges)) {
            member.badges.forEach((badgeRef: string | { id: string }) => {
              const badgeId = typeof badgeRef === 'string' ? badgeRef : badgeRef.id
              const badgeInfo = badgeMap.get(badgeId)
            
              if (badgeInfo) {
                const category = badgeInfo.category?.toUpperCase() || ''
                const tier = badgeInfo.hierarchyTier || 1
              
                if (category === 'SKILL') {
                  skillBadgeCount++
                  skillBadgeScore += 1
                } else if (category === 'PVM') {
                  pvmBadgeCount++
                  pvmBadgeScore += PVM_TIER_WEIGHTS[tier] || tier
                } else if (category === 'DXP') {
                  dxpBadgeCount++
                  dxpBadgeScore += DXP_TIER_WEIGHTS[tier] || tier
                }
              }
            })
          }
        
          return {
            username: member.username,
            badgeScore: skillBadgeScore + pvmBadgeScore + dxpBadgeScore,
            totalBadges: skillBadgeCount + pvmBadgeCount + dxpBadgeCount,
          }
        })
      
        // Sort by overall badge score (same as ClanHiscores Overall tab)
        processedMembers.sort((a, b) => {
          if (b.badgeScore !== a.badgeScore) return b.badgeScore - a.badgeScore
          if (b.totalBadges !== a.totalBadges) return b.totalBadges - a.totalBadges
          return a.username.localeCompare(b.username)
        })
      
        // Find the user's rank (1-indexed)
        const userIndex = processedMembers.findIndex(
          m => m.username.toLowerCase() === decodedUsername.toLowerCase()
        )
      
        if (userIndex >= 0 && userIndex < 3) {
          setOverallHiscoresRank(userIndex + 1) // 1, 2, or 3
        } else {
          setOverallHiscoresRank(null)
        }
      } catch (error) {
        console.error('Error fetching overall hiscores rank:', error)
        setOverallHiscoresRank(null)
      }
    }

    const handleRefresh = async () => {
    if (refreshing) return
    
    const now = Date.now()
    if (lastRefresh && now - lastRefresh < 300000) {
      const remainingTime = Math.ceil((300000 - (now - lastRefresh)) / 1000)
      setError(`Please wait ${remainingTime} seconds before refreshing again`)
      return
    }
    
    setRefreshing(true)
    setError(null)
    
    try {
      const decodedUsername = urlToUsername(username || '')
      const requestUrl = `${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/stats/history?period1=${period1}&period2=${period2}&refresh=true`
      console.log('🔄 Forcing refresh of player stats...', { username: decodedUsername, requestUrl })
      
      const response = await fetch(requestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Fresh player stats fetched:', { 
          username: data.username, 
          last_updated: data.last_updated 
        })
        setPlayerData(data)
        setLastRefresh(now)
      } else if (response.status === 429) {
        setError('Refresh rate limit exceeded. Please wait 5 minutes.')
      } else {
        setError('Failed to refresh player stats')
      }
    } catch (error) {
      console.error('Error refreshing player stats:', error)
      setError('Failed to refresh player stats')
    } finally {
      setRefreshing(false)
    }
  }

  const fetchCustomBadges = async () => {
    try {
      setBadgeModalLoading(true)
      setBadgeModalError(null)
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`${API_URL}/api/admin/badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter out API badges (includes Leagues badges) - only show CUSTOM, SKILL, DXP, PVM
        const allowedCategories = ['CUSTOM', 'SKILL', 'DXP', 'PVM']
        const badges = (data.badges || [])
          .filter((badge: any) => !badge.category || allowedCategories.includes(badge.category))
          .map((badge: any) => ({
            ...badge,
            imageUrl: badge.imageUrl.startsWith('http') 
              ? badge.imageUrl 
              : `https://stormlightrs.com${badge.imageUrl}`
          }))
        setModalCustomBadges(badges)
      } else {
        setBadgeModalError(`Failed to load custom badges: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching custom badges:', error)
      setBadgeModalError('Error loading custom badges')
    } finally {
      setBadgeModalLoading(false)
    }
  }



  const handleOpenBadgeModal = async () => {
    if (user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)) {
      await fetchCustomBadges()
    }
    
    setIsBadgeModalOpen(true)
  }

  const handleCloseBadgeModal = () => {
    setIsBadgeModalOpen(false)
  }

  const handleSaveBadgeAssignments = async (selectedBadgeIds: string[]) => {
    try {
      setBadgeModalLoading(true)
      setBadgeModalError(null)
      const token = localStorage.getItem('access_token')
      console.log('🔐 FRONTEND: Saving badge assignments...')
      console.log('🔐 FRONTEND: Selected badge IDs:', selectedBadgeIds)
      console.log('🔐 FRONTEND: Using token for badge assignment:', token ? 'Token exists' : 'No token')
      
      const customBadges = (playerData?.custom_badges || []).map((badge: CustomBadge) => ({
        id: `custom-${badge.id}`,
        name: badge.name,
        backgroundColor: badge.backgroundColor || '#6b7280',
        gradientBackground: badge.gradientColors ? 
          `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})` : 
          undefined,
        icon: badge.imageUrl
      }))
      const currentlyAssigned = customBadges.map((badge: any) => badge.id.replace('custom-', ''))
      
      console.log('🔐 FRONTEND: Currently assigned custom badges:', currentlyAssigned)
      
      const toAssign = selectedBadgeIds.filter(id => !currentlyAssigned.includes(id))
      const toRemove = currentlyAssigned.filter((id: string) => !selectedBadgeIds.includes(id))
      
      console.log('🔐 FRONTEND: To assign:', toAssign)
      console.log('🔐 FRONTEND: To remove:', toRemove)
      
      for (const badgeId of toAssign) {
        console.log('🔐 FRONTEND: Assigning badge:', badgeId)
        const response = await fetch(`${API_URL}/api/admin/assign-badge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: urlToUsername(username || ''),
            badgeId: badgeId
          })
        })
        
        console.log('🔐 FRONTEND: Assign response status:', response.status)
        if (!response.ok) {
          const errorText = await response.text()
          console.log('🔐 FRONTEND: Assign error response:', errorText)
          throw new Error(`Failed to assign badge ${badgeId}: ${response.status} - ${errorText}`)
        }
      }
      
      for (const badgeId of toRemove) {
        console.log('🔐 FRONTEND: Removing badge:', badgeId)
        const response = await fetch(`${API_URL}/api/admin/remove-badge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: urlToUsername(username || ''),
            badgeId: badgeId
          })
        })
        
        console.log('🔐 FRONTEND: Remove response status:', response.status)
        if (!response.ok) {
          const errorText = await response.text()
          console.log('🔐 FRONTEND: Remove error response:', errorText)
          throw new Error(`Failed to remove badge ${badgeId}: ${response.status} - ${errorText}`)
        }
      }
      
      console.log('🔐 FRONTEND: Badge assignments saved successfully')
      await fetchPlayerStats()
    } catch (error) {
      console.error('🔐 FRONTEND: Error updating badge assignments:', error)
      setBadgeModalError('Failed to save badge assignments')
      throw error
    } finally {
      setBadgeModalLoading(false)
    }
  }

  const accountStats = useMemo(() => {
    if (!playerData?.stats?.overall) return null
    
    const allBadges = questData ? checkPlayerMilestones(
      playerData.stats, 
      questData, 
      playerData.clan_rank, 
      urlToUsername(username || ''), 
      playerData.league_points
    ) : []
    const leagueBadge = allBadges.find(badge => badge.id.startsWith('league-'))
    const leagueIcon = leagueBadge?.icon || '/assets/icons/league_points.png'
    
      return {
        combatLevel: playerData.stats.overall.combatlevel,
        totalLevel: playerData.stats.overall.level,
        questPoints: playerData.quest_points || 0,
        runescore: playerData.runescore,
        citadelCaps: citadelCaps,
        capDates: capDates,
        leaguePoints: playerData.league_points,
        leagueRank: playerData.league_rank,
        leagueIcon: leagueIcon
      }
    }, [playerData, questData, citadelCaps, capDates, username])

  // Helper to check if stats data is ready
  const isStatsReady = !statsLoading && !!playerData

  // Only show error after loading completes and there's actually an error
  if (!statsLoading && (error || !playerData)) {
    return (
      <>
        <div className="fantasy-container">
          <div className="fantasy-banner-wrapper">
            <div className="fantasy-banner-ribbon-left"></div>
            <div className="fantasy-banner-ribbon-right"></div>
            <div className="fantasy-banner fantasy-banner--members">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Members</h1>
              </div>
            </div>
          </div>
          <div className="fantasy-content">
            <div className="fantasy-section space-y-6">
              <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
                <Link to="/members">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Members
                </Link>
              </Button>
              <div className="p-8 text-center">
                <p className="text-red-400 text-lg">{error}</p>
                <p className="text-slate-400 mt-2">
                  The clan member "{username}" could not be found or their stats are unavailable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const skillOrder = [
    'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
    'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'summoning',
    'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy'
  ]


  const skills = playerData?.stats ? skillOrder
    .filter(skill => {
      if (skill === 'overall') {
        return playerData.stats.overall // Check if overall stats exist
      }
      return playerData.stats[skill] // Only include skills that exist in the data
    })
    .map(skill => {
      if (skill === 'overall' && playerData.stats.overall) {
        return [skill, {
          ...playerData.stats.overall,
          level_change: playerData.stats.overall.level_change || 0,
          rank_change: playerData.stats.overall.rank_change || 0,
          xp_change: playerData.stats.overall.xp_change || 0,
          xp_period1: playerData.stats.overall.xp_period1 || playerData.stats.overall.xp,
          xp_period2: playerData.stats.overall.xp_period2 || 0,
          xp_gain_period1: (playerData.stats.overall as any)?.xp_gain_period1 || 0,
          xp_gain_period2: (playerData.stats.overall as any)?.xp_gain_period2 || 0
        }] as [string, any]
      }
      return [skill, {
        ...playerData.stats[skill],
        level_change: playerData.stats[skill]?.level_change || 0,
        rank_change: playerData.stats[skill]?.rank_change || 0,
        xp_change: playerData.stats[skill]?.xp_change || 0,
        xp_period1: playerData.stats[skill]?.xp_period1 || playerData.stats[skill]?.xp,
        xp_period2: playerData.stats[skill]?.xp_period2 || 0,
        xp_gain_period1: (playerData.stats[skill] as any)?.xp_gain_period1 || 0,
        xp_gain_period2: (playerData.stats[skill] as any)?.xp_gain_period2 || 0
      }] as [string, any]
    }) : []

  const getLevelBadgeStyle = (skill: string, level: number, xp: number) => {
    if (skill === 'overall') {
      if (xp >= 5800000000) {
        return 'text-[#d1d5db] border-[#a855f7]' // Purple border for 5.8B+ XP
      }
      if (level >= 3510) {
        return 'text-[#d1d5db] border-[#be9a55]' // Bronze/gold border for max total level
      }
      return 'text-[#d1d5db] border-[#d1d5db]' // Dull grey for below 3510
    } else {
      if (xp >= 200000000) {
        return 'text-[#d1d5db] border-[#a855f7]' // Purple border for 200M XP
      }
      if (level >= 120) {
        return 'text-[#d1d5db] border-[#be9a55]' // Bronze/gold border for 120+
      }
      if (level >= 99) {
        return 'text-[#d1d5db] border-[#22c55e]' // Green border for 99-119
      }
      return 'text-[#d1d5db] border-[#d1d5db]' // Dull grey border for below 99 (matches text color)
    }
  }

  const tabs = [
    { id: 'skills', label: 'Skills', icon: BarChart2 },
    { id: 'drops', label: 'Drops', icon: Package },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'quests', label: 'Quests', icon: Compass },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'log', label: 'Log', icon: FileText }
  ]

  const renderTabContent = () => {
    const commonProps = {
      username: urlToUsername(username || ''),
      playerData,
      API_URL
    };

    switch (activeTab) {
      case 'skills':
        return (
          <div className="w-full">
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Skills</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Level</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">XP</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">
                    <Select value={period1} onValueChange={(value) => {
                      setPeriod1(value)
                    }}>
                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-slate-400 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="today" className="text-white hover:bg-slate-600">Today</SelectItem>
                        <SelectItem value="yesterday" className="text-white hover:bg-slate-600">Yesterday</SelectItem>
                        <SelectItem value="week" className="text-white hover:bg-slate-600">Week</SelectItem>
                        <SelectItem value="month" className="text-white hover:bg-slate-600">Month</SelectItem>
                        <SelectItem value="year" className="text-white hover:bg-slate-600">Year</SelectItem>
                        <SelectItem value="last_week" className="text-white hover:bg-slate-600">Last Week</SelectItem>
                        <SelectItem value="last_month" className="text-white hover:bg-slate-600">Last Month</SelectItem>
                        <SelectItem value="last_year" className="text-white hover:bg-slate-600">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">
                    <Select value={period2} onValueChange={(value) => {
                      setPeriod2(value)
                    }}>
                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-slate-400 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="today" className="text-white hover:bg-slate-600">Today</SelectItem>
                        <SelectItem value="yesterday" className="text-white hover:bg-slate-600">Yesterday</SelectItem>
                        <SelectItem value="week" className="text-white hover:bg-slate-600">Week</SelectItem>
                        <SelectItem value="month" className="text-white hover:bg-slate-600">Month</SelectItem>
                        <SelectItem value="year" className="text-white hover:bg-slate-600">Year</SelectItem>
                        <SelectItem value="last_week" className="text-white hover:bg-slate-600">Last Week</SelectItem>
                        <SelectItem value="last_month" className="text-white hover:bg-slate-600">Last Month</SelectItem>
                        <SelectItem value="last_year" className="text-white hover:bg-slate-600">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map(([skill, data]) => (
                  <TableRow key={skill} className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-3">
                        {getSkillIcon(skill) ? (
                          <img
                            src={getSkillIcon(skill)!}
                            alt={skill}
                            className="w-6 h-6"
                          />
                        ) : (
                          <span className="text-lg">📊</span>
                        )}
                        <span className="font-medium text-white capitalize">{skill}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={`${getLevelBadgeStyle(skill, data.level, data.xp)} level-text-fixed`}>
                          {data.level}
                        </Badge>
                        <span className="text-sm">
                          {data.level_change && data.level_change !== 0 ? (
                            <span className={data.level_change > 0 ? 'text-green-400' : 'text-red-400'}>
                              {data.level_change > 0 ? '+' : ''}{data.level_change}
                            </span>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2">
                        {data.rank ? (
                          <span className="text-[#60a5fa] font-medium">
                            #{data.rank.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                        <span className="text-sm">
                          {data.rank_change && data.rank_change !== 0 ? (
                            <span className={data.rank_change > 0 ? 'text-green-400' : 'text-red-400'}>
                              {data.rank_change > 0 ? '+' : ''}{data.rank_change}
                            </span>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-green-400 font-medium">
                        {data.xp.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-green-400 font-medium">
                        {typeof data.xp_gain_period1 === 'number' ? `+${data.xp_gain_period1.toLocaleString()}` : '0'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-slate-400 font-medium">
                        {typeof data.xp_gain_period2 === 'number' ? `+${data.xp_gain_period2.toLocaleString()}` : '0'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      case 'drops':
        return <DropsTab {...commonProps} />
      case 'activity':
        return <ActivityTab {...commonProps} />
      case 'quests':
        return <QuestsTab {...commonProps} />
      case 'analytics':
        return <AnalyticsTab {...commonProps} />
      case 'competitions':
        return <CompetitionsTab {...commonProps} />
      case 'log':
        return <LogTab {...commonProps} />
      default:
        return null
    }
  }

  return (
    <>
      {/* Profile Header Section - Global Profile Card */}
      <GlobalProfileHeader />

      {/* Main Content Container */}
      <div className="fantasy-container">
        {/* Members Banner Header - green theme */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--members">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Members</h1>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="fantasy-content">
          {/* Top toolbar */}
          <div className="flex items-center justify-between mb-6">
            <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
              <Link to="/members">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Members
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                <Button
                  onClick={handleOpenBadgeModal}
                  size="sm"
                  className="bg-theme-button hover:bg-theme-button-hover text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <Tooltip content={`Last updated: ${playerData ? new Date(playerData.last_updated).toLocaleDateString() : 'Unknown'}`}>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing || (lastRefresh ? Date.now() - lastRefresh < 300000 : false)}
                  size="sm"
                  className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50 disabled:bg-theme-slate-700"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Account Stats Card - Horizontal Layout (above grid) */}
          {!isStatsReady ? (
            <div className="mb-6">
              <AccountStatsCardSkeleton />
            </div>
          ) : accountStats && (
            <div className="mb-6">
              <AccountStatsCard {...accountStats} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.3fr] gap-6">
            <div className="space-y-6">
                            {/* Profile Overview Panel */}
                            {!isStatsReady ? (
                              <ProfileOverviewSkeleton />
                            ) : (
                            <div 
                              className={`fantasy-section p-6 ${
                                overallHiscoresRank === 1 ? 'profile-card--gold' : 
                                overallHiscoresRank === 2 ? 'profile-card--silver' : 
                                overallHiscoresRank === 3 ? 'profile-card--bronze' : ''
                              }`}
                            >
              <div className="profile-avatar-box rounded-lg p-6 mb-4 relative">
                {/* Hiscores Rank Indicator - Top Left (only for top 3) */}
                {overallHiscoresRank && overallHiscoresRank <= 3 && (
                  <Tooltip content={`Rank #${overallHiscoresRank} in the Overall Clan Hiscores`}>
                    <div className="absolute top-4 left-4">
                      <CircleStar 
                        className={`w-5 h-5 ${
                          overallHiscoresRank === 1 ? 'text-yellow-400' : 
                          overallHiscoresRank === 2 ? 'text-gray-300' : 
                          'text-amber-600'
                        }`}
                      />
                    </div>
                  </Tooltip>
                )}

                {/* Discord Verification Indicator - Top Right */}
                <Tooltip 
                  content={playerData.is_verified ? "Verified" : "Unverified"}
                  className={playerData.is_verified ? "tooltip-green" : ""}
                >
                  <div className="absolute top-4 right-4">
                    <CircleCheck 
                      className={`w-5 h-5 ${playerData.is_verified ? 'text-green-500' : 'text-gray-500'}`}
                    />
                  </div>
                </Tooltip>
                
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage
                      src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(urlToUsername(username || ''))}/chat.png`}
                      alt={urlToUsername(username || '')}
                    />
                    <AvatarFallback className="bg-theme-button text-white">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-center">
                      <Username
                        username={urlToUsername(username || '')}
                        clanRank={playerData.clan_rank}
                      />
                    </h1>
                    
                    {/* Rank Badge */}
                    {playerData.stats && (() => {
                      const allBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, urlToUsername(username || ''), playerData.league_points)
                      const rankBadge = allBadges.find(badge => badge.id.startsWith('rank-'))
                      return rankBadge ? (
                        <div className="mt-3">
                          <div
                            className="inline-flex items-center space-x-2 px-3 py-1 text-sm font-semibold rounded-md text-white"
                            style={{
                              background: rankBadge.gradientBackground || rankBadge.backgroundColor
                            }}
                          >
                            <img
                              src={rankBadge.icon}
                              alt={rankBadge.name}
                              className="w-4 h-4 object-contain"
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                            />
                            <span>{rankBadge.name}</span>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>

              {/* Badges Section - Directly Above Combat Level */}
              {playerData.stats && playerData.custom_badges !== undefined && (() => {
                const milestoneBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, urlToUsername(username || ''), playerData.league_points)
                const nonRankBadges = milestoneBadges.filter(badge => !badge.id.startsWith('rank-'))
                
                const customBadges = (playerData.custom_badges || []).map((badge: CustomBadge) => ({
                  id: `custom-${badge.id}`,
                  name: badge.name,
                  backgroundColor: badge.backgroundColor || '#6b7280',
                  gradientBackground: badge.gradientColors ? 
                    `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})` : 
                    undefined,
                  icon: badge.imageUrl
                }))
                
                const allBadges = [...nonRankBadges, ...customBadges]
                return allBadges.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    {allBadges.map((badge) => {
                      const tooltipConfig = getBadgeTooltipConfig(badge, playerData, questData)
                      return (
                        <Tooltip
                          key={badge.id}
                          className={tooltipConfig.className}
                          title={tooltipConfig.title}
                          imageSrc={tooltipConfig.imageSrc}
                          headerTag={tooltipConfig.headerTag}
                          rows={tooltipConfig.rows}
                          footerText={tooltipConfig.footerText}
                          placement="top"
                        >
                          <div
                            className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white relative group cursor-help"
                            style={{
                              background: badge.gradientBackground || badge.backgroundColor
                            }}
                          >
                            <img
                              src={badge.icon}
                              alt={badge.name}
                              className="w-4 h-4 object-contain"
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                            />
                            <span>{badge.name}</span>
                          </div>
                        </Tooltip>
                      )
                    })}
                  </div>
                ) : null
              })()}

              {/* XP and Rank Stats - Horizontal Rows */}
              <div className="mt-3 flex flex-col gap-4">
                {/* Overall Row - Rank left, XP right (seamless row with unified background) */}
                <div className="profile-stat-row flex flex-row rounded-lg">
                  {playerData.stats.overall.rank && (
                    <div className="flex-1 text-center px-4 py-3">
                      <p className="text-xs text-slate-400 mb-1">Overall Rank</p>
                      <p className="text-xl font-bold text-theme-accent-light">
                        #{playerData.stats.overall.rank.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div className="flex-1 text-center px-4 py-3">
                    <p className="text-xs text-slate-400 mb-1">Total XP</p>
                    <p className="text-xl font-bold text-green-400">
                      {formatXpAbbreviated(playerData.stats.overall.xp)}
                    </p>
                  </div>
                </div>

                {/* Clan Row - Rank left, XP right (seamless row with unified background) */}
                {(playerData.clan_xp !== undefined && playerData.clan_xp !== null) || playerData.clan_rank_number ? (
                  <Tooltip
                    title="Clan XP Contribution"
                    description={
                      playerData.clan_xp !== undefined && playerData.clan_xp !== null && playerData.stats.overall.xp > 0 ? (
                        <div className="flex flex-col items-center gap-3 pt-2">
                          <div className="relative">
                            <CircularClanXPGraph
                              percentage={(playerData.clan_xp / playerData.stats.overall.xp) * 100}
                              size={96}
                              progressColor="#2ecc71"
                              remainingColor="#1b8a4a"
                            />
                          </div>
                          <div className="text-center text-xs text-slate-400">
                            {playerData.clan_xp.toLocaleString()} / {playerData.stats.overall.xp.toLocaleString()} XP
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400">No clan XP data available</div>
                      )
                    }
                    placement="top"
                  >
                    <div className="profile-stat-row profile-stat-row--clan flex flex-row cursor-help hover:opacity-90 transition-opacity rounded-lg">
                      {playerData.clan_rank_number && (
                        <div className="flex-1 text-center px-4 py-3">
                          <p className="text-xs text-slate-400 mb-1">Clan Rank</p>
                          <p className="text-xl font-bold text-theme-accent-light">
                            #{playerData.clan_rank_number.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {playerData.clan_xp !== undefined && playerData.clan_xp !== null && (
                        <div className="flex-1 text-center px-4 py-3">
                          <p className="text-xs text-slate-400 mb-1">Clan XP</p>
                          <p className="text-xl font-bold text-green-400">
                            {formatXpAbbreviated(playerData.clan_xp)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Tooltip>
                ) : null}
              </div>
              </div>
              )}

              {/* Clue Scrolls Section - Inner Panel */}
              {!isStatsReady ? (
                <ClueScrollsSkeleton />
              ) : playerData.clue_scrolls && Object.values(playerData.clue_scrolls).some(count => count !== null && count !== undefined) && (
                <div className="fantasy-section p-6">
                  <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
                    <Scroll className="w-5 h-5 text-purple-400" />
                    <span>Clue Scrolls</span>
                  </h3>
                  <div className="h-px bg-slate-700/60 mb-4" />
                  <div className="space-y-3">
                  {[
                    { name: 'Easy', key: 'easy', color: 'text-green-400' },
                    { name: 'Medium', key: 'medium', color: 'text-yellow-400' },
                    { name: 'Hard', key: 'hard', color: 'text-orange-400' },
                    { name: 'Elite', key: 'elite', color: 'text-red-400' },
                    { name: 'Master', key: 'master', color: 'text-purple-400' }
                  ].map((clue) => {
                    const count = playerData.clue_scrolls?.[clue.key as keyof typeof playerData.clue_scrolls]
                    if (count === null || count === undefined) return null
                    return (
                      <div
                        key={clue.key}
                        className="flex items-center justify-between px-4 py-2 bg-slate-700/30 rounded-lg"
                      >
                        <span className="text-slate-300 font-medium">{clue.name}</span>
                        <span className={`text-lg font-bold ${clue.color}`}>
                          {count.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}

              {/* Skills at 99 Section - Inner Panel */}
              {!isStatsReady ? (
                <SkillsGridSkeleton title="Skills at 99" iconColor="text-[#22c55e]" />
              ) : playerData.stats && (() => {
                const skillsAt99 = skillOrder
                  .filter(skill => {
                    if (skill === 'overall') return false
                    return playerData.stats[skill] && playerData.stats[skill].level >= 99 && playerData.stats[skill].level < 120
                  })
                  .map(skill => ({
                    name: skill,
                    icon: getSkillIcon(skill),
                    xp: playerData.stats[skill].xp,
                    rank: playerData.stats[skill].rank
                  }))
                  .filter(skill => skill.icon)
                  .sort((a, b) => (a.xp || 0) - (b.xp || 0))

                return skillsAt99.length > 0 ? (
                  <div className="fantasy-section p-6">
                    <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
                      <BarChart2 className="w-5 h-5 text-[#22c55e]" />
                      <span>Skills at 99 [{skillsAt99.length}]</span>
                    </h3>
                    <div className="h-px bg-slate-700/60 mb-4" />
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {skillsAt99.map((skill) => {
                      const categoryInfo = getSkillCategory(skill.name);
                      return (
                        <Tooltip
                          key={skill.name}
                          className="skill-tooltip"
                          title={skill.name.charAt(0).toUpperCase() + skill.name.slice(1)}
                          imageSrc={skill.icon || undefined}
                          headerTag={categoryInfo && (
                            <span className={`tooltip-skill-tag ${categoryInfo.className}`}>
                              {categoryInfo.label}
                            </span>
                          )}
                          rows={[
                            {
                              label: 'Level:',
                              value: String(playerData.stats[skill.name]?.level || 0)
                            },
                            {
                              label: 'XP:',
                              value: (playerData.stats[skill.name]?.xp || 0).toLocaleString()
                            }
                          ]}
                          footerText={`Rank: #${(playerData.stats[skill.name]?.rank || 0).toLocaleString()}`}
                          placement="top"
                        >
                          <div
                            className="flex items-center justify-center p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-help"
                          >
                            <img
                              src={skill.icon!}
                              alt={skill.name}
                              className="w-6 h-6"
                            />
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  </div>
                ) : null
              })()}

              {/* Skills at 120+ Section - Inner Panel */}
              {!isStatsReady ? (
                <SkillsGridSkeleton title="Skills at 120" iconColor="text-[#be9a55]" />
              ) : playerData.stats && (() => {
                const skillsAt120Plus = skillOrder
                  .filter(skill => {
                    if (skill === 'overall') return false
                    return playerData.stats[skill] && playerData.stats[skill].level >= 120 && playerData.stats[skill].xp < 200000000
                  })
                  .map(skill => ({
                    name: skill,
                    icon: getSkillIcon(skill),
                    xp: playerData.stats[skill].xp,
                    rank: playerData.stats[skill].rank
                  }))
                  .filter(skill => skill.icon)
                  .sort((a, b) => (a.xp || 0) - (b.xp || 0))

                return skillsAt120Plus.length > 0 ? (
                  <div className="fantasy-section p-6">
                    <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
                      <BarChart2 className="w-5 h-5 text-[#be9a55]" />
                      <span>Skills at 120 [{skillsAt120Plus.length}]</span>
                    </h3>
                    <div className="h-px bg-slate-700/60 mb-4" />
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {skillsAt120Plus.map((skill) => {
                      const categoryInfo = getSkillCategory(skill.name);
                      return (
                        <Tooltip
                          key={skill.name}
                          className="skill-tooltip"
                          title={skill.name.charAt(0).toUpperCase() + skill.name.slice(1)}
                          imageSrc={skill.icon || undefined}
                          headerTag={categoryInfo && (
                            <span className={`tooltip-skill-tag ${categoryInfo.className}`}>
                              {categoryInfo.label}
                            </span>
                          )}
                          rows={[
                            {
                              label: 'Level:',
                              value: String(playerData.stats[skill.name]?.level || 0)
                            },
                            {
                              label: 'XP:',
                              value: (playerData.stats[skill.name]?.xp || 0).toLocaleString()
                            }
                          ]}
                          footerText={`Rank: #${(playerData.stats[skill.name]?.rank || 0).toLocaleString()}`}
                          placement="top"
                        >
                          <div
                            className="flex items-center justify-center p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-help"
                          >
                            <img
                              src={skill.icon!}
                              alt={skill.name}
                              className="w-6 h-6"
                            />
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  </div>
                ) : null
              })()}

              {/* Skills at 200m Section - Inner Panel */}
              {!isStatsReady ? (
                <SkillsGridSkeleton title="Skills at 200m" iconColor="text-[#a855f7]" />
              ) : playerData.stats && (() => {
                const skillsAt200m = skillOrder
                  .filter(skill => {
                    if (skill === 'overall') return false
                    return playerData.stats[skill] && playerData.stats[skill].xp >= 200000000
                  })
                  .map(skill => ({
                    name: skill,
                    icon: getSkillIcon(skill),
                    xp: playerData.stats[skill].xp,
                    rank: playerData.stats[skill].rank
                  }))
                  .filter(skill => skill.icon)
                  .sort((a, b) => (a.rank || 0) - (b.rank || 0))

                return skillsAt200m.length > 0 ? (
                  <div className="fantasy-section p-6">
                    <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
                      <BarChart2 className="w-5 h-5 text-[#a855f7]" />
                      <span>Skills at 200m [{skillsAt200m.length}]</span>
                    </h3>
                    <div className="h-px bg-slate-700/60 mb-4" />
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {skillsAt200m.map((skill) => {
                      const categoryInfo = getSkillCategory(skill.name);
                      return (
                        <Tooltip
                          key={skill.name}
                          className="skill-tooltip"
                          title={skill.name.charAt(0).toUpperCase() + skill.name.slice(1)}
                          imageSrc={skill.icon || undefined}
                          headerTag={categoryInfo && (
                            <span className={`tooltip-skill-tag ${categoryInfo.className}`}>
                              {categoryInfo.label}
                            </span>
                          )}
                          rows={[
                            {
                              label: 'Level:',
                              value: String(playerData.stats[skill.name]?.level || 0)
                            },
                            {
                              label: 'XP:',
                              value: (playerData.stats[skill.name]?.xp || 0).toLocaleString()
                            }
                          ]}
                          footerText={`Rank: #${(playerData.stats[skill.name]?.rank || 0).toLocaleString()}`}
                          placement="top"
                        >
                          <div
                            className="flex items-center justify-center p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-help"
                          >
                            <img
                              src={skill.icon!}
                              alt={skill.name}
                              className="w-6 h-6"
                            />
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* Right Column - Tabs */}
            {!isStatsReady ? (
              <TabsSkeleton />
            ) : (
            <div className="fantasy-section p-6">
              <div className="flex flex-wrap gap-2 border-b border-slate-600 pb-4 mb-4">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-3 py-2 transition-colors ${
                        activeTab === tab.id
                          ? 'bg-theme-button text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
              {renderTabContent()}
            </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Badge Assignment Modal */}
      <BadgeAssignmentModal
        isOpen={isBadgeModalOpen}
        onClose={handleCloseBadgeModal}
        customBadges={modalCustomBadges}
        assignedBadgeIds={(playerData?.custom_badges || []).map((badge: CustomBadge) => badge.id)}
        onSave={handleSaveBadgeAssignments}
        memberUsername={urlToUsername(username || '')}
        loading={badgeModalLoading}
        error={badgeModalError}
      />
      
      {/* Debug Modal Props */}
      {isBadgeModalOpen && (() => {
        console.log('🔐 DEBUG: Modal props being passed:', {
          isOpen: isBadgeModalOpen,
          customBadges: modalCustomBadges,
          customBadgesLength: modalCustomBadges?.length || 0,
          modalCustomBadgesData: modalCustomBadges,
          loading: badgeModalLoading,
          error: badgeModalError
        })
        console.log('🔐 DEBUG: modalCustomBadges actual data:', JSON.stringify(modalCustomBadges, null, 2))
        return null
      })()}

    </>
  )
}

export default PlayerProfile
