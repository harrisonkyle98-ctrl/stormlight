import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, User, Trophy, TrendingUp, Crown, Package, Activity, MapPin, BarChart3, Swords, FileText, RefreshCw } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { getSkillIcon } from '../utils/skillIcons'
import { getGradientColors, getGradientStyle, checkPlayerMilestones } from '../utils/gradientUtils'
import { urlToUsername } from '../utils/urlUtils'
import { DropsTab } from '../components/tabs/DropsTab'
import { ActivityTab } from '../components/tabs/ActivityTab'
import { QuestsTab } from '../components/tabs/QuestsTab'
import { AnalyticsTab } from '../components/tabs/AnalyticsTab'
import { CompetitionsTab } from '../components/tabs/CompetitionsTab'
import { LogTab } from '../components/tabs/LogTab'

interface PlayerStats {
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
}

const PlayerProfile = () => {
  const { username } = useParams<{ username: string }>()
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [questData, setQuestData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('skills')
  const [period1, setPeriod1] = useState('today')
  const [period2, setPeriod2] = useState('yesterday')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (username) {
      fetchPlayerStats()
      fetchQuestData()
    }
  }, [username, period1, period2])

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

  const getRankIcon = (rank: string) => {
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
    const imageName = rankImageMap[rank]
    if (imageName) {
      return `/assets/ranks/${imageName}`
    }
    return null
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
        <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
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
          level: playerData.stats.overall.level,
          rank: playerData.stats.overall.rank,
          xp: playerData.stats.overall.xp,
          level_change: 0, // Overall doesn't track level changes
          rank_change: 0,  // Overall doesn't track rank changes
          xp_change: 0     // Overall doesn't track XP changes
        }] as [string, any]
      }
      return [skill, playerData.stats[skill]] as [string, any]
    })

  const overallStats = playerData.stats.overall
  
  console.log('=== Conditional Rendering Debug ===')
  const firstSkill = skills[0]
  if (firstSkill) {
    const [skillName, skillData] = firstSkill
    console.log(`${skillName} conditional check:`, {
      level_change: skillData.level_change,
      level_change_check: skillData.level_change && skillData.level_change !== 0,
      rank_change: skillData.rank_change,
      rank_change_check: skillData.rank_change && skillData.rank_change !== 0
    })
  }

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
                            <span className={data.rank_change < 0 ? 'text-green-400' : 'text-red-400'}>
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
                        {data.xp_change ? `+${data.xp_change.toLocaleString()}` : '0'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-slate-400 font-medium">
                        {data.xp_period2 ? data.xp_period2.toLocaleString() : '0'}
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
        <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Link to="/members">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Link>
        </Button>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || (lastRefresh ? Date.now() - lastRefresh < 300000 : false)}
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="text-center">
        <div className="flex flex-col items-center space-y-4 mb-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(urlToUsername(username || ''))}/chat.png`}
              alt={urlToUsername(username || '')}
            />
            <AvatarFallback className="bg-blue-600 text-white">
              <User className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 
              className="text-3xl font-bold"
              style={getGradientStyle(urlToUsername(username || ''), playerData.clan_rank)}
            >
              {urlToUsername(username || '')}
            </h1>
            <p className="text-slate-400">
              Last updated: {new Date(playerData.last_updated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {(playerData.clan_rank || (playerData.stats && checkPlayerMilestones(playerData.stats).length > 0)) && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span>Badges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center flex-wrap gap-3">
              {playerData.clan_rank && (
                <div 
                  className="px-3 py-1 text-base font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{
                    background: `linear-gradient(135deg, ${getGradientColors(urlToUsername(username || ''), playerData.clan_rank)[0]}, ${getGradientColors(urlToUsername(username || ''), playerData.clan_rank)[1]})`
                  }}
                >
                  {getRankIcon(playerData.clan_rank) ? (
                    <img
                      src={getRankIcon(playerData.clan_rank)!}
                      alt={playerData.clan_rank}
                      className="w-5 h-5"
                    />
                  ) : (
                    <Crown className="w-5 h-5" />
                  )}
                  <span>{playerData.clan_rank}</span>
                </div>
              )}
              
              {playerData.stats && checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank).map((badge) => (
                <div
                  key={badge.id}
                  className="px-3 py-1 text-base font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{
                    backgroundColor: badge.backgroundColor
                  }}
                >
                  <img
                    src={badge.icon}
                    alt={badge.name}
                    className="w-5 h-5"
                  />
                  <span>{badge.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {overallStats && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Overall Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Combat Level</p>
                <p className="text-3xl font-bold text-white">{overallStats.combatlevel}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Quest Points</p>
                <p className="text-3xl font-bold text-white">{playerData.quest_points || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Total Level</p>
                <p className="text-3xl font-bold text-white">{overallStats.level}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Total XP</p>
                <p className="text-3xl font-bold text-green-400">
                  {overallStats.xp.toLocaleString()}
                </p>
              </div>
              {overallStats.rank && (
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">Overall Rank</p>
                  <p className="text-3xl font-bold text-blue-400">
                    #{overallStats.rank.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
  )
}

export default PlayerProfile
