import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Users, Search, Filter, UserMinus } from 'lucide-react'
import { Spinner } from '../ui/spinner'
import { ClanLogRow } from '../clanLogs/ClanLogRow'
import { usernameToUrl } from '../../utils/urlUtils'
import { useToast } from '../../hooks/use-toast'
import '../../styles/fantasy-container.css'

interface ClanLogEntry {
  id: number
  username: string
  event_type: string
  old_rank?: string
  new_rank?: string
  timestamp: string
}

interface LeaveDetectionResult {
  status: string
  error?: string
  members_marked_left: number
  members_marked_left_details?: Array<{ username: string; previous_rank: string }>
  members_unchanged: number
  api_count?: number
  db_active_count?: number
}

export const MemberLogTab = () => {
  const [logEntries, setLogEntries] = useState<ClanLogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ClanLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'Join' | 'Leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [runningLeaveDetection, setRunningLeaveDetection] = useState(false)
  const pageSize = 20
  const { toast } = useToast()

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchClanLog()
  }, [currentPage])

  useEffect(() => {
    applyFilters()
  }, [logEntries, searchTerm, eventFilter])

  const fetchClanLog = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/clan/log?page=${currentPage}&limit=${pageSize}&event_types=join,leave`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setLogEntries(data.log_entries || [])
        setTotalEntries(data.pagination?.total_entries || 0)
      } else {
        console.error('Failed to fetch clan log:', response.status)
      }
    } catch (error) {
      console.error('Error fetching clan log:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = logEntries

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (eventFilter !== 'all') {
      filtered = filtered.filter(entry => entry.event_type === eventFilter)
    }

    setFilteredEntries(filtered)
  }

  const formatTimeAgo = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const runLeaveDetection = async () => {
    try {
      setRunningLeaveDetection(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/detect-leaves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result: LeaveDetectionResult = await response.json()
        
        if (result.status === 'success') {
          const leftCount = result.members_marked_left
          const unchangedCount = result.members_unchanged
          
          if (leftCount > 0) {
            const leftNames = result.members_marked_left_details?.map(m => m.username).join(', ') || ''
            toast({
              title: 'Leave Detection Complete',
              description: `Detected ${leftCount} member(s) who left: ${leftNames}. ${unchangedCount} members unchanged.`,
              variant: 'default'
            })
          } else {
            toast({
              title: 'Leave Detection Complete',
              description: `No members have left. ${unchangedCount} active members verified.`,
              variant: 'default'
            })
          }
          
          setCurrentPage(1)
          await fetchClanLog()
        } else {
          toast({
            title: 'Leave Detection Failed',
            description: result.error || 'Unknown error occurred',
            variant: 'destructive'
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: 'Leave Detection Failed',
          description: errorData.detail || `Server error: ${response.status}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error running leave detection:', error)
      toast({
        title: 'Leave Detection Failed',
        description: 'Network error - please try again',
        variant: 'destructive'
      })
    } finally {
      setRunningLeaveDetection(false)
    }
  }

  const totalPages = Math.ceil(totalEntries / pageSize)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Spinner size="md" />
        <div className="text-center text-slate-400">Loading member log...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Member Activity Log</h2>
        <div className="flex items-center space-x-3">
          <Button
            onClick={runLeaveDetection}
            disabled={runningLeaveDetection}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {runningLeaveDetection ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Detecting...
              </>
            ) : (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Run Leave Detection
              </>
            )}
          </Button>
          <Badge className="bg-slate-700 text-white">
            {totalEntries} Total Events
          </Badge>
        </div>
      </div>

      <div className="fantasy-section">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="pl-10 bg-slate-600 border-slate-500 text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value as 'all' | 'Join' | 'Leave')}
              className="bg-slate-600 border-slate-500 text-white rounded px-3 py-2"
            >
              <option value="all">All Events</option>
              <option value="Join">Joins Only</option>
              <option value="Leave">Leaves Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="fantasy-section">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Join & Leave Activity</h3>
        </div>
        {filteredEntries.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No member activity found</p>
        ) : (
          <>
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <ClanLogRow
                  key={entry.id}
                  entry={entry}
                  formatTimeAgo={formatTimeAgo}
                  usernameToUrl={usernameToUrl}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Previous
                </Button>
                <span className="text-white text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Last
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
