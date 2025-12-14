import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Search, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Spinner } from '../components/ui/spinner'
import { MilestoneBadge, checkPlayerMilestones } from '../utils/gradientUtils'
import { usernameToUrl } from '../utils/urlUtils'
import { Username } from '../components/ui/username'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import { usePageTitle } from '../hooks/usePageTitle'
import '../styles/fantasy-container.css'



interface ClanMember {
  username: string
  clan_rank: string
  total_xp: number
  kills: number
  last_updated: string
  badges?: MilestoneBadge[]
}

interface MemberWithBadges extends ClanMember {
  badges: MilestoneBadge[]
  badgesLoading: boolean
}

interface MembersData {
  members: ClanMember[]
  pagination: {
    page: number
    limit: number
    total_members: number
    has_next: boolean
  }
  clan_name: string
}

const Members = () => {
  usePageTitle('Members')
  const [membersData, setMembersData] = useState<MembersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [sortBy, setSortBy] = useState('rank')
  const [membersWithBadges, setMembersWithBadges] = useState<MemberWithBadges[]>([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const t0 = performance.now()
    fetchMembers().finally(() => {
      const ms = Math.round(performance.now() - t0)
      console.log(`[Perf] Members page fetch+init took ${ms} ms (page=${currentPage}, size=${pageSize}, sort=${sortBy}, search='${searchQuery}')`)
    })
  }, [currentPage, pageSize, searchQuery, sortBy])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sort_by: sortBy
      })

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const response = await fetch(`${API_URL}/api/clan/members?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMembersData(data)

        const membersWithBadgesInit: MemberWithBadges[] = data.members.map((member: ClanMember & { badges?: MilestoneBadge[] }) => {
          const serverRankBadge = (member.badges || []).find(b => b.id?.startsWith('rank-'))
          const computedRankBadges = checkPlayerMilestones(null, null, member.clan_rank, member.username)
          const rankBadge = serverRankBadge || (computedRankBadges.length ? computedRankBadges[0] : undefined)

          return {
            ...member,
            badges: rankBadge ? [rankBadge] : [],
            badgesLoading: false,
          }
        })
        setMembersWithBadges(membersWithBadgesInit)
      }
    } catch (error) {
      console.error('Error fetching clan members:', error)
    } finally {
      setLoading(false)
    }
  }






  const displayData = useMemo(() => membersWithBadges || [], [membersWithBadges])

  if (loading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading clan members...</div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Global Profile Header - unified component for all pages */}
      <GlobalProfileHeader />

      {/* Main Content Container */}
      <div className="fantasy-container">
        {/* Members Banner Header - magenta/red-pink theme */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--members">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Members</h1>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="fantasy-content">
          {/* Search and Sort Section */}
          <div className="fantasy-section space-y-6">
                        <Card className="members-card bg-slate-800/50 border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-white">Search Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSearchQuery(searchTerm)
                            setCurrentPage(1)
                          }
                        }}
                        className="pl-10 bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm">Sort by:</span>
                    <Select value={sortBy} onValueChange={(value) => {
                      setSortBy(value)
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="rank" className="text-white hover:bg-slate-600">Rank</SelectItem>
                        <SelectItem value="xp" className="text-white hover:bg-slate-600">Clan XP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

                        <Card className="members-card bg-slate-800/50 border-slate-700">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                              <div className="flex items-center space-x-4">
                                <span className="text-white text-sm">Results per page:</span>
                                <Select value={pageSize.toString()} onValueChange={(value) => {
                                  setPageSize(parseInt(value))
                                  setCurrentPage(1)
                                }}>
                                  <SelectTrigger className="w-20 bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="15" className="text-white hover:bg-slate-600">15</SelectItem>
                                    <SelectItem value="30" className="text-white hover:bg-slate-600">30</SelectItem>
                                    <SelectItem value="50" className="text-white hover:bg-slate-600">50</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center space-x-2">
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
                                  Page {currentPage}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(currentPage + 1)}
                                  disabled={!membersData?.pagination?.has_next}
                                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                                >
                                  Next
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (membersData?.pagination?.total_members) {
                                      const totalPages = Math.ceil(membersData.pagination.total_members / pageSize)
                                      setCurrentPage(totalPages)
                                    }
                                  }}
                                  disabled={!membersData?.pagination?.has_next}
                                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                                >
                                  Last
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="space-y-2">
              {displayData.map((member, index) => {
                const memberRank = (currentPage - 1) * pageSize + index + 1
                return (
                  <div
                    key={member.username}
                    className="flex items-center justify-between p-3 transition-colors bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/50"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center rounded text-sm font-bold bg-slate-700/50 text-slate-400 border border-slate-600/50">
                        #{memberRank}
                      </div>
                      
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage
                          src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(member.username.replace(/\u00A0/g, ' '))}/chat.png`}
                          alt={member.username}
                        />
                        <AvatarFallback className="bg-slate-700 text-slate-400">
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Username and Rank Badge */}
                      <div className="flex flex-col items-start">
                        <Link 
                          to={`/clan-member/${usernameToUrl(member.username)}`}
                          className="font-medium hover:text-theme-accent-light transition-colors text-left"
                        >
                          <Username
                            username={member.username}
                            clanRank={member.clan_rank}
                          />
                        </Link>
                        {/* Rank Badge - directly under username */}
                        <div className="flex items-center mt-1">
                          {member.badgesLoading ? (
                            <div className="w-20 h-6 bg-slate-600 rounded animate-pulse"></div>
                          ) : member.badges.length > 0 ? (
                            (() => {
                              const rankBadge = member.badges[0]
                              return (
                                <div
                                  className="px-2 py-1 text-xs font-semibold flex items-center gap-1 rounded-md text-white"
                                  style={{
                                    background: rankBadge.gradientBackground || rankBadge.backgroundColor
                                  }}
                                  title={rankBadge.name}
                                >
                                  <img
                                    src={rankBadge.icon}
                                    alt={rankBadge.name}
                                    className="w-3 h-3"
                                  />
                                  <span>{rankBadge.name}</span>
                                </div>
                              )
                            })()
                          ) : (
                            <div className="px-2 py-1 text-xs font-semibold flex items-center gap-1 rounded-md text-white bg-slate-600">
                              <span>{member.clan_rank || 'Member'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Clan XP */}
                      <div className="text-right min-w-[80px]">
                        <p className="text-sm text-slate-400">Clan XP</p>
                        <p className="text-lg font-bold text-green-400">{member.total_xp.toLocaleString()}</p>
                      </div>
                      
                      {/* Kills */}
                      <div className="text-right min-w-[60px]">
                        <p className="text-sm text-slate-400">Kills</p>
                        <p className="text-lg font-bold text-red-400">{member.kills.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
                      </div>

                      <Card className="members-card bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center space-x-4">
                              <span className="text-white text-sm">Results per page:</span>
                              <Select value={pageSize.toString()} onValueChange={(value) => {
                                setPageSize(parseInt(value))
                                setCurrentPage(1)
                              }}>
                                <SelectTrigger className="w-20 bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="15" className="text-white hover:bg-slate-600">15</SelectItem>
                                  <SelectItem value="30" className="text-white hover:bg-slate-600">30</SelectItem>
                                  <SelectItem value="50" className="text-white hover:bg-slate-600">50</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2">
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
                                Page {currentPage}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={!membersData?.pagination?.has_next}
                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                              >
                                Next
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (membersData?.pagination?.total_members) {
                                    const totalPages = Math.ceil(membersData.pagination.total_members / pageSize)
                                    setCurrentPage(totalPages)
                                  }
                                }}
                                disabled={!membersData?.pagination?.has_next}
                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                              >
                                Last
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {displayData.length === 0 && !loading && (
                      <Card className="members-card bg-slate-800/50 border-slate-700">
                        <CardContent className="p-8 text-center">
                          <p className="text-slate-400">No members found. Try searching for a specific member name.</p>
                        </CardContent>
                      </Card>
                    )}
          </div>{/* End fantasy-section */}
        </div>{/* End fantasy-content */}
      </div>{/* End fantasy-container */}
    </>
  )
}

export default Members
