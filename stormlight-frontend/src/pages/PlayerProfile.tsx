import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, User, TrendingUp, Crown, Package, Activity, MapPin, BarChart3, Swords, FileText, RefreshCw, Plus, X, Trophy } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { getSkillIcon } from '../utils/skillIcons'
import { getGradientStyle, checkPlayerMilestones } from '../utils/gradientUtils'
import { urlToUsername } from '../utils/urlUtils'
import { useAuth } from '../contexts/AuthContext'
import { RunePixelsTooltip } from '../components/ui/tooltip'
import { BadgeAssignmentModal } from '../components/ui/badge-assignment-modal'
import { DropsTab } from '../components/tabs/DropsTab'
import { ActivityTab } from '../components/tabs/ActivityTab'
import { QuestsTab } from '../components/tabs/QuestsTab'
import { AnalyticsTab } from '../components/tabs/AnalyticsTab'
import { CompetitionsTab } from '../components/tabs/CompetitionsTab'
import { LogTab } from '../components/tabs/LogTab'

interface CustomBadge {
  id: string
  name: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
}

interface PlayerStats {
  badges?: Array<{ id: string; name: string; imageUrl: string; type: string }>
  username: string
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
  const { user } = useAuth()
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [questData, setQuestData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('skills')
  const [period1, setPeriod1] = useState('today')
  const [period2, setPeriod2] = useState('yesterday')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [modalCustomBadges, setModalCustomBadges] = useState<CustomBadge[]>([])
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false)
  const [badgeModalLoading, setBadgeModalLoading] = useState(false)
  const [badgeModalError, setBadgeModalError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (username) {
      fetchPlayerStats()
      fetchQuestData()
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
          last_updated: data.last_updated 
        })
        setPlayerData(data)
      } else {
        setError('Clan member not found or stats unavailable')
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setError('Failed to load player stats')
    } finally {
      setLoading(false)
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
      console.log('🔐 FRONTEND: Fetching custom badges with token:', token ? 'Token exists' : 'No token')
      console.log('🔐 FRONTEND: Token length:', token ? token.length : 0)
      console.log('🔐 FRONTEND: API URL:', `${API_URL}/api/admin/badges`)
      
      const response = await fetch(`${API_URL}/api/admin/badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('🔐 FRONTEND: Response status:', response.status)
      console.log('🔐 FRONTEND: Response ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔐 FRONTEND: Badges loaded successfully:', data.badges?.length || 0)
        setModalCustomBadges(data.badges || [])
      } else {
        const errorText = await response.text()
        console.log('🔐 FRONTEND: Error response:', errorText)
        setBadgeModalError(`Failed to load custom badges: ${response.status}`)
      }
    } catch (error) {
      console.error('🔐 FRONTEND: Error fetching custom badges:', error)
      setBadgeModalError('Error loading custom badges')
    } finally {
      setBadgeModalLoading(false)
    }
  }


  const handleRemoveBadge = async (badgeId: string) => {
    try {
      const token = localStorage.getItem('access_token')
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

      if (response.ok) {
        await fetchPlayerStats()
      }
    } catch (error) {
      console.error('Error removing badge:', error)
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
      
      const milestoneBadges = checkPlayerMilestones(playerData?.stats, questData, playerData?.clan_rank, urlToUsername(username || ''))
      const nonRankBadges = milestoneBadges.filter(badge => !badge.id.startsWith('rank-'))
      const customBadges = ((playerData as any)?.custom_badges || []).map((badge: CustomBadge) => ({
        id: `custom-${badge.id}`,
        name: badge.name,
        backgroundColor: badge.backgroundColor || '#6b7280',
        gradientBackground: badge.gradientColors ? 
          `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})` : 
          undefined,
        icon: badge.imageUrl
      }))
      const allBadges = [...nonRankBadges, ...customBadges]
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading clan member profile...</div>
      </div>
    )
  }

  if (error || !playerData) {
    return (
      <div className="space-y-6">
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link to="/members">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Link>
        </Button>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <p className="text-slate-400 mt-2">
              The clan member "{username}" could not be found or their stats are unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const skillOrder = [
    'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
    'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'summoning',
    'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy'
  ]


  const skills = skillOrder
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
    })

  const overallStats = playerData.stats.overall
  

  const tabs = [
    { id: 'skills', label: 'Skill Breakdown', icon: TrendingUp },
    { id: 'drops', label: 'Drops', icon: Package },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'quests', label: 'Quests', icon: MapPin },
    { id: 'analytics', label: 'XP Analytics', icon: BarChart3 },
    { id: 'competitions', label: 'Competitions', icon: Swords },
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
                <TableRow className="border-slate-600 hover:bg-slate-800/50">
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
                  <TableRow key={skill} className="border-slate-600 hover:bg-slate-800/50">
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
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
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
                          <span className="text-blue-400 font-medium">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link to="/members">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Link>
        </Button>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || (lastRefresh ? Date.now() - lastRefresh < 300000 : false)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-blue-800"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
        
        <div className="space-y-6">
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage
                    src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(urlToUsername(username || ''))}/chat.png`}
                    alt={urlToUsername(username || '')}
                  />
                  <AvatarFallback className="bg-blue-600 text-white">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h1 className={`text-2xl font-bold ${playerData.is_verified ? 'flex items-center gap-2 justify-center' : 'text-center'}`}>
                    <span 
                      style={getGradientStyle(urlToUsername(username || ''), playerData.clan_rank)}
                    >
                      {urlToUsername(username || '')}
                    </span>
                    {playerData.is_verified && (
                      <span className="text-green-400" title="Discord account verified">
                        ✅
                      </span>
                    )}
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Last updated: {new Date(playerData.last_updated).toLocaleDateString()}
                  </p>
                  
                  {/* Rank Badge */}
                  {playerData.stats && (() => {
                    const allBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, urlToUsername(username || ''))
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
                            className="w-4 h-4"
                          />
                          <span>{rankBadge.name}</span>
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>

              {overallStats && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Combat Level</p>
                      <p className="text-xl font-bold text-white">{overallStats.combatlevel}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Quest Points</p>
                      <p className="text-xl font-bold text-white">{playerData.quest_points || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Total Level</p>
                      <p className="text-xl font-bold text-white">{overallStats.level}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Total XP</p>
                      <p className="text-xl font-bold text-green-400">
                        {overallStats.xp.toLocaleString()}
                      </p>
                    </div>
                    {overallStats.rank && (
                      <div className="text-center">
                        <p className="text-xs text-slate-400 mb-1">Overall Rank</p>
                        <p className="text-xl font-bold text-blue-400">
                          #{overallStats.rank.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {playerData.stats && (() => {
            const milestoneBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, urlToUsername(username || ''))
            const nonRankBadges = milestoneBadges.filter(badge => !badge.id.startsWith('rank-'))
            
            const customBadges = ((playerData as any).custom_badges || []).map((badge: CustomBadge) => ({
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
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span>Badges</span>
                    </div>
                    {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleOpenBadgeModal}
                          size="sm"
                          className="w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 border-blue-600"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {allBadges.map((badge) => (
                        <RunePixelsTooltip
                          key={badge.id}
                          content={
                            <div>
                              <div className="font-semibold text-white">{badge.name}</div>
                            </div>
                          }
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
                            className="w-4 h-4"
                          />
                          <span>{badge.name}</span>
                          {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && badge.id.includes('custom') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveBadge(badge.id)}
                              className="ml-2 p-1 h-6 w-6 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                          </div>
                        </RunePixelsTooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null
          })()}

          {/* Skills at 120+ Card */}
          {playerData.stats && (() => {
            const skillsAt120Plus = skillOrder
              .filter(skill => {
                if (skill === 'overall') return false
                return playerData.stats[skill] && playerData.stats[skill].level >= 120
              })
              .map(skill => ({
                name: skill,
                icon: getSkillIcon(skill)
              }))
              .filter(skill => skill.icon)

            return skillsAt120Plus.length > 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>Skills at 120 [{skillsAt120Plus.length}]</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {skillsAt120Plus.map((skill) => (
                      <RunePixelsTooltip
                        key={skill.name}
                        content={
                          <div>
                            <div className="font-semibold text-white">
                              {skill.name.charAt(0).toUpperCase() + skill.name.slice(1)}
                            </div>
                            <div className="text-green-400">
                              Level {playerData.stats[skill.name]?.level || 0}
                            </div>
                            <div className="text-blue-400">
                              {(playerData.stats[skill.name]?.xp || 0).toLocaleString()} XP
                            </div>
                          </div>
                        }
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
                      </RunePixelsTooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null
          })()}
        </div>

        <div>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap gap-2 border-b border-slate-600 pb-4">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent>
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Badge Assignment Modal */}
      {playerData?.stats && (() => {
        const customBadges = ((playerData as any).custom_badges || []).map((badge: CustomBadge) => ({
          id: `custom-${badge.id}`,
          name: badge.name,
          backgroundColor: badge.backgroundColor || '#6b7280',
          gradientBackground: badge.gradientColors ? 
            `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})` : 
            undefined,
          icon: badge.imageUrl
        }))
        const allBadges = [...milestoneBadges.filter(badge => !badge.id.startsWith('rank-')), ...customBadges]
        const assignedCustomBadgeIds = customBadges.map((badge: any) => badge.id.replace('custom-', ''))
        
        return (
          <BadgeAssignmentModal
            isOpen={isBadgeModalOpen}
            onClose={handleCloseBadgeModal}
            customBadges={modalCustomBadges}
            assignedBadgeIds={assignedCustomBadgeIds}
            onSave={handleSaveBadgeAssignments}
            memberUsername={urlToUsername(username || '')}
            loading={badgeModalLoading}
            error={badgeModalError}
          />
        )
      })()}
    </div>
  )
}

export default PlayerProfile
