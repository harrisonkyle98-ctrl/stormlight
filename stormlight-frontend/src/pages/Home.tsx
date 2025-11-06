import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Users, Trophy, TrendingUp, User, Settings, Calendar, Activity } from 'lucide-react'
import { fetchClanMembers, getGradientStyle, checkPlayerMilestones } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { usernameToUrl } from '../utils/urlUtils'
import { Tooltip } from '../components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { themes } from '../config/themes'
import { ClanLogRow } from '../components/clanLogs/ClanLogRow'
import { ActivityLogRow } from '../components/activityLogs/ActivityLogRow'
import { Username, clearUsernameColorCache } from '../components/ui/username'

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
  const { user } = useAuth()
  const [clanStats, setClanStats] = useState<ClanStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [clanMembers, setClanMembers] = useState<any[]>([])
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
  const [highestPlacement, setHighestPlacement] = useState<any>(null)
  const [highestPlacementLoading, setHighestPlacementLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [eligibleBadges, setEligibleBadges] = useState<CustomBadge[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [accountLinkRequests, setAccountLinkRequests] = useState<any[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [linkRequestLoading, setLinkRequestLoading] = useState(false)
  const { theme: selectedTheme, setTheme: handleThemeChange } = useTheme()
  const [themeTooltip, setThemeTooltip] = useState<string | null>(null)

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
            fetchRecentProgress(),
            fetchHighestPlacement()
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

  const fetchHighestPlacement = async () => {
    if (!user?.username) return

    setHighestPlacementLoading(true)
    try {
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/highest-placement`)
      if (response.ok) {
        const data = await response.json()
        setHighestPlacement(data)
      }
    } catch (error) {
      console.error('Error fetching highest placement:', error)
    } finally {
      setHighestPlacementLoading(false)
    }
  }

  const fetchAccountLinkRequests = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/my-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    if (!user?.username || !user?.discordId) return
    
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const [membersResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/api/clan/members`),
        fetch(`${API_URL}/api/account-link-requests/my-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        const requestsData = requestsResponse.ok ? await requestsResponse.json() : { requests: [] }
        const requests = requestsData.requests || []
        
        const linkedUsernames = new Set<string>()
        linkedUsernames.add(user.username)
        
        requests.forEach((req: any) => {
          if (req.status === 'APPROVED') {
            linkedUsernames.add(req.alternateUsername)
            linkedUsernames.add(req.primaryUsername)
          }
        })
        
        const allLinkedAccounts = membersData.members.filter((member: any) => 
          linkedUsernames.has(member.username)
        )
        
        const currentAccount = allLinkedAccounts.find((acc: any) => acc.username === user.username)
        const otherAccounts = allLinkedAccounts.filter((acc: any) => acc.username !== user.username)
        
        if (currentAccount) {
          setLinkedAccounts([currentAccount, ...otherAccounts])
        } else {
          setLinkedAccounts([
            {
              username: user.username,
              discord_id: user.discordId,
              clan_rank: user.clanRank || 'Unknown'
            },
            ...otherAccounts
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching linked accounts:', error)
      if (user?.username && user?.discordId) {
        setLinkedAccounts([{
          username: user.username,
          discord_id: user.discordId,
          clan_rank: user.clanRank || 'Unknown'
        }])
      }
    }
  }

  const handleSubmitLinkRequest = async () => {
    const token = localStorage.getItem('access_token')
    if (!newUsername.trim() || !token) return
    
    setLinkRequestLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          alternateUsername: newUsername.trim()
        })
      })
      
      if (response.ok) {
        setNewUsername('')
        await fetchAccountLinkRequests()
        await fetchLinkedAccounts()
        alert('Link request submitted successfully! An admin will review it.')
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to submit link request')
      }
    } catch (error) {
      console.error('Error submitting link request:', error)
      alert('Failed to submit link request')
    } finally {
      setLinkRequestLoading(false)
    }
  }

  const handleDeleteRejectedRequest = async (requestId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        await fetchAccountLinkRequests()
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    }
  }

  const handleSwitchAccount = async (targetUsername: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/switch/${encodeURIComponent(targetUsername)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        localStorage.removeItem('player_stats_cache')
        localStorage.removeItem('player_activities_cache')
        
        const userResponse = await fetch(`${API_URL}/api/user/me?refresh=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          console.log('Updated user data after switch:', userData)
        }
        
        window.location.href = '/'
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to switch account')
      }
    } catch (error) {
      console.error('Error switching account:', error)
      alert('Failed to switch account')
    }
  }


  const fetchEligibleBadges = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/user/eligible-badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setEligibleBadges(data.eligibleBadges || [])
        setSelectedBadgeId(data.selectedBadgeId || null)
      }
    } catch (error) {
      console.error('Error fetching eligible badges:', error)
    }
  }

  const handleBadgeSelection = async (badgeId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const newBadgeId = selectedBadgeId === badgeId ? null : badgeId
      
      const response = await fetch(`${API_URL}/api/user/selected-badge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ badgeId: newBadgeId })
      })

      if (response.ok) {
        setSelectedBadgeId(newBadgeId)
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(errorData.detail || 'Failed to update badge selection')
      }
    } catch (error) {
      console.error('Error updating badge selection:', error)
      alert('Failed to update badge selection')
    }
  }

  useEffect(() => {
    if (settingsOpen) {
      fetchAccountLinkRequests()
      fetchLinkedAccounts()
      fetchEligibleBadges()
    }
  }, [settingsOpen])

  const overallStats = playerData?.stats?.overall

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Members */}
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
            <Users className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
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
            <TrendingUp className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
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
              <Calendar className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
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
            <Trophy className="h-4 w-4 stat-icon text-theme-accent-light transition-colors duration-200" />
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
                    className="bg-theme-button hover:bg-theme-button-hover"
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
              <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
                {/* Left Column Skeleton (30%) */}
                <div className="lg:w-[30%] flex-shrink-0">
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
                {/* Middle Column Skeleton (40%) */}
                <div className="flex-1 lg:max-w-[40%] space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-stretch overflow-hidden rounded-lg">
                      <div className="bg-slate-800/70 w-12 h-12"></div>
                      <div className="flex-1 bg-slate-700/30 h-12"></div>
                    </div>
                  ))}
                </div>
                {/* Right Column Skeleton (30%) */}
                <div className="flex-1 lg:max-w-[30%]">
                  <div className="bg-slate-700/30 rounded-lg p-6 h-full flex items-center justify-center">
                    <div className="space-y-2 w-full">
                      <div className="h-4 bg-slate-700/50 rounded w-3/4 mx-auto"></div>
                      <div className="h-12 bg-slate-700/50 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : playerData && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            {/* Horizontal layout with responsive stacking - Three columns */}
            <div className="flex flex-col lg:flex-row gap-4">

              {/* Left Column: Avatar (30% width) */}
              <div className="lg:w-[30%] flex-shrink-0 flex flex-col gap-6">
                {/* Avatar Section */}
                <div className="bg-slate-700/30 rounded-lg p-6 relative">
                  <Tooltip content="User Settings">
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="absolute top-4 right-4 hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <Settings className="w-5 h-5 text-slate-400" />
                    </button>
                  </Tooltip>

                  <div className="flex flex-col items-center space-y-4">
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

              {/* Middle Column: Stats Section (40% width) */}
              {overallStats && (
                <div className="flex-1 lg:max-w-[40%] flex flex-col justify-between">
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

              {/* Right Column: Highest Competition Placement (30% width) */}
              <div className="flex-1 lg:max-w-[30%] flex flex-col justify-center">
                {highestPlacementLoading ? (
                  <div className="bg-slate-700/30 rounded-lg p-6 h-full flex items-center justify-center">
                    <div className="animate-pulse text-slate-400">Loading...</div>
                  </div>
                ) : (
                  <Tooltip content={highestPlacement?.has_placement ? highestPlacement.competition_name : "No competition history yet."}>
                    <div
                      className={`bg-slate-700/30 rounded-lg p-6 h-full flex items-center justify-center relative overflow-hidden ${
                        highestPlacement?.has_placement ? 'cursor-pointer hover:bg-slate-700/50 transition-colors' : ''
                      }`}
                      onClick={() => {
                        if (highestPlacement?.has_placement && highestPlacement.competition_id) {
                          window.location.href = `/competitions/${highestPlacement.competition_id}`
                        }
                      }}
                    >
                      {/* Faint Trophy Icon Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Trophy 
                          className={`w-32 h-32 ${
                            !highestPlacement?.has_placement ? 'text-slate-500' :
                            highestPlacement.placement === 1 ? 'text-yellow-400' :
                            highestPlacement.placement === 2 ? 'text-slate-300' :
                            highestPlacement.placement === 3 ? 'text-amber-600' :
                            'text-slate-500'
                          }`}
                        />
                      </div>
                      
                      {/* Placement Number or --- */}
                      <div className="relative z-10 text-center">
                        <p className="text-xs text-slate-400 mb-2">Highest Placement</p>
                        <p className={`text-4xl font-bold ${
                          !highestPlacement?.has_placement ? 'text-slate-400' :
                          highestPlacement.placement === 1 ? 'text-yellow-400' :
                          highestPlacement.placement === 2 ? 'text-slate-300' :
                          highestPlacement.placement === 3 ? 'text-amber-600' :
                          'text-white'
                        }`}>
                          {highestPlacement?.has_placement ? `#${highestPlacement.placement}` : '---'}
                        </p>
                      </div>
                    </div>
                  </Tooltip>
                )}
              </div>
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
                Your XP gains over the last 30 days
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
            </CardContent>
          </Card>

          {/* Members Active Today Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Members Active Today</CardTitle>
              <CardDescription className="text-slate-400">
                Clanmates who gained XP today
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
                  getGradientStyle={getGradientStyle}
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
                  getGradientStyle={getGradientStyle}
                  usernameToUrl={usernameToUrl}
                  clanRank={clanMembers.find(m => m.username === activity.username)?.clan_rank}
                  className="bg-slate-700/50"
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent activities found</p>
              </div>
            )}
          </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* User Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">User Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your account and preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Account Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Account
              </h3>
              
              <div className="space-y-2">
                {linkedAccounts.map((account, index) => {
                  const isActive = account.discord_id === user?.discordId
                  const isPrimary = index === 0

                  const approvedUsernames = new Set(
                    accountLinkRequests
                      .filter((req: any) => req.status === 'APPROVED')
                      .flatMap((req: any) => [req.primaryUsername, req.alternateUsername])
                  )

                  const canSwitch = !isActive && approvedUsernames.has(account.username) && !account.discord_id
                  
                  return (
                    <div 
                      key={account.username}
                      className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{account.username}</span>
                        {isActive ? (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-theme-accent-light border border-theme-accent/30">
                            Active
                          </span>
                        ) : isPrimary ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            Linked (Primary)
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            Linked (Alternate)
                          </span>
                        )}
                      </div>
                      
                      {canSwitch && (
                        <Button
                          size="sm"
                          className="bg-theme-button hover:bg-theme-button-hover text-white"
                          onClick={() => handleSwitchAccount(account.username)}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  )
                })}
                
                {accountLinkRequests.filter((req: any) => 
                  req.status === 'APPROVED' && !linkedAccounts.some((acc) => acc.username === req.alternateUsername)
                ).map((request: any) => (
                  <div 
                    key={request.id}
                    className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{request.alternateUsername}</span>
                      <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        Linked (Alternate)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-theme-button hover:bg-theme-button-hover text-white"
                      onClick={() => handleSwitchAccount(request.alternateUsername)}
                    >
                      Switch
                    </Button>
                  </div>
                ))}
                
                {accountLinkRequests.filter((req: any) => 
                  req.status !== 'APPROVED' && !linkedAccounts.some((acc) => acc.username === req.alternateUsername)
                ).map((request: any) => (
                  <div 
                    key={request.id}
                    className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{request.alternateUsername}</span>
                      {request.status === 'PENDING' && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Pending
                        </span>
                      )}
                      {request.status === 'REJECTED' && (
                        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          Rejected
                        </span>
                      )}
                    </div>
                    {request.status === 'REJECTED' && (
                      <button
                        onClick={() => handleDeleteRejectedRequest(request.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove rejected request"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter RuneScape username"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={linkRequestLoading}
                    />
                    <Button
                      onClick={handleSubmitLinkRequest}
                      disabled={!newUsername.trim() || linkRequestLoading}
                      className="bg-theme-button hover:bg-theme-button-hover text-white"
                    >
                      {linkRequestLoading ? 'Submitting...' : '+ Add Another Account'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge Username Color Section */}
            {eligibleBadges.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                  Username Color Badge
                </h3>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 mb-3">
                      Select a badge to apply its color to your username across the site. Click again to deselect.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {eligibleBadges.map((badge) => {
                        const isSelected = selectedBadgeId === badge.id
                        const backgroundColor = badge.gradientColors 
                          ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                          : badge.backgroundColor || '#6b7280'
                        
                        return (
                          <button
                            key={badge.id}
                            onClick={() => handleBadgeSelection(badge.id)}
                            className={`px-3 py-1.5 text-sm font-semibold flex items-center space-x-2 rounded-md text-white transition-all ${
                              isSelected 
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-105' 
                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            style={{
                              background: backgroundColor
                            }}
                            title={badge.description || badge.name}
                          >
                            <img 
                              src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                              alt={badge.name} 
                              className="w-4 h-4"
                            />
                            <span>{badge.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                Appearance
              </h3>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Color Theme</h4>
                    <div className="flex flex-wrap gap-3">
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
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Select a color theme to customize the appearance of the site. Your preference will be saved and applied across all pages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Home
