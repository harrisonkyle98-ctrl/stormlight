import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Trophy, TrendingUp, Calendar, Activity } from 'lucide-react'
import '../styles/fantasy-container.css'
import { fetchClanMembers } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { usernameToUrl } from '../utils/urlUtils'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ClanLogRow } from '../components/clanLogs/ClanLogRow'
import { ActivityLogRow } from '../components/activityLogs/ActivityLogRow'
import { Username } from '../components/ui/username'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import { usePageTitle } from '../hooks/usePageTitle'
import DailyscapeCard from '../components/dailyscape/DailyscapeCard'

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


const Home = () => {
  usePageTitle('Home')
  const { user } = useAuth()
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
  const [recentProgress, setRecentProgress] = useState<any>(null)
  const [recentProgressLoading, setRecentProgressLoading] = useState(false)

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
    fetchActiveMembers()
  }, [])

  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.username && user?.isLinked) {
        await Promise.all([
          fetchPlayerStats(),
          fetchRecentProgress()
        ])
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

  const calculateDaysInClan = () => {
    if (!playerData?.join_date) return null
    // Extract date-only part to avoid timezone issues
    // This treats the join date as a calendar date, not a datetime
    const datePart = playerData.join_date.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    // Create date at noon local time to avoid DST edge cases
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
      console.log('🔄 Fetching activities...', { page, append })
      const cacheBuster = Date.now()
      const requestUrl = `${API_URL}/api/clan/activities?page=${page}&limit=10&_t=${cacheBuster}`
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
      const requestUrl = `${API_URL}/api/clan/log?page=1&limit=50&_t=${cacheBuster}`
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
        setClanLogEntries(deduped.slice(0, 10))
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
        console.log('📊 Members Active Today (from backend):', { 
          top5Count: data.active_members?.length || 0, 
          totalActive: data.total_active || 0 
        })
      } else {
        console.error('Failed to fetch active members:', response.status)
      }
    } catch (error) {
      console.error('Error fetching active members:', error)
    } finally {
      setActiveMembersLoading(false)
    }
  }

  return (
    <>
      {/* Global Profile Header - unified component for all pages */}
      <GlobalProfileHeader />

      <div className="fantasy-container">
        {/* Fantasy Banner Header with Ribbons */}
        <div className="fantasy-banner-wrapper">
        <div className="fantasy-banner-ribbon-left"></div>
        <div className="fantasy-banner-ribbon-right"></div>
        <div className="fantasy-banner">
          <div className="fantasy-banner-inner">
            <h1 className="fantasy-banner-title">Home</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="fantasy-content">
        {/* Stats Section */}
        <div className="fantasy-section">
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

        {/* Your Recent Progress & Members Active Today Section */}
        {user?.username && user?.isLinked && (
          <div className="fantasy-grid-2">
            {/* Your Recent Progress */}
            <div className="fantasy-section">
                            <h3 className="fantasy-section-title">Your Recent Progress</h3>
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
                      <p className="text-xs text-slate-400 mb-1">Today</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatNumber(recentProgress.xp_today || 0)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">7 Days</p>
                      <p className="text-lg font-bold" style={{ color: '#60a5fa' }}>
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
                  {recentProgress.sparkline && recentProgress.sparkline.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2">30-Day XP Gains</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={recentProgress.sparkline}>
                          <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            style={{ fontSize: '10px' }}
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              return `${date.getMonth() + 1}/${date.getDate()}`
                            }}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            style={{ fontSize: '10px' }}
                            tickFormatter={(value) => {
                              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                              return value.toString()
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="xp"
                            stroke="#a855f7"
                            strokeWidth={2}
                            strokeOpacity={0.9}
                            dot={false}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '0.375rem'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            labelFormatter={(value) => {
                              const date = new Date(value)
                              return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
                            }}
                            formatter={(value: any) => [formatNumber(value), 'XP Gained']}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-slate-700/20 rounded-lg text-center">
                      <p className="text-xs text-slate-400">No XP gain data available for the last 30 days</p>
                    </div>
                  )}

                  {/* 30-Day XP Total */}
                  <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-slate-400">XP Gained (30 Days)</span>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {formatNumber(recentProgress.xp_30d)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-400 py-8">No progress data available</p>
              )}
            </div>

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
                          >
                            <Username
                              username={member.username}
                              clanRank={clanMembers.find(m => m.username === member.username)?.clan_rank}
                            />
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
            </div>
          </div>
        )}

        {/* Dailyscape Section - positioned under Your Recent Progress / Members Active Today */}
        <div className="fantasy-grid-2">
          <DailyscapeCard />
          <div></div>
        </div>

        {/* Clan Log & Recent Activity Section */}
        <div className="fantasy-grid-2">
          {/* Clan Log */}
          <div className="fantasy-section">
                        <h3 className="fantasy-section-title">Clan Log</h3>
          {clanLogLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="h-5 w-16 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-32 bg-slate-700/50 rounded"></div>
                  </div>
                  <div className="h-3 w-20 bg-slate-700/40 rounded mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
                    <div className="space-y-3">
                      {clanLogEntries.length > 0 ? (
                        clanLogEntries.map((entry) => (
                          <ClanLogRow
                  key={entry.id}
                  entry={entry}
                  formatTimeAgo={formatTimeAgo}
                  getRankIcon={getRankIcon}
                  usernameToUrl={usernameToUrl}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent clan events</p>
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
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-48 bg-slate-700/50 rounded"></div>
                  </div>
                  <div className="h-3 w-20 bg-slate-700/40 rounded mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
                    <div className="space-y-3">
                      {activities.length > 0 ? (
                        activities.map((activity, index) => (
                          <ActivityLogRow
                  key={`${activity.username}-${activity.timestamp}-${index}`}
                  activity={activity}
                  formatTimeAgo={formatTimeAgo}
                  usernameToUrl={usernameToUrl}
                  clanRank={clanMembers.find(m => m.username === activity.username)?.clan_rank}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent activities found</p>
              </div>
            )}
          </div>
          )}
          </div>
        </div>
      </div>
      {/* End fantasy-content */}
      </div>
    </>
  )
}

export default Home
