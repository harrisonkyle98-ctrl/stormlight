import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Trophy, Users, Swords, TrendingUp } from 'lucide-react'
import { fetchClanMembers, getGradientStyle } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { usernameToUrl } from '../utils/urlUtils'

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
  event_type: 'join' | 'leave' | 'rank_up' | 'name_change'
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
  const [activityPage, setActivityPage] = useState(1)
  const [hasMoreActivities, setHasMoreActivities] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clanMembers, setClanMembers] = useState<any[]>([])
  const [loadingStatus, setLoadingStatus] = useState<{is_complete: boolean, processed_members: number, total_members: number} | null>(null)
  const [clanLogEntries, setClanLogEntries] = useState<ClanLogEntry[]>([])
  const [clanLogLoading, setClanLogLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchClanStats()
    fetchActivities()
    fetchClanLog()
    loadClanMembers()

    const statsInterval = setInterval(() => {
      console.log('🔄 Refreshing Total XP data (hourly)')
      fetchClanStats()
    }, 60 * 60 * 1000) // 1 hour in milliseconds

    const clanLogInterval = setInterval(() => {
      console.log('🔄 Refreshing Clan Log data (5 minutes)')
      fetchClanLog()
    }, 5 * 60 * 1000) // 5 minutes in milliseconds

    return () => {
      clearInterval(statsInterval)
      clearInterval(clanLogInterval)
    }
  }, [])

  const loadClanMembers = async () => {
    const members = await fetchClanMembers()
    setClanMembers(members)
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
        setHasMoreActivities(data.pagination.has_next)
        setActivityPage(page)
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

  const loadMoreActivities = () => {
    if (!activityLoading && hasMoreActivities) {
      fetchActivities(activityPage + 1, true)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - Math.abs(timestamp)
    
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
    return `${Math.floor(diff / 604800)} weeks ago`
  }

  const fetchClanLog = async () => {
    try {
      setClanLogLoading(true)
      const response = await fetch(`${API_URL}/api/clan/log?page=1&limit=10`)
      if (response.ok) {
        const data: ClanLogResponse = await response.json()
        setClanLogEntries(data.log_entries)
      }
    } catch (error) {
      console.error('Error fetching clan log:', error)
    } finally {
      setClanLogLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome back, {user?.username ? (
            <Link 
              to={`/clan-member/${usernameToUrl(user.username)}`}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {user.username}
            </Link>
          ) : (
            <span className="text-blue-400">Guest</span>
          )}
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          World 98 based. Track your progress, compete with fellow members,
          and climb the clan hiscores together.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : clanStats?.total_members || 0}
            </div>
            <p className="text-xs text-slate-400">Friends to play with</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total XP</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : formatNumber(clanStats?.total_xp || 0)}
            </div>
            <p className="text-xs text-slate-400">Combined clan XP</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Competitions</CardTitle>
            <Swords className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3</div>
            <p className="text-xs text-slate-400">Active competitions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Clan Rank</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : (user?.isLinked && user?.clanRank) ? user.clanRank : user ? 'Not a member' : 'Unknown'}
            </div>
            <p className="text-xs text-slate-400">{user?.isLinked ? 'Your clan rank' : 'Clan membership'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Clan Members</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Browse our clan roster and member profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              Explore our clan member directory to see who's in Stormlight, their clan ranks,
              total XP, and view detailed player profiles with real data.
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link to="/members">View Members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Swords className="h-5 w-5 text-green-400" />
              <span>Competitions</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Join XP competitions and climb the leaderboards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              Participate in skill-based competitions, track your XP gains, and compete
              with clan members for the top spots on our leaderboards.
            </p>
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link to="/competitions">View Competitions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Clan Log</CardTitle>
          <CardDescription className="text-slate-400">
            Recent clan member activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clanLogEntries.length > 0 ? (
              clanLogEntries.map((entry) => (
                <div key={entry.id} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex-shrink-0 mr-2">
                      {entry.event_type === 'join' && <span className="text-green-400 text-lg">✅</span>}
                      {entry.event_type === 'leave' && <span className="text-red-400 text-lg">❌</span>}
                      {entry.event_type === 'rank_up' && <span className="text-blue-400 text-lg">⬆️</span>}
                      {entry.event_type === 'name_change' && <span className="text-yellow-400 text-lg">✏️</span>}
                    </div>
                    <Link 
                      to={`/clan-member/${usernameToUrl(entry.username)}`}
                      className="text-white font-medium hover:text-blue-300 transition-colors"
                      style={getGradientStyle(entry.username, entry.new_rank || entry.old_rank)}
                    >
                      {entry.username}
                    </Link>
                  </div>
                  <p className="text-slate-300 text-center mb-1">
                    {entry.event_type === 'join' && `joined the clan as ${entry.new_rank}`}
                    {entry.event_type === 'leave' && `left the clan`}
                    {entry.event_type === 'rank_up' && `promoted from ${entry.old_rank} to ${entry.new_rank}`}
                    {entry.event_type === 'name_change' && `${entry.old_rank} changed their name to ${entry.username}`}
                  </p>
                  <p className="text-slate-400 text-xs text-center">{formatTimeAgo(new Date(entry.timestamp).getTime() / 1000)}</p>
                </div>
              ))
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
            Latest updates from clan members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={`${activity.username}-${activity.timestamp}-${index}`} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Avatar className="h-8 w-8 flex-shrink-0 mr-2">
                      <AvatarImage 
                        src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(activity.username.replace(/\u00A0/g, ' '))}/chat.png`}
                        alt={activity.username}
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {activity.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Link 
                      to={`/clan-member/${usernameToUrl(activity.username)}`}
                      className="text-white font-medium hover:text-blue-300 transition-colors"
                      style={getGradientStyle(activity.username, clanMembers.find(m => m.username === activity.username)?.clan_rank)}
                    >
                      {activity.username}
                    </Link>
                  </div>
                  <p className="text-slate-300 text-center mb-1">{activity.text}</p>
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
            
            {hasMoreActivities && (
              <div className="text-center pt-4">
                <Button 
                  onClick={loadMoreActivities}
                  disabled={activityLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {activityLoading ? 'Loading...' : 'See More'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Home
