import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, Trophy, Calendar, Users, TrendingUp } from 'lucide-react'
import { getSkillIcon } from '../utils/skillIcons'
import { fetchClanMembers, getGradientStyle } from '../utils/gradientUtils'

interface CompetitionLeaderboard {
  username: string
  xp: number
  level: number
  rank: number | null
}

interface CompetitionDetail {
  id: number
  name: string
  description: string
  skill: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  participants: string[]
  leaderboard: CompetitionLeaderboard[]
}

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clanMembers, setClanMembers] = useState<any[]>([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (id) {
      fetchCompetition()
      loadClanMembers()
    }
  }, [id])

  const loadClanMembers = async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
  }

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`${API_URL}/api/competitions/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCompetition(data)
      } else {
        setError('Competition not found')
      }
    } catch (error) {
      console.error('Error fetching competition:', error)
      setError('Failed to load competition')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-blue-500' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading competition...</div>
      </div>
    )
  }

  if (error || !competition) {
    return (
      <div className="space-y-6">
        <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Link to="/competitions">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Competitions
          </Link>
        </Button>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date)

  const sampleLeaderboard = [
    { username: 'ClanLeader', xp: 2500000, level: 85, rank: 1245 },
    { username: 'SkillMaster', xp: 2200000, level: 82, rank: 1456 },
    { username: 'PvPWarrior', xp: 1800000, level: 78, rank: 2134 },
    { username: 'QuestHero', xp: 1500000, level: 75, rank: 2567 },
    { username: 'BossSlayer', xp: 1200000, level: 72, rank: 3245 },
  ]

  const leaderboardData = competition.leaderboard.length > 0 ? competition.leaderboard : sampleLeaderboard

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
        <Link to="/competitions">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Competitions
        </Link>
      </Button>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {getSkillIcon(competition.skill) ? (
                <img 
                  src={getSkillIcon(competition.skill)!} 
                  alt={competition.skill}
                  className="w-10 h-10"
                />
              ) : (
                <div className="text-4xl">📊</div>
              )}
              <div>
                <CardTitle className="text-2xl text-white mb-2">
                  {competition.name || `${competition.skill.charAt(0).toUpperCase() + competition.skill.slice(1)} Competition`}
                </CardTitle>
                <p className="text-slate-400">
                  {competition.description || `Compete for the highest ${competition.skill} XP gains!`}
                </p>
              </div>
            </div>
            <Badge className={`${color} text-white capitalize`}>
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Start Date</p>
                <p className="text-white font-medium">
                  {formatDate(competition.start_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm text-slate-400">End Date</p>
                <p className="text-white font-medium">
                  {formatDate(competition.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Participants</p>
                <p className="text-white font-medium">
                  {leaderboardData.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Skill</p>
                <p className="text-white font-medium capitalize">
                  {competition.skill}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaderboardData.map((player, index) => (
              <div
                key={player.username}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30' 
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400/20 to-gray-600/20 border border-gray-400/30'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border border-amber-600/30'
                    : 'bg-slate-700/50 hover:bg-slate-700/70'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={
                        index === 0 
                          ? 'text-yellow-400 border-yellow-400' 
                          : index === 1
                          ? 'text-gray-300 border-gray-300'
                          : index === 2
                          ? 'text-amber-400 border-amber-400'
                          : 'text-slate-400 border-slate-400'
                      }
                    >
                      #{index + 1}
                    </Badge>
                    {index < 3 && (
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    )}
                  </div>
                  <Link 
                    to={`/clan-member/${player.username}`}
                    className="text-lg font-semibold hover:text-blue-400 transition-colors"
                    style={getGradientStyle(player.username, clanMembers.find(m => m.username === player.username)?.clan_rank)}
                  >
                    {player.username}
                  </Link>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Level</p>
                    <p className="text-lg font-bold text-white">{player.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">XP</p>
                    <p className="text-lg font-bold text-green-400">
                      {formatNumber(player.xp)}
                    </p>
                  </div>
                  {player.rank && (
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Global Rank</p>
                      <p className="text-lg font-semibold text-blue-400">
                        #{player.rank.toLocaleString()}
                      </p>
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

export default CompetitionDetail
