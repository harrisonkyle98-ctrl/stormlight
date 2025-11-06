import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table'
import { Users, Search, Calendar, TrendingUp, Crown, AlertCircle } from 'lucide-react'
import { Spinner } from '../ui/spinner'
import { checkPlayerMilestones, MilestoneBadge } from '../../utils/gradientUtils'

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
  const [activeMembersPage, setActiveMembersPage] = useState(1)
  const pageSize = 15

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
        } else {
          console.error('Failed to refresh rank tracking after join date update:', trackingResponse.status)
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

  const isLeadershipRank = (rank: string): boolean => {
    return ['Owner', 'Deputy Owner', 'Overseer'].includes(rank)
  }

  const getRankBadgeMeta = (rank: string, username?: string): MilestoneBadge | null => {
    const badges = checkPlayerMilestones(null, undefined, rank, username)
    return badges.length > 0 ? badges[0] : null
  }

  const renderRankBadge = (rank: string, username?: string) => {
    const badge = getRankBadgeMeta(rank, username)
    if (!badge) {
      return <span className="text-white">{rank}</span>
    }
    
    return (
      <div
        className="inline-flex w-fit shrink-0 px-2 py-1 text-xs font-semibold items-center gap-1 rounded-md text-white"
        style={{
          background: badge.gradientBackground || badge.backgroundColor
        }}
        title={badge.name}
      >
        <img
          src={badge.icon}
          alt={badge.name}
          className="w-3 h-3"
        />
        <span>{badge.name}</span>
      </div>
    )
  }

  const dueForPromotionSet = useMemo(() => 
    new Set(dueForPromotionMembers.map(m => m.username)), 
    [dueForPromotionMembers]
  )

  const filteredAndSortedTracking = rankTracking
    .filter(tracking => tracking.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => getRankPriority(a.actualRank) - getRankPriority(b.actualRank))

  const leadershipMembers = filteredAndSortedTracking.filter(t => isLeadershipRank(t.actualRank))
  const dueForPromotionMembers = filteredAndSortedTracking.filter(t => 
    !isLeadershipRank(t.actualRank) && t.dueForPromotion
  )
  const activeMembers = filteredAndSortedTracking.filter(t => 
    !isLeadershipRank(t.actualRank) && !t.dueForPromotion
  )

  const totalActivePages = Math.ceil(activeMembers.length / pageSize)
  const startIdx = (activeMembersPage - 1) * pageSize
  const paginatedActiveMembers = activeMembers.slice(startIdx, startIdx + pageSize)

  const dueForPromotionCount = rankTracking.filter(t => 
    !isLeadershipRank(t.actualRank) && t.dueForPromotion
  ).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Spinner size="md" />
        <div className="text-center text-slate-400">Loading rank tracking data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Rank Tracking &amp; Longevity</h2>
        <div className="flex items-center space-x-2">
          <Badge className="bg-[#be9a55] text-white">
            {dueForPromotionCount} Due for Promotion
          </Badge>
        </div>
      </div>

      {/* Promotion Notification Card */}
      {dueForPromotionCount > 0 && (
        <Card className="bg-yellow-500/15 border border-yellow-500">
          <CardContent className="p-3">
            <div className="flex items-center text-sm text-yellow-200">
              <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 shrink-0" />
              <span>
                {dueForPromotionCount} {dueForPromotionCount === 1 ? 'member is' : 'members are'} due for a promotion. Please resolve in-game.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Section 1: Members Due for Promotion */}
      {dueForPromotionMembers.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#be9a55]" />
              <span>Members Due for Promotion</span>
              <Badge className="bg-[#be9a55] text-white ml-2">
                {dueForPromotionMembers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Member</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Actual Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank Needed</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Join Date</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Days in Clan</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueForPromotionMembers.map((tracking) => (
                  <TableRow key={tracking.username} className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{tracking.username}</span>
                        <Badge className="bg-[#be9a55] text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Due
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {renderRankBadge(tracking.actualRank, tracking.username)}
                    </TableCell>
                    <TableCell className="py-3">
                      {renderRankBadge(tracking.rankNeeded, tracking.username)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-slate-300">
                        {tracking.joinDate 
                          ? new Date(tracking.joinDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-theme-accent-light font-medium">{tracking.daysInClan}</span>
                    </TableCell>
                    <TableCell className="py-3">
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
                            onClick={() => {
                              setEditingMember(null)
                              setEditJoinDate('')
                            }}
                            className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
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
                          className="flex items-center space-x-1 bg-theme-button hover:bg-theme-button-hover border-theme-accent text-white"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 2: All Active Members */}
      {activeMembers.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-theme-accent-light" />
              <span>All Active Members</span>
              <Badge className="bg-slate-600 text-white ml-2">
                {activeMembers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Member</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Actual Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank Needed</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Join Date</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Days in Clan</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedActiveMembers.map((tracking) => (
                  <TableRow key={tracking.username} className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-medium">{tracking.username}</span>
                        {dueForPromotionSet.has(tracking.username) && (
                          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {renderRankBadge(tracking.actualRank, tracking.username)}
                    </TableCell>
                    <TableCell className="py-3">
                      {renderRankBadge(tracking.rankNeeded, tracking.username)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-slate-300">
                        {tracking.joinDate 
                          ? new Date(tracking.joinDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-theme-accent-light font-medium">{tracking.daysInClan}</span>
                    </TableCell>
                    <TableCell className="py-3">
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
                            onClick={() => {
                              setEditingMember(null)
                              setEditJoinDate('')
                            }}
                            className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
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
                          className="flex items-center space-x-1 bg-theme-button hover:bg-theme-button-hover border-theme-accent text-white"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalActivePages > 1 && (
              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-slate-600">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveMembersPage(p => Math.max(1, p - 1))}
                  disabled={activeMembersPage === 1}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {activeMembersPage} of {totalActivePages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveMembersPage(p => Math.min(totalActivePages, p + 1))}
                  disabled={activeMembersPage === totalActivePages}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Leadership Ranks */}
      {leadershipMembers.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Crown className="w-5 h-5 text-[#be9a55]" />
              <span>Leadership Ranks</span>
              <Badge className="bg-[#be9a55] text-white ml-2">
                {leadershipMembers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-slate-300">
              <TableHeader>
                <TableRow className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Member</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Rank</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Status</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Join Date</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Days in Clan</TableHead>
                  <TableHead className="text-slate-400 font-medium py-3 h-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadershipMembers.map((tracking) => (
                  <TableRow key={tracking.username} className="border-b border-[rgba(51,65,85,0.6)] hover:bg-slate-800/50">
                    <TableCell className="py-3">
                      <span className="text-white font-medium">{tracking.username}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      {renderRankBadge(tracking.actualRank, tracking.username)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="bg-[#be9a55] text-white pointer-events-none">Leadership</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-slate-300">
                        {tracking.joinDate 
                          ? new Date(tracking.joinDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-theme-accent-light font-medium">{tracking.daysInClan}</span>
                    </TableCell>
                    <TableCell className="py-3">
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
                            onClick={() => {
                              setEditingMember(null)
                              setEditJoinDate('')
                            }}
                            className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
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
                          className="flex items-center space-x-1 bg-theme-button hover:bg-theme-button-hover border-theme-accent text-white"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
