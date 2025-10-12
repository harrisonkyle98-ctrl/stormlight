import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Users, Search, LogIn, LogOut, Filter } from 'lucide-react'

interface ClanLogEntry {
  id: number
  username: string
  event_type: string
  old_rank?: string
  new_rank?: string
  timestamp: string
}

export const MemberLogTab = () => {
  const [logEntries, setLogEntries] = useState<ClanLogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ClanLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'Join' | 'Leave'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const pageSize = 20

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
        `${API_URL}/api/clan/log?page=${currentPage}&limit=${pageSize}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const joinLeaveEntries = (data.log_entries || []).filter(
          (entry: ClanLogEntry) => entry.event_type === 'Join' || entry.event_type === 'Leave'
        )
        setLogEntries(joinLeaveEntries)
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

  const getEventIcon = (eventType: string) => {
    return eventType === 'Join' ? (
      <LogIn className="w-4 h-4 text-green-400" />
    ) : (
      <LogOut className="w-4 h-4 text-red-400" />
    )
  }

  const getEventBadge = (eventType: string) => {
    return eventType === 'Join' ? (
      <Badge className="bg-green-600 text-white">Join</Badge>
    ) : (
      <Badge className="bg-red-600 text-white">Leave</Badge>
    )
  }

  const totalPages = Math.ceil(totalEntries / pageSize)

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading member log...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Member Activity Log</h2>
        <div className="flex items-center space-x-2">
          <Badge className="bg-slate-700 text-white">
            {totalEntries} Total Events
          </Badge>
        </div>
      </div>

      <Card className="bg-slate-700/30 border-slate-600">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Join & Leave Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No member activity found</p>
          ) : (
            <>
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-slate-600/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getEventIcon(entry.event_type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{entry.username}</span>
                          {getEventBadge(entry.event_type)}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {entry.event_type === 'Join' && entry.new_rank && (
                            <span>Joined as {entry.new_rank}</span>
                          )}
                          {entry.event_type === 'Leave' && entry.old_rank && (
                            <span>Left clan (was {entry.old_rank})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
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
        </CardContent>
      </Card>
    </div>
  )
}
