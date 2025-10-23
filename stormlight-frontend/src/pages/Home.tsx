import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Users, Swords, TrendingUp, User, CircleCheck, Calendar, Activity } from 'lucide-react'
import { fetchClanMembers, getGradientStyle, checkPlayerMilestones } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { usernameToUrl } from '../utils/urlUtils'
import { Tooltip } from '../components/ui/tooltip'
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

const getRankIcon = (rank: string): string => {
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
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
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

const Home = () => {
  const { user } = useAuth()
  const [clanStats, setClanStats] = useState<ClanStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [clanMembers, setClanMembers] = useState<any[]>([])
  const [loadingStatus, setLoadingStatus] = useState<{is_complete: boolean, processed_members: number, total_members: number} | null>(null)
  const [clanLogEntries, setClanLogEntries] = useState<ClanLogEntry[]>([])
  const [clanLogLoading, setClanLogLoading] = useState(true)
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [questData, setQuestData] = useState<any>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [activeCompetitionsCount, setActiveCompetitionsCount] = useState<number>(0)
  const [recentProgress, setRecentProgress] = useState<any>(null)
  const [recentProgressLoading, setRecentProgressLoading] = useState(false)
  const [activeMembers, setActiveMembers] = useState<any>(null)
  const [activeMembersLoading, setActiveMembersLoading] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    console.log('🔍 Home useEffect triggered - User state:', {
      hasUser: !!user,
      username: user?.username,
      isLinked: user?.isLinked,
      requiresLinking: user?.requiresLinking
    })

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
      console.log('🔄 Refreshing Total XP data (hourly)')
      fetchClanStats()
    }, 60 * 60 * 1000)

    return () => {
      clearInterval(statsInterval)
    }
  }, [])

  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.username && user?.isLinked) {
        console.log('✅ User is linked, fetching profile data independently')
        setProfileLoading(true)
        try {
          await Promise.all([
            fetchPlayerStats(),
            fetchQuestData(),
            fetchRecentProgress()
          ])
        } finally {
          setProfileLoading(false)
        }
      } else if (user) {
        console.log('⚠️ User exists but not linked or no username:', {
          username: user.username,
          isLinked: user.isLinked
        })
        setProfileError(user.requiresLinking ? 'Please link your RuneScape account' : 'Account not linked to clan member')
      } else {
        console.log('ℹ️ No user logged in')
      }
    }

    loadProfileData()
  }, [user?.username, user?.isLinked])

  useEffect(() => {
    fetchActiveMembers()
  }, [])

  const loadClanMembers = async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
  }

  const fetchPlayerStats = async () => {
    if (!user?.username) {
      console.log('❌ fetchPlayerStats: No username available')
      return
    }
    try {
      setProfileError(null)
      const encodedUsername = encodeURIComponent(user.username)
      const fullUrl = `${API_URL}/api/player/${encodedUsername}/stats`
      console.log('🔄 Fetching player profile data:', {
        originalUsername: user.username,
        encodedUsername: encodedUsername,
        fullUrl: fullUrl,
        API_URL: API_URL
      })

      const response = await fetch(fullUrl)
      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Player profile data loaded successfully:', {
          username: data.username,
          hasStats: !!data.stats,
          hasClanRank: !!data.clan_rank,
          dataKeys: Object.keys(data)
        })
        setPlayerData(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to fetch player stats:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        })
        setProfileError(`Failed to load profile data (${response.status})`)
      }
    } catch (error) {
      console.error('❌ Error fetching player stats:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setProfileError('Error loading profile data')
    }
  }

  const fetchQuestData = async () => {
    if (!user?.username) return
    try {
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/quests`)
      if (response.ok) {
        const data = await response.json()
        setQuestData(data)
      }
    } catch (error) {
      console.error('Error fetching quest data:', error)
    }
  }

  const fetchClanStats = async () => {
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
      console.log('🔄 Fetching activities...', { page, append })
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/clan/activities?page=${page}&limit=8&_t=${cacheBuster}`
      console.log('📡 Request URL:', requestUrl)
      const response = await fetch(requestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data: ActivityResponse = await response.json()
        console.log('✅ Activities fetched:', {
          activities: data.activities.length,
          loading_status: data.loading_status,
          processed: data.loading_status?.processed_members,
          total: data.loading_status?.total_members,
          first_activity: data.activities[0]?.username,
          response_url: response.url
        })
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
        setLoadingStatus(data.loading_status || null)

        if (data.loading_status && !data.loading_status.is_complete) {
          console.log('⏰ Scheduling next poll in 3 seconds...')
          setTimeout(() => {
            fetchActivities(page, false)
          }, 3000)
        } else {
          console.log('✅ Loading complete!')
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
      console.log('🔄 Fetching clan log...')
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/clan/log?page=1&limit=10&_t=${cacheBuster}`
      console.log('📡 Clan Log Request URL:', requestUrl)
      const response = await fetch(requestUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data: ClanLogResponse = await response.json()
        console.log('✅ Clan log fetched:', {
          entries: data.log_entries.length,
          first_entry: data.log_entries[0]?.username,
          response_url: response.url
        })

        const seen = new Set<string>()
        const deduped = data.log_entries.filter((e) => {
          const d = new Date(e.timestamp)
          d.setSeconds(0, 0)
          const key = `${e.username}|${e.event_type}|${e.old_rank ?? ''}|${e.new_rank ?? ''}|${d.toISOString()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setClanLogEntries(deduped.slice(0, 8))
      } else {
        console.error('❌ Clan log fetch failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Error fetching clan log:', error)
    } finally {
      setClanLogLoading(false)
    }
  }

  const fetchActiveCompetitions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/competitions`)
      if (response.ok) {
        const data = await response.json()
        const activeCount = data.filter((comp: any) => comp.status === 'active').length
        setActiveCompetitionsCount(activeCount)
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

  const calculateDaysInClan = () => {
    console.log('📅 calculateDaysInClan called')
    console.log('📅 playerData:', playerData)
    console.log('📅 playerData?.join_date:', playerData?.join_date)
    
    if (!playerData?.join_date) {
      console.log('⚠️ No join_date found in playerData')
      return null
    }
    
    const joinDate = new Date(playerData.join_date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - joinDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    console.log(`✅ Calculated days in clan: ${diffDays} (join_date: ${playerData.join_date})`)
    return diffDays
  }

  const fetchRecentProgress = async () => {
    if (!user?.username) return
    
    setRecentProgressLoading(true)
    try {
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/recent-progress`)
      if (response.ok) {
        const data = await response.json()
        setRecentProgress(data)
      }
    } catch (error) {
      console.error('Error fetching recent progress:', error)
    } finally {
      setRecentProgressLoading(false)
    }
  }

  const fetchActiveMembers = async () => {
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

  const overallStats = playerData?.stats?.overall

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Members */}
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* 2. Total Clan XP */}
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Clan XP</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* 3. Time Spent in Clan */}
        {user?.username && user?.isLinked ? (
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Time Spent in Clan</CardTitle>
              <Calendar className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        ) : null}

        {/* 4. Competitions */}
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Competitions</CardTitle>
            <Swords className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Personal Profile Card */}
      {user?.username && user?.isLinked && (profileError ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{profileError}</p>
                {!user?.requiresLinking && (
                  <Button
                    onClick={fetchPlayerStats}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : profileLoading || !playerData ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
                {/* Left Column Skeleton */}
                <div className="lg:w-1/3 flex-shrink-0">
                  <div className="bg-slate-700/30 rounded-lg p-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-full"></div>
                      <div className="space-y-2 w-full">
                        <div className="h-6 bg-slate-700/50 rounded w-3/4 mx-auto"></div>
                        <div className="h-4 bg-slate-700/30 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right Column Skeleton */}
                <div className="flex-1 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-stretch overflow-hidden rounded-lg">
                      <div className="bg-slate-800/70 w-12 h-12"></div>
                      <div className="flex-1 bg-slate-700/30 h-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : playerData && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            {/* Horizontal layout with responsive stacking */}
            <div className="flex flex-col lg:flex-row gap-6">

              {/* Left Column: Avatar + Badges stacked vertically */}
              <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6">
                {/* Avatar Section */}
                <div className="bg-slate-700/30 rounded-lg p-6 relative">
                  <Tooltip content={
                    <>
                      {playerData.is_verified ? "Verified" : "Unverified"}
                      <br />
                      Last updated: {new Date(playerData.last_updated).toLocaleDateString()}
                    </>
                  }>
                    <div className="absolute top-4 right-4">
                      <CircleCheck
                        className={`w-5 h-5 ${playerData.is_verified ? 'text-green-500' : 'text-gray-500'}`}
                      />
                    </div>
                  </Tooltip>

                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage
                        src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username)}/chat.png`}
                        alt={user.username}
                      />
                      <AvatarFallback className="bg-blue-600 text-white">
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h1 className="text-2xl font-bold text-center">
                        <Link
                          to={`/clan-member/${usernameToUrl(user.username)}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <span
                            style={getGradientStyle(user.username, playerData.clan_rank)}
                          >
                            {user.username}
                          </span>
                        </Link>
                      </h1>

                      {playerData.stats && (() => {
                        const allBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, user.username, playerData.league_points)
                        const rankBadge = allBadges.find(badge => badge.id.startsWith('rank-'))
                        return rankBadge ? (
                          <div className="mt-3">
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

              {/* Right Column: Stats Section */}
              {overallStats && (
                <div className="flex-1 flex flex-col justify-between">
                <Tooltip content="Combat Level">
                  <div className="flex items-stretch overflow-hidden rounded-lg">
                    <div className="bg-slate-800/70 flex items-center justify-center px-3 py-2">
                      <img
                        src="/assets/icons/combat_level.png"
                        alt="Combat Level"
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-end bg-slate-700/30 px-4 py-2">
                      <span className="text-lg font-bold text-white">
                        {overallStats.combatlevel}
                      </span>
                    </div>
                  </div>
                </Tooltip>

                <Tooltip content="Total Level">
                  <div className="flex items-stretch overflow-hidden rounded-lg">
                    <div className="bg-slate-800/70 flex items-center justify-center px-3 py-2">
                      <img
                        src="/assets/icons/total_level.png"
                        alt="Total Level"
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-end bg-slate-700/30 px-4 py-2">
                      <span className="text-lg font-bold text-white">
                        {overallStats.level}
                      </span>
                    </div>
                  </div>
                </Tooltip>

                <Tooltip content="Quest Points">
                  <div className="flex items-stretch overflow-hidden rounded-lg">
                    <div className="bg-slate-800/70 flex items-center justify-center px-3 py-2">
                      <img
                        src="/assets/icons/quest_points.png"
                        alt="Quest Points"
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-end bg-slate-700/30 px-4 py-2">
                      <span className="text-lg font-bold text-white">
                        {playerData.quest_points || 0}
                      </span>
                    </div>
                  </div>
                </Tooltip>

                <Tooltip content="RuneScore">
                  <div className="flex items-stretch overflow-hidden rounded-lg">
                    <div className="bg-slate-800/70 flex items-center justify-center px-3 py-2">
                      <img
                        src="/assets/icons/runescore.png"
                        alt="RuneScore"
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-end bg-slate-700/30 px-4 py-2">
                      <span className="text-lg font-bold text-white">
                        {playerData.runescore?.toLocaleString() || '—'}
                      </span>
                    </div>
                  </div>
                </Tooltip>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        ))}

      {/* Your Recent Progress & Members Active Today Cards */}
      {user?.username && user?.isLinked && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Your Recent Progress Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Your Recent Progress</CardTitle>
              <CardDescription className="text-slate-400">
                Your personal XP growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentProgressLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-32 bg-slate-700/50 rounded"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700/30 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
                  </div>
                </div>
              ) : recentProgress ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">24 Hours</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatNumber(recentProgress.xp_24h)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">7 Days</p>
                      <p className="text-lg font-bold text-blue-400">
                        {formatNumber(recentProgress.xp_7d)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">30 Days</p>
                      <p className="text-lg font-bold text-purple-400">
                        {formatNumber(recentProgress.xp_30d)}
                      </p>
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  {recentProgress.sparkline && recentProgress.sparkline.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">7-Day XP Trend</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={recentProgress.sparkline}>
                          <Line
                            type="monotone"
                            dataKey="xp"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '0.375rem'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value: any) => [formatNumber(value), 'XP']}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Total XP */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-sm text-slate-400">Current Total XP</p>
                    <p className="text-xl font-bold text-white">
                      {formatNumber(recentProgress.current_total_xp)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-400 py-8">No progress data available</p>
              )}
            </CardContent>
          </Card>

          {/* Members Active Today Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Members Active Today</CardTitle>
              <CardDescription className="text-slate-400">
                Clanmates who trained today
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <div className="space-y-3 mb-4">
                    {activeMembers.active_members.map((member: any, index: number) => (
                      <div
                        key={member.username}
                        className="flex justify-between items-center p-2 bg-slate-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-sm w-6">
                            #{index + 1}
                          </span>
                          <Link
                            to={`/clan-member/${usernameToUrl(member.username)}`}
                            className="text-white font-medium hover:text-blue-300 transition-colors"
                            style={getGradientStyle(member.username, clanMembers.find(m => m.username === member.username)?.clan_rank)}
                          >
                            {member.username}
                          </Link>
                        </div>
                        <span className="text-green-400 font-semibold">
                          +{formatNumber(member.xp_gained)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total Active Summary */}
                  <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-slate-400">Total active today</span>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {activeMembers.total_active}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-400 py-8">No active members today</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Clan Log</CardTitle>
          <CardDescription className="text-slate-400">
            Recent clan activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clanLogEntries.length > 0 ? (
              clanLogEntries.map((entry) => {
                const eventType = entry.event_type.toLowerCase()

                return (
                  <div key={entry.id} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <div className="flex-shrink-0">
                        {eventType === 'join' && <Badge className="bg-green-600 text-white font-bold hover:bg-green-600">Joined</Badge>}
                        {eventType === 'leave' && <Badge className="bg-red-600 text-white font-bold hover:bg-red-600">Left</Badge>}
                        {eventType === 'rank_up' && <Badge className="bg-green-500 text-white hover:bg-green-500">Promoted</Badge>}
                        {eventType === 'rank_down' && <Badge className="bg-red-500 text-white hover:bg-red-500">Demoted</Badge>}
                        {eventType === 'name_change' && <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Name</Badge>}
                      </div>
                      <Link
                        to={`/clan-member/${usernameToUrl(entry.username)}`}
                        className="text-white font-medium hover:text-blue-300 transition-colors"
                        style={getGradientStyle(entry.username, entry.new_rank || entry.old_rank)}
                      >
                        {entry.username}
                      </Link>
                      <span className="text-slate-300">
                        {eventType === 'join' && `joined the clan`}
                        {eventType === 'leave' && `left the clan`}
                        {eventType === 'rank_up' && (
                          <span className="flex items-center gap-1">
                            promoted from
                            <img src={getRankIcon(entry.old_rank || '')} alt={entry.old_rank} className="w-4 h-4 mx-1" />
                            to
                            <img src={getRankIcon(entry.new_rank || '')} alt={entry.new_rank} className="w-4 h-4 mx-1" />
                          </span>
                        )}
                        {eventType === 'rank_down' && (
                          <span className="flex items-center gap-1">
                            demoted from
                            <img src={getRankIcon(entry.old_rank || '')} alt={entry.old_rank} className="w-4 h-4 mx-1" />
                            to
                            <img src={getRankIcon(entry.new_rank || '')} alt={entry.new_rank} className="w-4 h-4 mx-1" />
                          </span>
                        )}
                        {eventType === 'name_change' && `${entry.old_rank} changed their name to ${entry.username}`}
                        {!['join', 'leave', 'rank_up', 'rank_down', 'name_change'].includes(eventType) && 'clan event'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs text-center">{formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}</p>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">
                  {clanLogLoading ? 'Loading clan events...' : 'No recent clan events'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-slate-400">
            Latest clan member activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={`${activity.username}-${activity.timestamp}-${index}`} className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-300 text-center mb-1">
                    <Link
                      to={`/clan-member/${usernameToUrl(activity.username)}`}
                      className="text-white font-medium hover:text-blue-300 transition-colors"
                      style={getGradientStyle(activity.username, clanMembers.find(m => m.username === activity.username)?.clan_rank)}
                    >
                      {activity.username}
                    </Link>
                    {' '}
                    {activity.text}
                  </p>
                  <p className="text-slate-400 text-xs text-center">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">
                  {activityLoading ? (
                    loadingStatus && !loadingStatus.is_complete ?
                      `Loading activities... (${loadingStatus.processed_members}/${loadingStatus.total_members} members processed)` :
                      'Loading activities...'
                  ) : 'No recent activities found'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Home
