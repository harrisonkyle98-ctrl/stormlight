import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Trophy, Users, Swords, TrendingUp } from 'lucide-react'
import { fetchClanMembers, getGradientStyle } from '../utils/gradientUtils'
import { useAuth } from '../contexts/AuthContext'
import { usernameToUrl } from '../utils/urlUtils'

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

    return () => {
      clearInterval(statsInterval)
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
        setClanLogEntries(deduped)
      } else {
        console.error('❌ Clan log fetch failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Error fetching clan log:', error)
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
        <h1 className="text-3xl font-bold text-white mb-4">
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
          Track your progress, compete with fellow members, and climb the hiscores.
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
            <CardTitle className="text-sm font-medium text-slate-300">Total Clan XP</CardTitle>
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
                        {eventType === 'join' && `joined the clan as ${entry.new_rank}`}
                        {eventType === 'leave' && `has left the clan`}
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
    </div>
  )
}

export default Home
