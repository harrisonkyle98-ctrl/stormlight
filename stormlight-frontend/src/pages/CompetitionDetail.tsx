import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ArrowLeft, Trophy, Calendar, Users, TrendingUp } from 'lucide-react'
import { getSkillIcon } from '../utils/skillIcons'
import { fetchClanMembers, getGradientStyle } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BingoBoard } from '../components/BingoBoard'

interface CompetitionLeaderboard {
  username: string
  xp_gain?: number
  squares_completed?: number
  total_squares?: number
  completion_percentage?: number
  completed_positions?: number[]
  skill?: string
  rank?: number | null
}

interface CompetitionDetail {
  id: string
  name: string
  description: string
  type: 'XP_GAIN' | 'BOSS_KILLS'
  skill?: string
  boardSize?: number
  dropsGrid?: any[]
  startDate: string
  endDate: string
  createdBy: string
  createdAt: string
  leaderboard: CompetitionLeaderboard[]
  rewardFirstGp?: number
  rewardSecondGp?: number
  rewardThirdGp?: number
  rewardBadgeId?: string
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

  const { status, color } = getCompetitionStatus(competition.startDate, competition.endDate)

  const leaderboardData = competition.leaderboard || []

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
              {competition.type === 'XP_GAIN' ? (
                getSkillIcon(competition.skill || 'overall') ? (
                  <img 
                    src={getSkillIcon(competition.skill || 'overall')!} 
                    alt={competition.skill}
                    className="w-10 h-10"
                  />
                ) : (
                  <div className="text-4xl">📊</div>
                )
              ) : (
                <div className="text-4xl">💀</div>
              )}
              <div>
                <CardTitle className="text-2xl text-white mb-2">
                  {competition.name}
                </CardTitle>
                <p className="text-slate-400">
                  {competition.description || `Compete for the ${competition.type === 'XP_GAIN' ? 'highest XP gains' : 'most boss drops'}!`}
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
                  {formatDate(competition.startDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm text-slate-400">End Date</p>
                <p className="text-white font-medium">
                  {formatDate(competition.endDate)}
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
                <p className="text-sm text-slate-400">Type</p>
                <p className="text-white font-medium">
                  {competition.type === 'XP_GAIN' ? 'Skilling' : 'PvM'}
                  {competition.type === 'XP_GAIN' && competition.skill && (
                    <span className="text-slate-400 text-sm ml-1">({competition.skill})</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Competition Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competition.rewardFirstGp && (
                <div className="p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30 rounded-lg">
                  <div className="text-2xl mb-2">🥇</div>
                  <div className="text-sm text-slate-400">1st Place</div>
                  <div className="text-2xl font-bold text-yellow-400">{(competition.rewardFirstGp / 1000000).toFixed(0)}M GP</div>
                  {competition.rewardBadgeId && <div className="text-xs text-yellow-300 mt-1">+ Competition Badge</div>}
                </div>
              )}
              {competition.rewardSecondGp && (
                <div className="p-4 bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-400/30 rounded-lg">
                  <div className="text-2xl mb-2">🥈</div>
                  <div className="text-sm text-slate-400">2nd Place</div>
                  <div className="text-2xl font-bold text-gray-300">{(competition.rewardSecondGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
              {competition.rewardThirdGp && (
                <div className="p-4 bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-600/30 rounded-lg">
                  <div className="text-2xl mb-2">🥉</div>
                  <div className="text-sm text-slate-400">3rd Place</div>
                  <div className="text-2xl font-bold text-amber-400">{(competition.rewardThirdGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {competition.type === 'XP_GAIN' && leaderboardData.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span>Top 10 Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leaderboardData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="username" 
                  stroke="#9ca3af"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: any) => [formatNumber(value), 'XP Gained']}
                />
                <Bar dataKey="xp_gain" radius={[8, 8, 0, 0]}>
                  {leaderboardData.slice(0, 10).map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {competition.type === 'BOSS_KILLS' && competition.dropsGrid && competition.boardSize && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span>Competition Board ({competition.boardSize}x{competition.boardSize})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BingoBoard 
              competitionId={competition.id}
              gridSize={competition.boardSize}
              dropsGrid={competition.dropsGrid}
              completedPositions={leaderboardData[0]?.completed_positions || []}
            />
          </CardContent>
        </Card>
      )}

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
                    to={`/clan-member/${usernameToUrl(player.username)}`}
                    className="text-lg font-semibold hover:text-blue-400 transition-colors"
                    style={getGradientStyle(player.username, clanMembers.find(m => m.username === player.username)?.clan_rank)}
                  >
                    {player.username}
                  </Link>
                </div>
                
                <div className="flex items-center space-x-6">
                  {competition.type === 'XP_GAIN' ? (
                    <>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Skill</p>
                        <p className="text-lg font-bold text-white capitalize">
                          {competition.skill || 'Overall'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">XP Gained</p>
                        <p className="text-lg font-bold text-green-400">
                          {formatNumber(player.xp_gain || 0)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Completed</p>
                        <p className="text-lg font-bold text-green-400">
                          {player.squares_completed || 0} / {player.total_squares || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Progress</p>
                        <p className="text-lg font-bold text-purple-400">
                          {player.completion_percentage || 0}%
                        </p>
                      </div>
                    </>
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
