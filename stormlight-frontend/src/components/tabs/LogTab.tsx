import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/badge'
import { usernameToUrl } from '../../utils/urlUtils'
import { getGradientStyle } from '../../utils/gradientUtils'

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

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface UserLogEntry {
  id: number
  username: string
  event_type: string
  old_rank?: string
  new_rank?: string
  timestamp: string
}

interface UserLogResponse {
  log_entries: UserLogEntry[]
  pagination: {
    page: number
    limit: number
    total_entries: number
    has_next: boolean
  }
}

export const LogTab = ({ username, playerData, API_URL }: TabProps) => {
  const [logEntries, setLogEntries] = useState<UserLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - timestamp

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 2592000)}mo ago`
  }

  useEffect(() => {
    const fetchUserLog = async () => {
      try {
        setLoading(true)
        setError(null)
        const encodedUsername = encodeURIComponent(usernameToUrl(username))
        const response = await fetch(`${API_URL}/api/player/${encodedUsername}/log?page=1&limit=20`)

        if (response.ok) {
          const data: UserLogResponse = await response.json()
          setLogEntries(data.log_entries)
        } else {
          setError('Failed to fetch user log')
        }
      } catch (err) {
        console.error('Error fetching user log:', err)
        setError('Error loading user log')
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchUserLog()
    }
  }, [username, API_URL])

  if (loading) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Loading clan log...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Error loading log</p>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
      </div>
    )
  }

  if (logEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">No clan log entries</p>
        <p className="text-slate-500 text-sm mt-2">Rank changes and name changes will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <FileText className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Clan Log</h3>
        <span className="text-sm text-slate-400">({logEntries.length} entries)</span>
      </div>

      {logEntries.map((entry) => {
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
                style={getGradientStyle(entry.username, entry.new_rank || entry.old_rank || playerData?.clan_rank)}
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
      })}
    </div>
  )
}
