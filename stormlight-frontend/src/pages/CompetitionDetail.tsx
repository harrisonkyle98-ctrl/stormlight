import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { ArrowLeft, Trophy, Calendar, Users, BarChart3 } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { getSkillIcon } from '../utils/skillIcons'
import { fetchClanMembers } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BingoBoard } from '../components/BingoBoard'
import { useAuth } from '../contexts/AuthContext'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import '../styles/fantasy-container.css'

interface CompetitionLeaderboard {
  username: string
  xp_gain?: number
  starting_xp?: number
  ending_xp?: number
  squares_completed?: number
  total_squares?: number
  completion_percentage?: number
  completed_positions?: number[]
  bingos?: number
  skill?: string
  rank?: number | null
  previousRank?: number | null
}

interface RewardBadge {
  id: string
  name: string
  description?: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
}

interface CompetitionDetailData {
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
  rewardBadge?: RewardBadge
}

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [competition, setCompetition] = useState<CompetitionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clanMembers, setClanMembers] = useState<any[]>([])
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [top10Data, setTop10Data] = useState<CompetitionLeaderboard[]>([])
  const [leaderboardData, setLeaderboardData] = useState<CompetitionLeaderboard[]>([])
  const [firstPlaceData, setFirstPlaceData] = useState<CompetitionLeaderboard | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (id) {
      fetchCompetitionInitial()
      loadClanMembers()
    }
  }, [id])

  const loadClanMembers = async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
  }

  const fetchCompetitionInitial = async () => {
    try {
      setLoading(true)
      
      // Fetch competition data from the main endpoint
      // The scheduler keeps this data fresh for active competitions
      const response = await fetch(`${API_URL}/api/competitions/${id}`)
      if (!response.ok) {
        setError('Competition not found')
        return
      }
      
      const data = await response.json()
      
      // Set all state from the response - data is always fresh from scheduler updates
      setCompetition(data)
      setLeaderboardData(data.leaderboard || [])
      
      if (data.top_10) {
        setTop10Data(data.top_10)
      }
      
      if (data.leaderboard && data.leaderboard.length > 0) {
        const firstPlace = data.leaderboard.find((p: CompetitionLeaderboard) => p.rank === 1)
        if (firstPlace) {
          setFirstPlaceData(firstPlace)
        }
      }
      
      if (data.pagination) {
        setTotalParticipants(data.pagination.total)
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

  const formatFullNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
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
      <>
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading competition...</div>
        </div>
      </>
    )
  }

  if (error || !competition) {
    return (
      <>
        <GlobalProfileHeader />
        
        <div className="fantasy-container">
          <div className="fantasy-banner-wrapper">
            <div className="fantasy-banner-ribbon-left"></div>
            <div className="fantasy-banner-ribbon-right"></div>
            <div className="fantasy-banner fantasy-banner--competitions">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Competitions</h1>
              </div>
            </div>
          </div>

          <div className="fantasy-content">
            <div className="mb-4 flex justify-start">
              <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
                <Link to="/competitions">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Competitions
                </Link>
              </Button>
            </div>
            <div className="fantasy-section">
              <p className="text-red-400 text-lg text-center py-8">{error}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const { status } = getCompetitionStatus(competition.startDate, competition.endDate)

  return (
    <>
      <GlobalProfileHeader />

      <div className="fantasy-container">
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--competitions">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Competitions</h1>
            </div>
          </div>
        </div>

        <div className="fantasy-content">
          <div className="mb-4 flex justify-start">
            <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
              <Link to="/competitions">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Competitions
              </Link>
            </Button>
          </div>

          {/* Competition Summary - matches competition entry styling from list page */}
          <div className="competition-entry">
            {/* Status-colored ribbon header - Green=Active, Blue=Upcoming, Grey=Ended */}
            <div className={`competition-header-plate ${status === 'active' ? 'competition-header-plate--active' : status === 'ended' ? 'competition-header-plate--ended' : ''}`}>
              <div className="competition-header-plate-content">
                {/* Centered title */}
                <div className="competition-header-plate-title">
                  {competition.name}
                </div>
                {/* Icon positioned on the right */}
                {competition.type === 'XP_GAIN' ? (
                  getSkillIcon(competition.skill || 'overall') ? (
                    <img 
                      src={getSkillIcon(competition.skill || 'overall')!} 
                      alt={competition.skill}
                      className="competition-header-plate-icon"
                    />
                  ) : null
                ) : (
                  <span className="competition-header-plate-icon text-2xl">💀</span>
                )}
              </div>
            </div>
            
            {/* Inner panel - content below the ribbon header */}
            <div className="fantasy-section">
              {/* Description */}
              {competition.description && (
                <p className="text-slate-400 mb-4 text-sm">
                  {competition.description}
                </p>
              )}
            
              {/* Content section - matches list page layout exactly */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Start Date</p>
                    <p className="text-white font-medium">
                      {formatDate(competition.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">End Date</p>
                    <p className="text-white font-medium">
                      {formatDate(competition.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Type</p>
                    <p className="text-white font-medium">
                      {competition.type === 'XP_GAIN' ? 'Skilling' : 'PvM'}
                    </p>
                  </div>
                </div>
                {competition.type === 'XP_GAIN' && competition.skill && (
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-400">Skill</p>
                      <p className="text-white font-medium capitalize">
                        {competition.skill}
                      </p>
                    </div>
                  </div>
                )}
                {competition.type === 'BOSS_KILLS' && competition.boardSize && (
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-400">Grid Size</p>
                      <p className="text-white font-medium">
                        {competition.boardSize}x{competition.boardSize}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Participants</p>
                    <p className="text-white font-medium">
                      {totalParticipants}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Competition Rewards - 3 profile-card-style columns without wrapper */}
        {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 1st Place - Gold Card */}
            {competition.rewardFirstGp && (
              <div 
                className="fantasy-section overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: 0
                }}
              >
                {/* Winner Header Section */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-center">
                    <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-yellow-500/50">
                      {leaderboardData.find(p => p.rank === 1) ? (
                        <AvatarImage
                          src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(leaderboardData.find(p => p.rank === 1)!.username.replace(/\u00A0/g, ' '))}/chat.png`}
                          alt={leaderboardData.find(p => p.rank === 1)!.username}
                        />
                      ) : null}
                      <AvatarFallback className="bg-yellow-600/30 text-yellow-400">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center mt-3">
                    {leaderboardData.find(p => p.rank === 1) ? (
                      <Link 
                        to={`/clan-member/${usernameToUrl(leaderboardData.find(p => p.rank === 1)!.username)}`}
                        className="text-lg font-semibold hover:text-yellow-400 transition-colors"
                      >
                        {leaderboardData.find(p => p.rank === 1)!.username}
                      </Link>
                    ) : (
                      <div className="text-slate-400 italic">TBD</div>
                    )}
                  </div>
                </div>
                {/* Rewards Section */}
                <div className="p-4">
                  <div className="text-center mb-3">
                    <div className="text-3xl mb-1">🥇</div>
                    <div className="text-sm text-yellow-400 font-semibold">1st Place</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{(competition.rewardFirstGp / 1000000).toFixed(0)}M GP</div>
                    {competition.rewardBadge && (
                      <div className="mt-3 flex items-center justify-center">
                        <div
                          className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white"
                          style={{
                            background: competition.rewardBadge.gradientColors 
                              ? `linear-gradient(135deg, ${competition.rewardBadge.gradientColors[0]}, ${competition.rewardBadge.gradientColors[1]})`
                              : competition.rewardBadge.backgroundColor || '#6b7280'
                          }}
                        >
                          <img 
                            src={competition.rewardBadge.imageUrl}
                            alt={competition.rewardBadge.name}
                            className="w-4 h-4"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <span>{competition.rewardBadge.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place - Silver Card */}
            {competition.rewardSecondGp && (
              <div 
                className="fantasy-section overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                  border: '1px solid rgba(192, 192, 192, 0.3)',
                  borderRadius: 0
                }}
              >
                {/* Winner Header Section */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-center">
                    <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-gray-400/50">
                      {leaderboardData.find(p => p.rank === 2) ? (
                        <AvatarImage
                          src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(leaderboardData.find(p => p.rank === 2)!.username.replace(/\u00A0/g, ' '))}/chat.png`}
                          alt={leaderboardData.find(p => p.rank === 2)!.username}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gray-500/30 text-gray-300">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center mt-3">
                    {leaderboardData.find(p => p.rank === 2) ? (
                      <Link 
                        to={`/clan-member/${usernameToUrl(leaderboardData.find(p => p.rank === 2)!.username)}`}
                        className="text-lg font-semibold hover:text-gray-300 transition-colors"
                      >
                        {leaderboardData.find(p => p.rank === 2)!.username}
                      </Link>
                    ) : (
                      <div className="text-slate-400 italic">TBD</div>
                    )}
                  </div>
                </div>
                {/* Rewards Section */}
                <div className="p-4">
                  <div className="text-center mb-3">
                    <div className="text-3xl mb-1">🥈</div>
                    <div className="text-sm text-gray-300 font-semibold">2nd Place</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{(competition.rewardSecondGp / 1000000).toFixed(0)}M GP</div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place - Bronze Card */}
            {competition.rewardThirdGp && (
              <div 
                className="fantasy-section overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                  border: '1px solid rgba(205, 127, 50, 0.3)',
                  borderRadius: 0
                }}
              >
                {/* Winner Header Section */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-center">
                    <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-amber-600/50">
                      {leaderboardData.find(p => p.rank === 3) ? (
                        <AvatarImage
                          src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(leaderboardData.find(p => p.rank === 3)!.username.replace(/\u00A0/g, ' '))}/chat.png`}
                          alt={leaderboardData.find(p => p.rank === 3)!.username}
                        />
                      ) : null}
                      <AvatarFallback className="bg-amber-600/30 text-amber-400">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center mt-3">
                    {leaderboardData.find(p => p.rank === 3) ? (
                      <Link 
                        to={`/clan-member/${usernameToUrl(leaderboardData.find(p => p.rank === 3)!.username)}`}
                        className="text-lg font-semibold hover:text-amber-400 transition-colors"
                      >
                        {leaderboardData.find(p => p.rank === 3)!.username}
                      </Link>
                    ) : (
                      <div className="text-slate-400 italic">TBD</div>
                    )}
                  </div>
                </div>
                {/* Rewards Section */}
                <div className="p-4">
                  <div className="text-center mb-3">
                    <div className="text-3xl mb-1">🥉</div>
                    <div className="text-sm text-amber-400 font-semibold">3rd Place</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{(competition.rewardThirdGp / 1000000).toFixed(0)}M GP</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {competition.type === 'XP_GAIN' && top10Data.length > 0 && (
          <div className="fantasy-section mb-6">
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={top10Data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  tickCount={10}
                  interval={0}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(0, 0, 0, 0.13)',
                    border: '1px solid rgb(54, 57, 73)',
                    borderRadius: '14px',
                    padding: '15px 10px',
                    backdropFilter: 'blur(10px)',
                    fontSize: '13px'
                  }}
                  labelStyle={{ 
                    color: 'rgb(153, 153, 153)',
                    fontSize: '13px',
                    fontWeight: '500',
                    marginBottom: '5px'
                  }}
                  itemStyle={{
                    color: 'rgb(153, 153, 153)',
                    fontSize: '13px'
                  }}
                  formatter={(value: any) => [formatNumber(value), 'XP Gained']}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Bar dataKey="xp_gain" radius={[8, 8, 0, 0]}>
                  {top10Data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {competition.type === 'BOSS_KILLS' && competition.dropsGrid && competition.boardSize && (
          <div className="fantasy-section mb-6">
            <h3 className="text-white flex items-center space-x-2 text-xl font-bold mb-4">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span>Competition Board ({competition.boardSize}x{competition.boardSize})</span>
            </h3>
            <BingoBoard 
              competitionId={competition.id}
              gridSize={competition.boardSize}
              dropsGrid={competition.dropsGrid}
              completedPositions={firstPlaceData?.completed_positions || []}
            />
          </div>
        )}

        <div className="fantasy-section">
          <div className="mb-4">
            <h3 className="text-white text-xl font-bold text-center" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>
              Leaderboard
            </h3>
            <div className="fantasy-divider" style={{ margin: '1rem 0' }}></div>
          </div>
          {competition.type === 'XP_GAIN' ? (
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Player</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Starting XP</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Ending XP</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">XP Gained</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((player) => {
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
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center space-x-2">
                          <Link 
                            to={`/clan-member/${usernameToUrl(player.username)}`}
                            className="font-medium hover:text-theme-accent-light transition-colors"
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
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-slate-300">
                          {player.starting_xp !== undefined ? formatFullNumber(player.starting_xp) : '—'} XP
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-slate-300">
                          {player.ending_xp !== undefined ? formatFullNumber(player.ending_xp) : '—'} XP
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-green-400 font-bold">
                          {formatFullNumber(player.xp_gain || 0)} XP
                        </span>
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
                  className={`flex items-center justify-between p-4 transition-colors ${
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

          {totalParticipants > 0 && (
            <div className="flex items-center justify-center px-4 py-3 mt-4 bg-slate-800/50 border border-slate-700">
              <div className="text-sm text-slate-400">
                Showing all {totalParticipants} participants
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

    </>
  )
}

export default CompetitionDetail
