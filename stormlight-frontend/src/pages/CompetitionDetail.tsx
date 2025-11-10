import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { ArrowLeft, Trophy, Calendar, Users, TrendingUp, BarChart3, ArrowUp, ArrowDown, Radio } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { getSkillIcon } from '../utils/skillIcons'
import { fetchClanMembers } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BingoBoard } from '../components/BingoBoard'

interface CompetitionLeaderboard {
  username: string
  xp_gain?: number
  squares_completed?: number
  total_squares?: number
  completion_percentage?: number
  completed_positions?: number[]
  bingos?: number
  skill?: string
  rank?: number | null
  previousRank?: number | null
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
  top_10?: CompetitionLeaderboard[]
  rewardFirstGp?: number
  rewardSecondGp?: number
  rewardThirdGp?: number
  rewardBadgeId?: string
}

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clanMembers, setClanMembers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [top10Data, setTop10Data] = useState<CompetitionLeaderboard[]>([])
  const [leaderboardData, setLeaderboardData] = useState<CompetitionLeaderboard[]>([])
  const [firstPlaceData, setFirstPlaceData] = useState<CompetitionLeaderboard | null>(null)
  const [timelineData, setTimelineData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (id) {
      fetchCompetitionInitial()
      loadClanMembers()
    }
  }, [id])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (competition && competition.type === 'XP_GAIN') {
      const now = new Date()
      const start = new Date(competition.startDate)
      const end = new Date(competition.endDate)
      const isActive = now >= start && now <= end
      
      setIsLive(isActive)
      
      if (isActive) {
        fetchLiveData()
        
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        
        pollIntervalRef.current = setInterval(() => {
          fetchLiveData()
        }, 60000)
      } else {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [competition, currentPage])

  const loadClanMembers = async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
  }

  const fetchCompetitionInitial = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/competitions/${id}?page=1&per_page=25`)
      if (response.ok) {
        const data = await response.json()
        setCompetition(data)
        setLeaderboardData(data.leaderboard || [])
        
        if (data.top_10) {
          setTop10Data(data.top_10)
          
          if (data.type === 'XP_GAIN') {
            const now = new Date().toISOString()
            const startDate = data.startDate
            const seededTimeline: any = {}
            
            data.top_10.forEach((player: CompetitionLeaderboard) => {
              seededTimeline[player.username] = [
                { timestamp: startDate, xp_gain: 0 },
                { timestamp: now, xp_gain: player.xp_gain || 0 }
              ]
            })
            
            setTimelineData(seededTimeline)
          }
        }
        
        // Store first place player data for BingoBoard
        if (data.leaderboard && data.leaderboard.length > 0) {
          const firstPlace = data.leaderboard.find((p: CompetitionLeaderboard) => p.rank === 1)
          if (firstPlace) {
            setFirstPlaceData(firstPlace)
          }
        }
        
        if (data.pagination) {
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.total_pages)
          setTotalParticipants(data.pagination.total)
        }
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

  const fetchLiveData = async () => {
    if (!id || !competition || competition.type !== 'XP_GAIN') return
    
    try {
      const response = await fetch(`${API_URL}/api/competitions/${id}?page=${currentPage}&per_page=25`)
      if (response.ok) {
        const data = await response.json()
        
        const newRanks = new Map<string, number>()
        const updatedLeaderboard = data.leaderboard.map((player: CompetitionLeaderboard) => {
          const prevRank = previousRanks.get(player.username)
          newRanks.set(player.username, player.rank || 0)
          return {
            ...player,
            previousRank: prevRank
          }
        })
        
        setLeaderboardData(updatedLeaderboard)
        setPreviousRanks(newRanks)
        
        if (data.top_10) {
          setTop10Data(data.top_10)
          
          const now = new Date().toISOString()
          setTimelineData((prev: any) => {
            if (!prev) return prev
            
            const updated = { ...prev }
            data.top_10.forEach((player: CompetitionLeaderboard) => {
              if (!updated[player.username]) {
                updated[player.username] = [
                  { timestamp: competition.startDate, xp_gain: 0 },
                  { timestamp: now, xp_gain: player.xp_gain || 0 }
                ]
              } else {
                const lastPoint = updated[player.username][updated[player.username].length - 1]
                if (lastPoint.timestamp !== now) {
                  updated[player.username] = [
                    ...updated[player.username],
                    { timestamp: now, xp_gain: player.xp_gain || 0 }
                  ]
                }
              }
            })
            
            return updated
          })
        }
        
        if (data.pagination) {
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.total_pages)
          setTotalParticipants(data.pagination.total)
        }
        
        setLastUpdated(new Date().toISOString())
      }
    } catch (error) {
      console.error('Error fetching live competition data:', error)
    }
  }

  const fetchLeaderboardPage = async (page: number) => {
    try {
      setPaginationLoading(true)
      
      if (isLive && competition?.type === 'XP_GAIN') {
        const response = await fetch(`${API_URL}/api/competitions/${id}/live?page=${page}&per_page=25`)
        if (response.ok) {
          const data = await response.json()
          
          const newRanks = new Map<string, number>()
          const updatedLeaderboard = data.leaderboard.map((player: CompetitionLeaderboard) => {
            const prevRank = previousRanks.get(player.username)
            newRanks.set(player.username, player.rank || 0)
            return {
              ...player,
              previousRank: prevRank
            }
          })
          
          setLeaderboardData(updatedLeaderboard)
          setPreviousRanks(newRanks)
          
          if (data.pagination) {
            setCurrentPage(data.pagination.page)
            setTotalPages(data.pagination.total_pages)
            setTotalParticipants(data.pagination.total)
          }
          
          if (data.last_updated) {
            setLastUpdated(data.last_updated)
          }
        }
      } else {
        const response = await fetch(`${API_URL}/api/competitions/${id}?page=${page}&per_page=25`)
        if (response.ok) {
          const data = await response.json()
          setLeaderboardData(data.leaderboard || [])
          
          if (data.pagination) {
            setCurrentPage(data.pagination.page)
            setTotalPages(data.pagination.total_pages)
            setTotalParticipants(data.pagination.total)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard page:', error)
    } finally {
      setPaginationLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatFullNumber = (num: number) => {
    return num.toLocaleString()
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

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return ''
    const now = new Date()
    const updated = new Date(lastUpdated)
    const diffSeconds = Math.floor((now.getTime() - updated.getTime()) / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ago`
  }

  const prepareLineChartData = () => {
    if (!timelineData || !top10Data || top10Data.length === 0) return []
    
    const allTimestamps = new Set<string>()
    Object.values(timelineData).forEach((timeline: any) => {
      timeline.forEach((point: any) => {
        allTimestamps.add(point.timestamp)
      })
    })
    
    const sortedTimestamps = Array.from(allTimestamps).sort()
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: any = {
        timestamp: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      
      top10Data.forEach(player => {
        const playerTimeline = timelineData[player.username] || []
        const point = playerTimeline.find((p: any) => p.timestamp === timestamp)
        dataPoint[player.username] = point ? point.xp_gain : null
      })
      
      return dataPoint
    })
  }

  const getLineColor = (index: number) => {
    const colors = [
      '#fbbf24', // gold
      '#9ca3af', // silver
      '#f59e0b', // bronze
      '#10b981', // green
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f97316', // orange
      '#06b6d4', // cyan
      '#84cc16'  // lime
    ]
    return colors[index % colors.length]
  }


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <Spinner size="lg" />
        <div className="text-white text-xl">Loading competition...</div>
      </div>
    )
  }

  if (error || !competition) {
    return (
      <div className="space-y-6">
        <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
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

  return (
    <div className="space-y-6">
      <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
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
              <div className="text-left">
                <CardTitle className="text-2xl text-white mb-2 text-left">
                  {competition.name}
                </CardTitle>
                <p className="text-slate-400 text-left">
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-theme-accent-light" />
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
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Type</p>
                <p className="text-white font-medium">
                  {competition.type === 'XP_GAIN' ? 'Skilling' : 'PvM'}
                </p>
              </div>
            </div>
            {competition.type === 'XP_GAIN' && competition.skill && (
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Skill</p>
                  <p className="text-white font-medium capitalize">
                    {competition.skill}
                  </p>
                </div>
              </div>
            )}
            {competition.type === 'BOSS_KILLS' && competition.boardSize && (
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Grid Size</p>
                  <p className="text-white font-medium">
                    {competition.boardSize}×{competition.boardSize}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Participants</p>
                <p className="text-white font-medium">
                  {totalParticipants}
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
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardFirstGp / 1000000).toFixed(0)}M GP</div>
                  {competition.rewardBadgeId && <div className="text-xs text-green-400 mt-1">+ Competition Badge</div>}
                </div>
              )}
              {competition.rewardSecondGp && (
                <div className="p-4 bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-400/30 rounded-lg">
                  <div className="text-2xl mb-2">🥈</div>
                  <div className="text-sm text-slate-400">2nd Place</div>
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardSecondGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
              {competition.rewardThirdGp && (
                <div className="p-4 bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-600/30 rounded-lg">
                  <div className="text-2xl mb-2">🥉</div>
                  <div className="text-sm text-slate-400">3rd Place</div>
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardThirdGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {competition.type === 'XP_GAIN' && top10Data.length > 0 && timelineData && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span>Top 10 Progress</span>
              </div>
              {isLive && lastUpdated && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center space-x-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live • {getTimeSinceUpdate()}</span>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={prepareLineChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tickCount={10}
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
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {top10Data.map((player, index) => (
                  <Line
                    key={player.username}
                    type="monotone"
                    dataKey={player.username}
                    stroke={getLineColor(index)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
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
              completedPositions={firstPlaceData?.completed_positions || []}
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Leaderboard</span>
            </div>
            {isLive && lastUpdated && competition.type === 'XP_GAIN' && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center space-x-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Live • {getTimeSinceUpdate()}</span>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competition.type === 'XP_GAIN' ? (
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Player</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">XP Gained</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto text-center">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((player) => {
                  const rankChange = player.previousRank && player.rank 
                    ? player.previousRank - player.rank 
                    : null
                  
                  return (
                    <TableRow 
                      key={player.username} 
                      className={`border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50 ${
                        player.rank === 1 ? 'bg-gradient-to-r from-yellow-600/10 to-yellow-800/10' :
                        player.rank === 2 ? 'bg-gradient-to-r from-gray-400/10 to-gray-600/10' :
                        player.rank === 3 ? 'bg-gradient-to-r from-amber-600/10 to-amber-800/10' : ''
                      }`}
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={
                              player.rank === 1 ? 'rank-badge rank-1-badge' :
                              player.rank === 2 ? 'rank-badge rank-2-badge' :
                              player.rank === 3 ? 'rank-badge rank-3-badge' :
                              'rank-badge rank-border'
                            }
                          >
                            #{player.rank || '—'}
                          </Badge>
                          {player.rank && player.rank <= 3 && (
                            <span className="text-lg">
                              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Link 
                          to={`/clan-member/${usernameToUrl(player.username)}`}
                          className="font-medium hover:text-theme-accent-light transition-colors"
                        >
                          <Username
                            username={player.username}
                            clanRank={clanMembers.find(m => m.username === player.username)?.clan_rank}
                          />
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-green-400 font-bold">
                          {formatFullNumber(player.xp_gain || 0)} XP
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {rankChange !== null && rankChange !== 0 ? (
                          <div className="flex items-center justify-center space-x-1">
                            {rankChange > 0 ? (
                              <>
                                <ArrowUp className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-medium">{rankChange}</span>
                              </>
                            ) : (
                              <>
                                <ArrowDown className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-medium">{Math.abs(rankChange)}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-4">
              {leaderboardData.map((player) => (
                <div
                  key={player.username}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                    player.rank === 1
                      ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30' 
                      : player.rank === 2
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-600/20 border border-gray-400/30'
                      : player.rank === 3
                      ? 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border border-amber-600/30'
                      : 'bg-slate-700/50 hover:bg-slate-700/70'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant="outline" 
                      className={
                        player.rank === 1
                          ? 'rank-badge rank-1-badge' 
                          : player.rank === 2
                          ? 'rank-badge rank-2-badge'
                          : player.rank === 3
                          ? 'rank-badge rank-3-badge'
                          : 'rank-badge rank-border'
                      }
                    >
                      #{player.rank || '—'}
                    </Badge>
                    <Link 
                      to={`/clan-member/${usernameToUrl(player.username)}`}
                      className="text-lg font-semibold hover:text-theme-accent-light transition-colors"
                    >
                      <Username
                        username={player.username}
                        clanRank={clanMembers.find(m => m.username === player.username)?.clan_rank}
                      />
                    </Link>
                    {player.rank && player.rank <= 3 && (
                      <span className="text-lg">
                        {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6">
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
                    {player.bingos !== undefined && player.bingos > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Bingos</p>
                        <p className="text-lg font-bold text-yellow-400">
                          {player.bingos}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * 25) + 1} to {Math.min(currentPage * 25, totalParticipants)} of {totalParticipants} participants
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={() => fetchLeaderboardPage(currentPage - 1)}
                      disabled={currentPage === 1 || paginationLoading}
                      className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50 disabled:bg-theme-button/50"
                    >
                      {paginationLoading && currentPage > 1 ? 'Loading...' : 'Previous'}
                    </Button>
                    <div className="text-sm text-slate-300">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => fetchLeaderboardPage(currentPage + 1)}
                      disabled={currentPage === totalPages || paginationLoading}
                      className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50 disabled:bg-theme-button/50"
                    >
                      {paginationLoading && currentPage < totalPages ? 'Loading...' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

      </Card>
    </div>
  )
}

export default CompetitionDetail
