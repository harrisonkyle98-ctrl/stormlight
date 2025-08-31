import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { ArrowLeft, User, Trophy, TrendingUp, Crown, Package, Activity, MapPin, BarChart3, Swords, FileText } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { getSkillIcon } from '../utils/skillIcons'
import { getGradientColors, getGradientStyle } from '../utils/gradientUtils'

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
    }
  }
  last_updated: string
  clan_rank?: string
}

const PlayerProfile = () => {
  const { username } = useParams<{ username: string }>()
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('skills')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (username) {
      fetchPlayerStats()
    }
  }, [username])

  const fetchPlayerStats = async () => {
    try {
      const decodedUsername = decodeURIComponent(username || '')
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/stats/history?_t=${cacheBuster}`
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
    'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
    'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'summoning',
    'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy'
  ]

  const skills = skillOrder
    .filter(skill => playerData.stats[skill]) // Only include skills that exist in the data
    .map(skill => [skill, playerData.stats[skill]] as [string, any])

  const overallStats = playerData.stats.overall
  
  console.log('=== PlayerProfile Debug ===')
  console.log('playerData:', playerData)
  console.log('overallStats:', overallStats)
  console.log('combatlevel value:', overallStats.combatlevel)
  console.log('combatlevel type:', typeof overallStats.combatlevel)

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
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Today</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Yesterday</TableHead>
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
                        {data.level_change && data.level_change !== 0 && (
                          <span className={`text-sm ${data.level_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.level_change > 0 ? '+' : ''}{data.level_change}
                          </span>
                        )}
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
                        {data.rank_change && data.rank_change !== 0 && (
                          <span className={`text-sm ${data.rank_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.rank_change > 0 ? '+' : ''}{data.rank_change}
                          </span>
                        )}
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
                        0
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      case 'drops':
        return (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Drops tracking coming soon</p>
            <p className="text-slate-500 text-sm mt-2">View rare drops and loot history</p>
          </div>
        )
      case 'activity':
        return (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Activity feed coming soon</p>
            <p className="text-slate-500 text-sm mt-2">Recent player activities and achievements</p>
          </div>
        )
      case 'quests':
        return (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Quest progress coming soon</p>
            <p className="text-slate-500 text-sm mt-2">Track completed quests and achievements</p>
          </div>
        )
      case 'analytics':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">XP Analytics coming soon</p>
            <p className="text-slate-500 text-sm mt-2">Detailed XP gain charts and statistics</p>
          </div>
        )
      case 'competitions':
        return (
          <div className="text-center py-12">
            <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Competition history coming soon</p>
            <p className="text-slate-500 text-sm mt-2">Past and current competition participation</p>
          </div>
        )
      case 'log':
        return (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Activity log coming soon</p>
            <p className="text-slate-500 text-sm mt-2">Detailed activity and event history</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
        <Link to="/members">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Members
        </Link>
      </Button>

      <div className="text-center">
        <div className="flex flex-col items-center space-y-4 mb-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(decodeURIComponent(username || '').replace(/\s+/g, '%20'))}/chat.png`}
              alt={decodeURIComponent(username || '')}
            />
            <AvatarFallback className="bg-blue-600 text-white">
              <User className="w-10 h-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 
              className="text-3xl font-bold"
              style={getGradientStyle(decodeURIComponent(username || ''), playerData.clan_rank)}
            >
              {decodeURIComponent(username || '')}
            </h1>
            <p className="text-slate-400">
              Last updated: {new Date(playerData.last_updated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {playerData.clan_rank && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span>Badges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div 
                className="px-3 py-1 text-base font-semibold flex items-center space-x-2 rounded-md text-white"
                style={{
                  background: `linear-gradient(135deg, ${getGradientColors(decodeURIComponent(username || ''), playerData.clan_rank)[0]}, ${getGradientColors(decodeURIComponent(username || ''), playerData.clan_rank)[1]})`
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Combat Level</p>
                <p className="text-3xl font-bold text-white">{overallStats.combatlevel}</p>
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
