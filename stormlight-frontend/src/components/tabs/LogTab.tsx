import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usernameToUrl } from '../../utils/urlUtils'
import { getGradientStyle } from '../../utils/gradientUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface UserLogEntry {
  id: number
  username: string
  event_type: 'join' | 'leave' | 'rank_up' | 'name_change'
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
        <p className="text-slate-400 text-lg">Loading activity log...</p>
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
        <p className="text-slate-400 text-lg">No activity log entries</p>
        <p className="text-slate-500 text-sm mt-2">Rank changes and name changes will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <FileText className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Activity Log</h3>
        <span className="text-sm text-slate-400">({logEntries.length} entries)</span>
      </div>
      
      {logEntries.map((entry) => (
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
              style={getGradientStyle(entry.username, entry.new_rank || entry.old_rank || playerData?.clan_rank)}
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
      ))}
    </div>
  )
}
