import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Users, Search, Calendar, TrendingUp } from 'lucide-react'

interface ClanMember {
  id: string
  username: string
  clanRank: string
  joinDate?: string
  totalXp: number
  lastUpdated: string
}

interface RankTracking {
  username: string
  actualRank: string
  rankNeeded: string
  joinDate?: string
  daysInClan: number
  dueForPromotion: boolean
}

export const RankTrackingTab = () => {
  const [members, setMembers] = useState<ClanMember[]>([])
  const [rankTracking, setRankTracking] = useState<RankTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editJoinDate, setEditJoinDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchMembersAndTracking()
  }, [])

  const fetchMembersAndTracking = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const [membersResponse, trackingResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/rank-tracking`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.members || [])
      } else {
        console.error('Failed to fetch members:', membersResponse.status)
      }

      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json()
        setRankTracking(trackingData.tracking || [])
      } else {
        console.error('Failed to fetch rank tracking:', trackingResponse.status)
      }
    } catch (error) {
      console.error('Error fetching rank tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateJoinDate = async (username: string, joinDate: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/members/${encodeURIComponent(username)}/join-date`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ join_date: joinDate })
      })

      if (response.ok) {
        const trackingResponse = await fetch(`${API_URL}/api/admin/rank-tracking`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (trackingResponse.ok) {
          const trackingData = await trackingResponse.json()
          setRankTracking(trackingData.tracking || [])
        }
        
        setEditingMember(null)
        setEditJoinDate('')
      } else {
        console.error('Failed to update join date:', response.status)
      }
    } catch (error) {
      console.error('Error updating join date:', error)
    }
  }

  const startEditJoinDate = (member: ClanMember) => {
    setEditingMember(member.username)
    setEditJoinDate(member.joinDate ? member.joinDate.split('T')[0] : '')
  }

  const getRankPriority = (rank: string): number => {
    const rankPriority: { [key: string]: number } = {
      'Owner': 1, 'Deputy Owner': 2, 'Overseer': 3, 'Coordinator': 4,
      'Organiser': 5, 'Admin': 6, 'General': 7, 'Captain': 8,
      'Lieutenant': 9, 'Sergeant': 10, 'Corporal': 11, 'Recruit': 12
    }
    return rankPriority[rank] || 999
  }

  const filteredAndSortedTracking = rankTracking
    .filter(tracking => tracking.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => getRankPriority(a.actualRank) - getRankPriority(b.actualRank))

  const totalItems = filteredAndSortedTracking.length
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTracking = filteredAndSortedTracking.slice(startIndex, startIndex + pageSize)
  const totalPages = Math.ceil(totalItems / pageSize)

  const dueForPromotionCount = rankTracking.filter(t => t.dueForPromotion).length

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading rank tracking data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Rank Tracking &amp; Longevity</h2>
        <div className="flex items-center space-x-2">
          <Badge className="bg-yellow-600 text-white">
            {dueForPromotionCount} Due for Promotion
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="pl-10 bg-slate-600 border-slate-500 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rank Tracking List */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Member Rank Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedTracking.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No members found</p>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-sm">
                  Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} members
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="bg-slate-600 border-slate-500 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-3">
                {paginatedTracking.map((tracking) => (
                <div key={tracking.username} className="p-4 bg-slate-600/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-white font-medium">{tracking.username}</h3>
                      {tracking.dueForPromotion && (
                        <Badge className="bg-yellow-600 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Due for Promotion
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingMember === tracking.username ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="date"
                            value={editJoinDate}
                            onChange={(e) => setEditJoinDate(e.target.value)}
                            className="bg-slate-600 border-slate-500 text-white w-40"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateJoinDate(tracking.username, editJoinDate)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMember(null)
                              setEditJoinDate('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const member = members.find(m => m.username === tracking.username)
                            if (member) startEditJoinDate(member)
                          }}
                          className="flex items-center space-x-1"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Edit Join Date</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Actual Rank:</span>
                      <div className="text-white font-medium">{tracking.actualRank}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Rank Needed:</span>
                      <div className="text-white font-medium">{tracking.rankNeeded}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Join Date:</span>
                      <div className="text-white">
                        {tracking.joinDate 
                          ? new Date(tracking.joinDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Days in Clan:</span>
                      <div className="text-white font-medium">{tracking.daysInClan}</div>
                    </div>
                  </div>
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

      {/* Longevity Rules */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Longevity Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">2+ years:</span>
              <span className="text-white">Coordinator</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">1.5+ years:</span>
              <span className="text-white">Organiser</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">1+ year:</span>
              <span className="text-white">Admin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">9+ months:</span>
              <span className="text-white">General</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">6+ months:</span>
              <span className="text-white">Captain</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">3+ months:</span>
              <span className="text-white">Lieutenant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">2+ months:</span>
              <span className="text-white">Sergeant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">1+ month:</span>
              <span className="text-white">Corporal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Entry:</span>
              <span className="text-white">Recruit</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
