import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, User, Trophy, TrendingUp } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'

interface PlayerStats {
  username: string
  stats: {
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
    }
  }
  last_updated: string
}

const PlayerProfile = () => {
  const { username } = useParams<{ username: string }>()
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (username) {
      fetchPlayerStats()
    }
  }, [username])

  const fetchPlayerStats = async () => {
    try {
      const decodedUsername = decodeURIComponent(username || '')
      const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(decodedUsername)}/stats`)
      if (response.ok) {
        const data = await response.json()
        setPlayerData(data)
      } else {
        setError('Player not found or stats unavailable')
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setError('Failed to load player stats')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getSkillIcon = (skill: string) => {
    const icons: { [key: string]: string } = {
      overall: '⚔️',
      attack: '⚔️',
      defence: '🛡️',
      strength: '💪',
      constitution: '❤️',
      ranged: '🏹',
      prayer: '🙏',
      magic: '🔮',
      cooking: '🍳',
      woodcutting: '🪓',
      fletching: '🏹',
      fishing: '🎣',
      firemaking: '🔥',
      crafting: '🔨',
      smithing: '⚒️',
      mining: '⛏️',
      herblore: '🧪',
      agility: '🏃',
      thieving: '🗡️',
      slayer: '💀',
      farming: '🌱',
      runecrafting: '🔮',
      hunter: '🏹',
      construction: '🏠',
      summoning: '👹',
      dungeoneering: '🏰',
      divination: '✨',
      invention: '⚙️',
      archaeology: '🏺',
      necromancy: '💀'
    }
    return icons[skill] || '📊'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading player profile...</div>
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
              The player "{username}" could not be found or their stats are unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const skills = Object.entries(playerData.stats).filter(([skill]) => skill !== 'overall')
  const overallStats = playerData.stats.overall

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
        <Link to="/members">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Members
        </Link>
      </Button>

      <div className="text-center">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <Avatar className="w-16 h-16">
            <AvatarImage 
              src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(decodeURIComponent(username || '').replace(/\s+/g, '%20'))}/chat.png`}
              alt={decodeURIComponent(username || '')}
            />
            <AvatarFallback className="bg-blue-600 text-white">
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-white">{decodeURIComponent(username || '')}</h1>
            <p className="text-slate-400">
              Last updated: {new Date(playerData.last_updated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {overallStats && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Overall Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Total Level</p>
                <p className="text-3xl font-bold text-white">{overallStats.level}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Total XP</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatNumber(overallStats.xp)}
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
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span>Skill Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(([skill, data]) => (
              <div key={skill} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSkillIcon(skill)}</span>
                    <span className="font-medium text-white capitalize">{skill}</span>
                  </div>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {data.level}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">XP:</span>
                    <span className="text-green-400 font-medium">
                      {formatNumber(data.xp)}
                    </span>
                  </div>
                  {data.rank && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Rank:</span>
                      <span className="text-blue-400 font-medium">
                        #{data.rank.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PlayerProfile
