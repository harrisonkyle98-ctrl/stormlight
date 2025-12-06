import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { ArrowLeft, Trophy, Calendar, Users, BarChart3, Radio, ChevronDown, ChevronUp, Link2, Palette, Award, LogOut, Key, User } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { getSkillIcon } from '../utils/skillIcons'
import { fetchClanMembers, checkPlayerMilestones } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BingoBoard } from '../components/BingoBoard'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { themes } from '../config/themes'
import AnimatedHeader from '../components/AnimatedHeader'
import RibbonNav from '../components/RibbonNav'
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
}

interface CustomBadge {
  id: string
  name: string
  description?: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
  allowUsernameColorOverride?: boolean
}

interface PlayerStats {
  badges?: Array<{ id: string; name: string; imageUrl: string; type: string }>
  custom_badges?: CustomBadge[]
  username: string
  clan_xp?: number
  clan_rank_number?: number
  runescore?: number
  stats: {
    overall: {
      rank: number | null
      level: number
      xp: number
      combatlevel: number
    }
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
    }
  }
  quest_points?: number
  last_updated: string
  clan_rank?: string
  is_verified?: boolean
  join_date?: string
}

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme: selectedTheme, setTheme: handleThemeChange } = useTheme()
  const [competition, setCompetition] = useState<CompetitionDetailData | null>(null)
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Profile card state (matching homepage/Members/Competitions)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profileAnimReady, setProfileAnimReady] = useState(false)
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [questData, setQuestData] = useState<any>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'account' | 'badges' | 'appearance' | null>(null)
  const [eligibleBadges, setEligibleBadges] = useState<CustomBadge[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [accountLinkRequests, setAccountLinkRequests] = useState<any[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [linkRequestLoading, setLinkRequestLoading] = useState(false)
  const [themeTooltip, setThemeTooltip] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Enable animation after initial render to prevent flicker
  useEffect(() => {
    const timer = setTimeout(() => setProfileAnimReady(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Profile data fetching (matching homepage/Members/Competitions)
  useEffect(() => {
    if (user?.username && user?.isLinked) {
      loadProfileData()
    }
  }, [user?.username, user?.isLinked])

  const loadProfileData = async () => {
    if (!user?.username) return
    setProfileLoading(true)
    setProfileError(null)
    try {
      await Promise.all([
        fetchPlayerStats(),
        fetchQuestData(),
        fetchAccountLinkRequests(),
        fetchLinkedAccounts(),
        fetchEligibleBadges()
      ])
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  const fetchPlayerStats = async () => {
    if (!user?.username) return
    try {
      const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(user.username)}/stats`)
      if (response.ok) {
        const data = await response.json()
        setPlayerData(data)
        if (data.custom_badges && data.custom_badges.length > 0) {
          const activeBadge = data.custom_badges.find((b: CustomBadge) => b.id === data.selected_badge_id)
          if (activeBadge) {
            setSelectedBadgeId(activeBadge.id)
          }
        }
      } else {
        setProfileError('Failed to load player stats')
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setProfileError('Failed to load player stats')
    }
  }

  const fetchQuestData = async () => {
    if (!user?.username) return
    try {
      const response = await fetch(`${API_URL}/api/player/${encodeURIComponent(user.username)}/quests`)
      if (response.ok) {
        const data = await response.json()
        setQuestData(data)
      }
    } catch (error) {
      console.error('Error fetching quest data:', error)
    }
  }

  const fetchAccountLinkRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/account-link/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAccountLinkRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching account link requests:', error)
    }
  }

  const fetchLinkedAccounts = async () => {
    try {
      const token = localStorage.getItem('token')
      const [membersResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/api/members`),
        fetch(`${API_URL}/api/account-link/requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (membersResponse.ok && requestsResponse.ok) {
        const membersData = await membersResponse.json()
        
        const allLinkedAccounts = membersData.members?.filter((member: any) => 
          member.discord_id === user?.discordId
        ) || []
        setLinkedAccounts(allLinkedAccounts)
      }
    } catch (error) {
      console.error('Error fetching linked accounts:', error)
    }
  }

  const handleSubmitLinkRequest = async () => {
    if (!newUsername.trim()) return
    setLinkRequestLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/account-link/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername.trim() })
      })
      if (response.ok) {
        setNewUsername('')
        fetchAccountLinkRequests()
        fetchLinkedAccounts()
      }
    } catch (error) {
      console.error('Error submitting link request:', error)
    } finally {
      setLinkRequestLoading(false)
    }
  }

  const handleDeleteRejectedRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/account-link/request/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        fetchAccountLinkRequests()
      }
    } catch (error) {
      console.error('Error deleting request:', error)
    }
  }

  const handleSwitchAccount = async (username: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/account-link/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error switching account:', error)
    }
  }

  const fetchEligibleBadges = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/badges/eligible`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEligibleBadges(data.badges || [])
      }
    } catch (error) {
      console.error('Error fetching eligible badges:', error)
    }
  }

  const handleBadgeSelection = async (badgeId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/badges/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ badge_id: badgeId })
      })
      if (response.ok) {
        setSelectedBadgeId(badgeId)
        fetchPlayerStats()
      }
    } catch (error) {
      console.error('Error selecting badge:', error)
    }
  }

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
        }
        
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
      const now = new Date()
      const start = new Date(competition.startDate)
      const end = new Date(competition.endDate)
      const isActive = now >= start && now <= end
      
      const endpoint = isActive 
        ? `${API_URL}/api/competitions/${id}/live?page=${currentPage}&per_page=25`
        : `${API_URL}/api/competitions/${id}?page=${currentPage}&per_page=25`
      
      const response = await fetch(endpoint)
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
        }
        
        if (data.pagination) {
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.total_pages)
          setTotalParticipants(data.pagination.total)
        }
        
        if (data.last_updated) {
          setLastUpdated(data.last_updated)
        } else {
          setLastUpdated(new Date().toISOString())
        }
      }
    } catch (error) {
      console.error('Error fetching live competition data:', error)
    }
  }

  const fetchLeaderboardPage = async (page: number) => {
    try {
      setPaginationLoading(true)
      
      const now = new Date()
      const start = new Date(competition?.startDate || '')
      const end = new Date(competition?.endDate || '')
      const isActive = competition?.type === 'XP_GAIN' && now >= start && now <= end
      
      const endpoint = isActive
        ? `${API_URL}/api/competitions/${id}/live?page=${page}&per_page=25`
        : `${API_URL}/api/competitions/${id}?page=${page}&per_page=25`
      
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setLeaderboardData(data.leaderboard || [])
        
        if (data.pagination) {
          setCurrentPage(data.pagination.page)
          setTotalPages(data.pagination.total_pages)
          setTotalParticipants(data.pagination.total)
        }
        
        if (data.last_updated) {
          setLastUpdated(data.last_updated)
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


  if (loading) {
    return (
      <>
        <AnimatedHeader />
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
        <AnimatedHeader />
        {user?.username && user?.isLinked && playerData && (
          <section className="profile-header-section">
            <RibbonNav />
            <div 
              className="gold-banner-wrapper cursor-pointer"
              onClick={() => setProfileExpanded(prev => !prev)}
              role="button"
              aria-expanded={profileExpanded}
            >
              <div className="fantasy-banner fantasy-banner--gold">
                <div className="fantasy-banner-inner relative flex items-center justify-center pr-14">
                  <h1 className="fantasy-banner-title">{user.username}</h1>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                    {profileExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white/80" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/80" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        
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
      <AnimatedHeader />

      {user?.username && user?.isLinked && (profileError ? (
        <section className="profile-header-section">
          <RibbonNav />
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Profile Error</h1>
              </div>
            </div>
          </div>
          <div className="profile-header-panel">
            <div className="profile-header-panel-content">
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">{profileError}</p>
                {!user?.requiresLinking && (
                  <Button
                    onClick={fetchPlayerStats}
                    className="profile-button"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : profileLoading || !playerData ? (
        <section className="profile-header-section">
          <RibbonNav />
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <div className="w-32 h-6 bg-white/20 rounded animate-pulse mx-auto"></div>
              </div>
            </div>
          </div>
          <div className="profile-header-panel">
            <div className="profile-header-panel-content">
              <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
                <div className="lg:w-[30%] flex-shrink-0">
                  <div className="rounded-lg p-6 bg-slate-700/30">
                    <div className="w-20 h-20 bg-slate-600/50 rounded-full mx-auto mb-4"></div>
                    <div className="w-24 h-5 bg-slate-600/50 rounded mx-auto"></div>
                  </div>
                </div>
                <div className="flex-1 lg:max-w-[40%] space-y-2">
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                </div>
                <div className="flex-1 lg:max-w-[30%]">
                  <div className="h-32 bg-slate-700/30 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : playerData && (
        <section className="profile-header-section">
          <RibbonNav />
          
          <div 
            className="gold-banner-wrapper cursor-pointer"
            onClick={() => setProfileExpanded(prev => !prev)}
            role="button"
            aria-expanded={profileExpanded}
          >
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner relative flex items-center justify-center pr-14">
                <h1 className="fantasy-banner-title">{user.username}</h1>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                  {profileExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/80" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/80" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`profile-header-panel ${
              profileAnimReady ? 'profile-header-panel-anim ' : ''
            }${
              profileExpanded 
                ? 'profile-header-panel-anim--expanded' 
                : 'profile-header-panel-anim--collapsed'
            }`}
            aria-hidden={!profileExpanded}
          >
            <div className="profile-header-panel-content">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="lg:flex-1 flex flex-col">
                    <div className="profile-avatar-section rounded-lg p-4">
                      <div className="flex flex-col items-center space-y-2">
                        <Avatar className="w-20 h-20">
                          <AvatarImage
                            src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username)}/chat.png`}
                            alt={user.username}
                          />
                          <AvatarFallback className="bg-theme-button text-white">
                            <User className="w-10 h-10" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-center">
                            <Link
                              to={`/clan-member/${usernameToUrl(user.username)}`}
                              className="hover:opacity-80 transition-opacity"
                            >
                              <Username
                                username={user.username}
                                clanRank={playerData.clan_rank}
                              />
                            </Link>
                          </h1>

                          {playerData.stats && (() => {
                            const allBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, user.username)
                            const rankBadge = allBadges.find(badge => badge.id.startsWith('rank-'))
                            return rankBadge ? (
                              <div className="mt-1">
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
                    </div>
                  </div>

                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('account')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Link2 className="w-4 h-4" />
                      <span>Link Account</span>
                    </Button>
                    <Button
                      onClick={() => setSettingsSection('badges')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Award className="w-4 h-4" />
                      <span>Badges</span>
                    </Button>
                    <Button
                      asChild
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Link to={`/clan-member/${usernameToUrl(user.username)}`}>
                        <User className="w-4 h-4" />
                        <span>View My Profile</span>
                      </Link>
                    </Button>
                  </div>

                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('appearance')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Palette className="w-4 h-4" />
                      <span>Change Theme</span>
                    </Button>
                    <Button
                      onClick={() => {
                        logout()
                        navigate('/')
                      }}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
            </div>
          </div>
        </section>
      ))}

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
          <div className="competition-entry mb-6">
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

        {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
          <div className="fantasy-section mb-6">
            <h3 className="text-white flex items-center space-x-2 text-xl font-bold mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Competition Rewards</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competition.rewardFirstGp && (
                <div className="p-4 bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30">
                  <div className="text-2xl mb-2">🥇</div>
                  <div className="text-sm text-slate-400">1st Place</div>
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardFirstGp / 1000000).toFixed(0)}M GP</div>
                  {competition.rewardBadgeId && <div className="text-xs text-green-400 mt-1">+ Competition Badge</div>}
                </div>
              )}
              {competition.rewardSecondGp && (
                <div className="p-4 bg-gradient-to-br from-gray-400/20 to-gray-600/20 border border-gray-400/30">
                  <div className="text-2xl mb-2">🥈</div>
                  <div className="text-sm text-slate-400">2nd Place</div>
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardSecondGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
              {competition.rewardThirdGp && (
                <div className="p-4 bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-600/30">
                  <div className="text-2xl mb-2">🥉</div>
                  <div className="text-sm text-slate-400">3rd Place</div>
                  <div className="text-2xl font-bold text-green-400">{(competition.rewardThirdGp / 1000000).toFixed(0)}M GP</div>
                </div>
              )}
            </div>
          </div>
        )}

        {competition.type === 'XP_GAIN' && top10Data.length > 0 && (
          <div className="fantasy-section mb-6">
            {isLive && lastUpdated && (
              <div className="flex justify-end mb-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center space-x-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live - {getTimeSinceUpdate()}</span>
                </Badge>
              </div>
            )}
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
            {isLive && lastUpdated && competition.type === 'XP_GAIN' && (
              <div className="flex justify-center">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center space-x-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live - {getTimeSinceUpdate()}</span>
                </Badge>
              </div>
            )}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 mt-4 bg-slate-800/50 border border-slate-700">
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
        </div>
        </div>
      </div>

      <Dialog open={settingsSection === 'account'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Account</DialogTitle>
            <DialogDescription>
              Link additional RuneScape accounts to your Discord profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter RuneScape username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Button
                onClick={handleSubmitLinkRequest}
                disabled={linkRequestLoading || !newUsername.trim()}
                className="bg-theme-button hover:bg-theme-button-hover"
              >
                {linkRequestLoading ? 'Submitting...' : 'Request'}
              </Button>
            </div>
            
            {accountLinkRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Pending Requests</h4>
                {accountLinkRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                    <span className="text-white">{request.username}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }>
                        {request.status}
                      </Badge>
                      {request.status === 'rejected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRejectedRequest(request.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {linkedAccounts.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Switch Account</h4>
                {linkedAccounts.filter(acc => acc.username !== user?.username).map((account) => (
                  <Button
                    key={account.username}
                    onClick={() => handleSwitchAccount(account.username)}
                    className="w-full justify-start bg-slate-700/50 hover:bg-slate-700"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {account.username}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsSection === 'badges'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Badge</DialogTitle>
            <DialogDescription>
              Choose a badge to display on your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {eligibleBadges.map((badge) => (
              <Button
                key={badge.id}
                onClick={() => handleBadgeSelection(badge.id)}
                className={`flex items-center gap-2 p-3 h-auto ${
                  selectedBadgeId === badge.id 
                    ? 'bg-theme-accent ring-2 ring-theme-accent-light' 
                    : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
              >
                <img src={badge.imageUrl} alt={badge.name} className="w-6 h-6" />
                <span className="text-sm">{badge.name}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsSection === 'appearance'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Theme</DialogTitle>
            <DialogDescription>
              Select a color theme for the site.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(themes).map(([key, theme]) => (
              <Button
                key={key}
                onClick={() => handleThemeChange(key)}
                onMouseEnter={() => setThemeTooltip(theme.name)}
                onMouseLeave={() => setThemeTooltip(null)}
                className={`relative h-16 ${
                  selectedTheme === key 
                    ? 'ring-2 ring-white' 
                    : ''
                }`}
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentDark} 100%)`
                }}
              >
                {themeTooltip === theme.name && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                    {theme.name}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CompetitionDetail
