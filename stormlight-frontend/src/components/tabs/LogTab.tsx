import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'
import { getGradientStyle } from '../../utils/gradientUtils'
import { ClanLogRow } from '../clanLogs/ClanLogRow'

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

export const LogTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
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

      {logEntries.map((entry) => (
        <ClanLogRow
          key={entry.id}
          entry={entry}
          formatTimeAgo={formatTimeAgo}
          getGradientStyle={getGradientStyle}
          getRankIcon={getRankIcon}
          usernameToUrl={usernameToUrl}
          className="bg-slate-700/50"
        />
      ))}
    </div>
  )
}
