import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Trophy, Calendar, Users, BarChart3, ChevronDown, ChevronUp, Link2, Palette, Award, LogOut, Key, User } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { getSkillIcon } from '../utils/skillIcons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { checkPlayerMilestones } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import { themes } from '../config/themes'
import AnimatedHeader from '../components/AnimatedHeader'
import RibbonNav from '../components/RibbonNav'
import '../styles/fantasy-container.css'

interface Competition {
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
  participants: string[]
  participantCount?: number
  rewardFirstGp?: number
  rewardSecondGp?: number
  rewardThirdGp?: number
  rewardBadgeId?: string
}

interface CompetitionsData {
  competitions: Competition[]
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

const getCompetitionTypeLabel = (type: string): string => {
  if (type === 'XP_GAIN') return 'Skilling'
  if (type === 'BOSS_KILLS') return 'PvM'
  return type
}

const Competitions = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme: selectedTheme, setTheme: handleThemeChange } = useTheme()
  const [competitionsData, setCompetitionsData] = useState<CompetitionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active')

  // Profile card state (matching homepage/Members)
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

  // Profile data fetching (matching homepage/Members)
  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.username && user?.isLinked) {
        setProfileLoading(true)
        try {
          await Promise.all([
            fetchPlayerStats(),
            fetchQuestData()
          ])
        } finally {
          setProfileLoading(false)
        }
      } else if (user) {
        setProfileError(user.requiresLinking ? 'Please link your RuneScape account' : 'Account not linked to clan member')
      }
    }
    loadProfileData()
  }, [user?.username, user?.isLinked])

  // Fetch settings data when dialog opens
  useEffect(() => {
    if (settingsSection !== null) {
      fetchAccountLinkRequests()
      fetchLinkedAccounts()
      fetchEligibleBadges()
    }
  }, [settingsSection])

  useEffect(() => {
    fetchCompetitions()
  }, [activeTab])

  const fetchPlayerStats = async () => {
    if (!user?.username) return
    try {
      setProfileError(null)
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/stats`)
      if (response.ok) {
        const data = await response.json()
        setPlayerData(data)
        setProfileError(null)
      } else {
        setProfileError('Failed to load profile data')
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setProfileError('Failed to load profile data')
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
      const response = await fetch(`${API_URL}/api/account-link-requests/my-requests`, {
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
        fetch(`${API_URL}/api/account-link-requests/linked-members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/account-link-requests/my-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (membersResponse.ok && requestsResponse.ok) {
        const membersData = await membersResponse.json()
        const requestsData = await requestsResponse.json()
        
        const approvedRequests = (requestsData.requests || []).filter((r: any) => r.status === 'approved')
        const allLinkedAccounts = [
          ...membersData.linked_members.map((m: any) => ({ username: m.username, isPrimary: m.is_primary })),
          ...approvedRequests.map((r: any) => ({ username: r.requested_username, isPrimary: false }))
        ]
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
      const response = await fetch(`${API_URL}/api/account-link-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requested_username: newUsername.trim() })
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
      const response = await fetch(`${API_URL}/api/account-link-requests/${requestId}`, {
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
      const response = await fetch(`${API_URL}/api/account-link-requests/switch-account`, {
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

  const handleBadgeSelection = async (badgeId: string | null) => {
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

  const fetchCompetitions = async () => {
    try {
      setLoading(true)
      const statusParam = activeTab ? `?status=${activeTab}` : ''
      const response = await fetch(`${API_URL}/api/competitions${statusParam}`)
      if (response.ok) {
        const data = await response.json()
        setCompetitionsData(data)
      }
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-[#60a5fa]' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const datePart = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
    const timePart = date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    })
    return { datePart, timePart }
  }

  const competitions = competitionsData?.competitions || []

  if (loading) {
    return (
      <>
        <AnimatedHeader />
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading competitions...</div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Static Header - STORMLIGHT banner with theme-adaptive text glow */}
      <AnimatedHeader />

      {/* Profile Header Section - Gold Ribbon + Profile Panel (matching homepage/Members) */}
      {user?.username && user?.isLinked && (profileError ? (
        <section className="profile-header-section">
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          {/* Gold Ribbon with error state */}
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Profile Error</h1>
              </div>
            </div>
          </div>
          {/* Profile Panel */}
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
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          {/* Gold Ribbon with loading state */}
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <div className="w-32 h-6 bg-white/20 rounded animate-pulse mx-auto"></div>
              </div>
            </div>
          </div>
          {/* Profile Panel skeleton */}
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
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          
          {/* Gold Ribbon with username - clickable to toggle collapse */}
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

          {/* Profile Panel - collapsible with smooth animation */}
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
                {/* Three column layout - equal widths */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Left Column: Avatar with rank badge */}
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

                  {/* Middle Column: Action Buttons (Link Account, Badges, View My Profile) */}
                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('account')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Link2 className="w-5 h-5" />
                      <span>Link Account</span>
                    </Button>

                    <Button
                      onClick={() => setSettingsSection('badges')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Award className="w-5 h-5" />
                      <span>Badges</span>
                    </Button>

                    <Button
                      onClick={() => navigate(`/clan-member/${usernameToUrl(user.username)}`)}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <User className="w-5 h-5" />
                      <span>View My Profile</span>
                    </Button>
                  </div>

                  {/* Right Column: Change Theme, Admin Panel (admins only), Log Out */}
                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('appearance')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Palette className="w-5 h-5" />
                      <span>Change Theme</span>
                    </Button>

                    {/* Admin Panel - only visible for admins */}
                    {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                      <Button
                        onClick={() => navigate('/admin')}
                        className="profile-button w-full justify-start gap-3"
                      >
                        <Key className="w-5 h-5" />
                        <span>Admin Panel</span>
                      </Button>
                    )}

                    <Button
                      onClick={logout}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Log Out</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
        </section>
      ))}

      {/* Main Content Container */}
      <div className="fantasy-container">
        {/* Competitions Banner Header - magenta theme */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--competitions">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Competitions</h1>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="fantasy-content">
          {/* Tab Buttons - NOT in fantasy-section */}
          <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg justify-center mb-6">
            <Button
              onClick={() => setActiveTab('active')}
              variant="default"
              className={activeTab === 'active' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Active
            </Button>
            <Button
              onClick={() => setActiveTab('upcoming')}
              variant="default"
              className={activeTab === 'upcoming' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Upcoming
            </Button>
            <Button
              onClick={() => setActiveTab('ended')}
              variant="default"
              className={activeTab === 'ended' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Users className="w-4 h-4 mr-2" />
              Completed
            </Button>
          </div>

          {/* Competition Entries - Each wrapped in fantasy-section */}
          {competitions.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-6">
                {competitions.map((competition) => {
                  const { status, color } = getCompetitionStatus(competition.startDate, competition.endDate)
                  
                  return (
                    <div key={competition.id} className="fantasy-section">
                      {/* Fantasy Header Plate - Blue for skilling, Green for PvM */}
                      <div className={`competition-header-plate ${competition.type === 'BOSS_KILLS' ? 'competition-header-plate--pvm' : ''}`}>
                        <div className="competition-header-plate-content">
                          <div className="competition-header-plate-title">
                            <span>{competition.name}</span>
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
                          <Badge className={`${color} text-white capitalize pointer-events-none`}>
                            {status}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Description - below header plate */}
                      {competition.description && (
                        <p className="text-slate-400 mb-4 text-sm">
                          {competition.description}
                        </p>
                      )}
                      
                      {/* Content section */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">Start Date</p>
                              <p className="text-white font-medium">
                                {formatDate(competition.startDate).datePart}
                              </p>
                              <p className="text-white font-medium text-sm">
                                {formatDate(competition.startDate).timePart}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">End Date</p>
                              <p className="text-white font-medium">
                                {formatDate(competition.endDate).datePart}
                              </p>
                              <p className="text-white font-medium text-sm">
                                {formatDate(competition.endDate).timePart}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">Type</p>
                              <p className="text-white font-medium">
                                {getCompetitionTypeLabel(competition.type)}
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
                                {competition.participantCount || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                            <div className="flex space-x-3">
                              {competition.rewardFirstGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-yellow-400 text-base">🥇</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardFirstGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                              {competition.rewardSecondGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-gray-300 text-base">🥈</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardSecondGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                              {competition.rewardThirdGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-amber-400 text-base">🥉</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardThirdGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button asChild variant="default" className="bg-theme-button hover:bg-theme-button-hover">
                              <Link to={`/competitions/${competition.id}`}>
                                View Leaderboard
                              </Link>
                            </Button>
                          </div>
                        )}
                        {!(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                          <div className="flex justify-end pt-4 border-t border-slate-700">
                            <Button asChild variant="default" className="bg-theme-button hover:bg-theme-button-hover">
                              <Link to={`/competitions/${competition.id}`}>
                                View Leaderboard
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State - Also wrapped in fantasy-section */}
          {competitions.length === 0 && !loading && (
            <div className="fantasy-section">
              <div className="p-8 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No {activeTab} competitions found
                </h3>
                <p className="text-slate-400">
                  Check back later for new competitions!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialogs (matching homepage/Members) */}
      {/* Account Link Dialog */}
      <Dialog open={settingsSection === 'account'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Account</DialogTitle>
            <DialogDescription>
              Link additional RuneScape accounts to your profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Linked Accounts */}
            {linkedAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Linked Accounts</h4>
                {linkedAccounts.map((account) => (
                  <div key={account.username} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-white">{account.username}</span>
                    {account.isPrimary ? (
                      <Badge className="bg-green-600">Primary</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwitchAccount(account.username)}
                        className="text-xs"
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending Requests */}
            {accountLinkRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Pending Requests</h4>
                {accountLinkRequests.filter(r => r.status === 'pending').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-white">{request.requested_username}</span>
                    <Badge className="bg-yellow-600">Pending</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Rejected Requests */}
            {accountLinkRequests.filter(r => r.status === 'rejected').length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Rejected Requests</h4>
                {accountLinkRequests.filter(r => r.status === 'rejected').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-white">{request.requested_username}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRejectedRequest(request.id)}
                      className="text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* New Request Form */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Request New Link</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="RuneScape username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleSubmitLinkRequest}
                  disabled={linkRequestLoading || !newUsername.trim()}
                  className="bg-theme-button hover:bg-theme-button-hover"
                >
                  {linkRequestLoading ? 'Sending...' : 'Request'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Badges Dialog */}
      <Dialog open={settingsSection === 'badges'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Badge</DialogTitle>
            <DialogDescription>
              Choose a badge to display on your profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* No Badge Option */}
            <div
              className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                selectedBadgeId === null ? 'bg-theme-button' : 'bg-slate-700/30 hover:bg-slate-700/50'
              }`}
              onClick={() => handleBadgeSelection(null)}
            >
              <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center">
                <span className="text-slate-400">-</span>
              </div>
              <span className="text-white">No Badge</span>
            </div>

            {/* Eligible Badges */}
            {eligibleBadges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                  selectedBadgeId === badge.id ? 'bg-theme-button' : 'bg-slate-700/30 hover:bg-slate-700/50'
                }`}
                onClick={() => handleBadgeSelection(badge.id)}
              >
                <img src={badge.imageUrl} alt={badge.name} className="w-8 h-8" />
                <div>
                  <p className="text-white font-medium">{badge.name}</p>
                  {badge.description && (
                    <p className="text-sm text-slate-400">{badge.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={settingsSection === 'appearance'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Theme</DialogTitle>
            <DialogDescription>
              Select a theme for the website
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.values(themes).map((theme) => (
              <div key={theme.id} className="relative">
                <button
                  onClick={() => handleThemeChange(theme.id)}
                  onMouseEnter={() => setThemeTooltip(theme.name)}
                  onMouseLeave={() => setThemeTooltip(null)}
                  className={`w-12 h-12 rounded-full transition-all ${
                    selectedTheme === theme.id 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ background: theme.gradient }}
                  title={theme.name}
                />
                {themeTooltip === theme.name && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-50">
                    {theme.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Competitions
