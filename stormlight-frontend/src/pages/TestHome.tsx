import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Trophy, TrendingUp, Calendar, Activity, Home, User, Award, LogOut, Key } from 'lucide-react'
import '../styles/fantasy-container.css'
import '../styles/test-immersive.css'
import { fetchClanMembers } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { usernameToUrl } from '../utils/urlUtils'
import { ParchmentClanLogRow } from '../components/clanLogs/ParchmentClanLogRow'
import { ParchmentActivityLogRow } from '../components/activityLogs/ParchmentActivityLogRow'
import { Username } from '../components/ui/username'
import { usePageTitle } from '../hooks/usePageTitle'
import DailyscapeCard from '../components/dailyscape/DailyscapeCard'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'

const getRankIcon= (rank: string): string => {
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
  return imageName ? `/assets/ranks/${imageName}` : ''
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
  clue_scrolls?: {
    easy?: number
    medium?: number
    hard?: number
    elite?: number
    master?: number
  }
  league_points?: number
  league_rank?: number
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

interface ClanStats {
  members: string[]
  clan_name: string
  total_xp: number
  clan_rank: string
  total_members: number
}

interface Activity {
  username: string
  text: string
  details: string
  date: string
  timestamp: number
}

interface ClanLogEntry {
  id: number
  username: string
  event_type: string
  old_rank?: string
  new_rank?: string
  timestamp: string
}

interface ClanLogResponse {
  log_entries: ClanLogEntry[]
  pagination: {
    page: number
    limit: number
    total_entries: number
    has_next: boolean
  }
}

interface ActivityResponse {
  activities: Activity[]
  pagination: {
    page: number
    limit: number
    total_activities: number
    has_next: boolean
  }
  loading_status?: {
    is_complete: boolean
    processed_members: number
    total_members: number
  }
}


const TestHome = () => {
  usePageTitle('Test - Immersive UI')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [clanStats, setClanStats] = useState<ClanStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [clanMembers, setClanMembers] = useState<any[]>([])
  const [clanLogEntries, setClanLogEntries] = useState<ClanLogEntry[]>([])
  const [clanLogLoading, setClanLogLoading] = useState(true)
  const [activeCompetitionsCount, setActiveCompetitionsCount] = useState<number>(0)
  const [activeMembers, setActiveMembers] = useState<any>(null)
  const [activeMembersLoading, setActiveMembersLoading] = useState(false)
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const loadAllData = async () => {
      const promises = [
        fetchClanStats(),
        fetchActivities(),
        fetchClanLog(),
        loadClanMembers(),
        fetchActiveCompetitions()
      ]

      await Promise.all(promises)
    }

    loadAllData()

    const statsInterval = setInterval(() => {
      fetchClanStats()
    }, 60 * 60 * 1000)

    return () => {
      clearInterval(statsInterval)
    }
  }, [])

  useEffect(() => {
    fetchActiveMembers()
  }, [])

  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.username && user?.isLinked) {
        await fetchPlayerStats()
      }
    }
    loadProfileData()
  }, [user?.username, user?.isLinked])

  const fetchPlayerStats = async () => {
    if (!user?.username) return
    try {
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/stats`)
      if (response.ok) {
        const data = await response.json()
        setPlayerData(data)
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
    }
  }

  const calculateDaysInClan= () => {
    if (!playerData?.join_date) return null
    const datePart = playerData.join_date.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    const joinDate = new Date(year, month - 1, day, 12, 0, 0)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - joinDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const loadClanMembers= async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
  }

  const fetchClanStats= async () => {
    try {
      const response = await fetch(`${API_URL}/api/clan/stats`)
      if (response.ok) {
        const data = await response.json()
        setClanStats(data)
      }
    } catch (error) {
      console.error('Error fetching clan stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivities = async (page: number = 1, append: boolean = false) => {
    try {
      setActivityLoading(true)
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/clan/activities?page=${page}&limit=10&_t=${cacheBuster}`
      const response = await fetch(requestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data: ActivityResponse = await response.json()
        if (append) {
          setActivities(prev => [...prev, ...data.activities])
        } else {
          setActivities(prev => {
            const combined = [...data.activities, ...prev]
            const seen = new Set()
            const unique = combined.filter(activity => {
              const key = `${activity.username}-${activity.text}-${activity.timestamp}`
              if (seen.has(key)) {
                return false
              }
              seen.add(key)
              return true
            })
            return unique.sort((a, b) => b.timestamp - a.timestamp)
          })
        }

        if (data.loading_status && !data.loading_status.is_complete) {
          setTimeout(() => {
            fetchActivities(page, false)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) {
      return "Unknown time"
    }

    const now = Date.now() / 1000
    const timestampInSeconds = timestamp > 1000000000000 ? timestamp / 1000 : timestamp
    const diff = now - timestampInSeconds

    if (diff < 0) {
      return "Just now"
    }

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
    return `${Math.floor(diff / 604800)} weeks ago`
  }

  const fetchClanLog = async () => {
    try {
      setClanLogLoading(true)
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/clan/log?page=1&limit=50&_t=${cacheBuster}`
      const response = await fetch(requestUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data: ClanLogResponse = await response.json()

        const seen = new Set<string>()
        const deduped = data.log_entries.filter((e) => {
          const d = new Date(e.timestamp)
          d.setSeconds(0, 0)
          const key = `${e.username}|${e.event_type}|${e.old_rank ?? ''}|${e.new_rank ?? ''}|${d.toISOString()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setClanLogEntries(deduped.slice(0, 10))
      }
    } catch (error) {
      console.error('Error fetching clan log:', error)
    } finally {
      setClanLogLoading(false)
    }
  }

  const fetchActiveCompetitions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/competitions?status=active`)
      if (response.ok) {
        const data = await response.json()
        const competitions = data.competitions || []
        setActiveCompetitionsCount(competitions.length)
      }
    } catch (error) {
      console.error('Error fetching competitions:', error)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const fetchActiveMembers= async () => {
    setActiveMembersLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/members/active-today`)
      if (response.ok) {
        const data = await response.json()
        setActiveMembers(data)
      }
    } catch (error) {
      console.error('Error fetching active members:', error)
    } finally {
      setActiveMembersLoading(false)
    }
  }

  return (
    <>
      {/* SVG Mask for parchment torn edges - smooth, anti-aliased vector mask */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          {/* Smooth torn edge mask - vector-based for crisp edges at any resolution */}
          <mask id="parchment-torn-mask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            {/* Base rectangle with subtle organic edge variations */}
            <path 
              fill="white"
              d="M 0.002 0.08
                 C 0.008 0.04, 0.015 0.02, 0.025 0.015
                 C 0.04 0.008, 0.06 0.012, 0.08 0.008
                 C 0.12 0.002, 0.18 0.006, 0.25 0.004
                 C 0.32 0.002, 0.4 0.008, 0.5 0.005
                 C 0.6 0.002, 0.68 0.007, 0.75 0.004
                 C 0.82 0.001, 0.88 0.006, 0.92 0.008
                 C 0.96 0.01, 0.985 0.015, 0.992 0.025
                 C 0.998 0.04, 0.995 0.06, 0.997 0.1
                 C 0.999 0.2, 0.996 0.35, 0.998 0.5
                 C 1.0 0.65, 0.997 0.8, 0.998 0.9
                 C 0.999 0.94, 0.995 0.96, 0.992 0.975
                 C 0.985 0.985, 0.96 0.99, 0.92 0.992
                 C 0.88 0.994, 0.82 0.998, 0.75 0.996
                 C 0.68 0.994, 0.6 0.998, 0.5 0.995
                 C 0.4 0.992, 0.32 0.997, 0.25 0.996
                 C 0.18 0.995, 0.12 0.998, 0.08 0.992
                 C 0.06 0.988, 0.04 0.992, 0.025 0.985
                 C 0.015 0.98, 0.008 0.96, 0.002 0.92
                 C -0.002 0.88, 0.003 0.8, 0.001 0.65
                 C -0.001 0.5, 0.002 0.35, 0.001 0.2
                 C 0.0 0.12, 0.004 0.1, 0.002 0.08
                 Z"
            />
          </mask>
          {/* Fallback filter with anti-aliasing for browsers that don't support mask well */}
          <filter id="parchment-torn-edge-smooth">
            <feTurbulence 
              x="0" 
              y="0" 
              baseFrequency="0.02" 
              numOctaves="3" 
              seed="2"
              result="turbulence"
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="turbulence"
              scale="4"
              result="displaced"
            />
            {/* Add subtle blur for anti-aliasing on edges only */}
            <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred" />
            <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
          </filter>
        </defs>
      </svg>
      
      {/* Test Immersive Wrapper - scopes all immersive styles */}
      {/* NO ribbons on /test - full-width 3-column client-style layout */}
      <div className="test-immersive">
        <div className="fantasy-container test-fullwidth-container">
          {/* Main Content Area - 3-column client layout */}
          <div className="fantasy-content">
            {/* Embedded Navigation - spans full width at top */}
            <div className="fantasy-section test-embedded-nav">
              <nav className="flex items-center justify-center gap-2 flex-wrap">
                <Link to="/" className="test-nav-item">
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link to="/members" className="test-nav-item">
                  <Users className="h-5 w-5" />
                  <span>Members</span>
                </Link>
                <Link to="/competitions" className="test-nav-item">
                  <Trophy className="h-5 w-5" />
                  <span>Competitions</span>
                </Link>
                <Link to="/clan-hiscores" className="test-nav-item">
                  <Award className="h-5 w-5" />
                  <span>Hiscores</span>
                </Link>
              </nav>
            </div>

            {/* Clan Summary - Full Width below navigation */}
            <div className="fantasy-section test-clan-summary-fullwidth">
              <h3 className="fantasy-section-title">Clan Summary</h3>
              <div className="fantasy-grid-4">
                {/* 1. Total Members */}
                <div className="fantasy-stat-item">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="text-sm font-medium text-slate-300">Total Members</span>
                    <Users className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-slate-700/50 rounded w-20"></div>
                        <div className="h-3 bg-slate-700/30 rounded w-32"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-white">
                          {clanStats?.total_members || 0}
                        </div>
                        <p className="text-xs text-slate-400">Friends to play with</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Total Clan XP */}
                <div className="fantasy-stat-item">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="text-sm font-medium text-slate-300">Total Clan XP</span>
                    <TrendingUp className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-slate-700/50 rounded w-24"></div>
                        <div className="h-3 bg-slate-700/30 rounded w-28"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-white">
                          {formatNumber(clanStats?.total_xp || 0)}
                        </div>
                        <p className="text-xs text-slate-400">Combined clan XP</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Time Spent in Clan */}
                {user?.username && user?.isLinked ? (
                  <div className="fantasy-stat-item">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <span className="text-sm font-medium text-slate-300">Time Spent in Clan</span>
                      <Calendar className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
                    </div>
                    <div>
                      {loading || !playerData ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-8 bg-slate-700/50 rounded w-28"></div>
                          <div className="h-3 bg-slate-700/30 rounded w-32"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-white">
                            {calculateDaysInClan() !== null ? `${calculateDaysInClan()} days` : 'N/A'}
                          </div>
                          <p className="text-xs text-slate-400">Days as clan member</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* 4. Competitions */}
                <div className="fantasy-stat-item">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="text-sm font-medium text-slate-300">Competitions</span>
                    <Trophy className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-slate-700/50 rounded w-12"></div>
                        <div className="h-3 bg-slate-700/30 rounded w-36"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-white">
                          {activeCompetitionsCount}
                        </div>
                        <p className="text-xs text-slate-400">Active competitions</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Column Client Layout */}
            <div className="test-three-column-layout">
              {/* ========== LEFT COLUMN - Account Only ========== */}
              <div className="test-column-left">
                {/* Account Panel */}
                {user?.username && user?.isLinked && (
                  <div className="fantasy-section test-account-panel">
                    <h3 className="fantasy-section-title">Account</h3>
                    <div className="flex flex-col items-center gap-3">
                      {/* User Avatar */}
                      <Avatar className="w-16 h-16">
                        <AvatarImage
                          src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username)}/chat.png`}
                          alt={user.username}
                        />
                        <AvatarFallback className="bg-slate-700 text-white">
                          <User className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Username and Rank */}
                      <div className="text-center">
                        <Link
                          to={`/clan-member/${usernameToUrl(user.username)}`}
                          className="text-lg font-semibold text-white hover:text-blue-300 transition-colors"
                        >
                          <Username
                            username={user.username}
                            clanRank={playerData?.clan_rank}
                          />
                        </Link>
                        {playerData?.clan_rank && (
                          <p className="text-xs text-slate-400 mt-1">{playerData.clan_rank}</p>
                        )}
                      </div>
                      {/* Action Buttons - stacked */}
                      <div className="flex flex-col gap-2 w-full mt-2">
                        <Button
                          onClick={() => navigate(`/clan-member/${usernameToUrl(user.username)}`)}
                          className="test-profile-btn w-full"
                          size="sm"
                        >
                          <User className="w-4 h-4 mr-1" />
                          Profile
                        </Button>
                        {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                          <Button
                            onClick={() => navigate('/admin')}
                            className="test-profile-btn w-full"
                            size="sm"
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Admin
                          </Button>
                        )}
                        <Button
                          onClick={logout}
                          className="test-profile-btn w-full"
                          size="sm"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* End left column */}

              {/* ========== CENTER COLUMN - Activity Spine ========== */}
              <div className="test-column-center">
                {/* Dailyscape Panel - with tabs */}
                <DailyscapeCard />

                {/* Clan Log */}
                <div className="fantasy-section">
                  <h3 className="fantasy-section-title">Clan Log</h3>
                  {clanLogLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-2 bg-slate-700/30 rounded-lg">
                          <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-slate-700/40 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {clanLogEntries.length > 0 ? (
                        clanLogEntries.map((entry) => (
                          <ParchmentClanLogRow
                            key={entry.id}
                            entry={entry}
                            formatTimeAgo={formatTimeAgo}
                            getRankIcon={getRankIcon}
                            usernameToUrl={usernameToUrl}
                          />
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No recent clan events</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="fantasy-section">
                  <h3 className="fantasy-section-title">Recent Activity</h3>
                  {activityLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-2 bg-slate-700/30 rounded-lg">
                          <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-slate-700/40 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activities.length > 0 ? (
                        activities.map((activity, index) => (
                          <ParchmentActivityLogRow
                            key={`${activity.username}-${activity.timestamp}-${index}`}
                            activity={activity}
                            formatTimeAgo={formatTimeAgo}
                            usernameToUrl={usernameToUrl}
                          />
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-400 text-sm">No recent activities</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* End center column */}

              {/* ========== RIGHT COLUMN - Members Active Today Only ========== */}
              <div className="test-column-right">
                {/* Members Active Today */}
                <div className="fantasy-section">
                  <h3 className="fantasy-section-title">Members Active Today</h3>
                  {activeMembersLoading ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
                          <div className="h-4 bg-slate-700/30 rounded w-1/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : activeMembers && activeMembers.active_members.length > 0 ? (
                    <>
                      <div className="space-y-2 mb-3">
                        {activeMembers.active_members.map((member: any, index: number) => (
                          <div
                            key={member.username}
                            className="flex justify-between items-center p-2 test-row-panel"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-mono text-xs w-5">
                                #{index + 1}
                              </span>
                              <Link
                                to={`/clan-member/${usernameToUrl(member.username)}`}
                                className="text-white text-sm font-medium hover:text-blue-300 transition-colors"
                              >
                                <Username
                                  username={member.username}
                                  clanRank={clanMembers.find(m => m.username === member.username)?.clan_rank}
                                />
                              </Link>
                            </div>
                            <span className="text-green-400 text-sm font-semibold">
                              +{formatNumber(member.xp_gained)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-slate-400">Total active</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {activeMembers.total_active}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-slate-400 py-4 text-sm">No active members today</p>
                  )}
                </div>
              </div>
              {/* End right column */}
            </div>
            {/* End 3-column layout */}
          </div>
          {/* End fantasy-content */}
        </div>
      </div>
    </>
  )
}

export default TestHome
