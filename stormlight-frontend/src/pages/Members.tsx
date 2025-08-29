import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Search, Users, User } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'

interface ClanMember {
  username: string
  clan_rank: string
  total_xp: number
  kills: number
  last_updated: string
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
  const [membersData, setMembersData] = useState<MembersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [sortBy, setSortBy] = useState('rank')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchMembers()
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
      }
    } catch (error) {
      console.error('Error fetching clan members:', error)
    } finally {
      setLoading(false)
    }
  }


  const getRankIcon = (rank: string) => {
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
    if (imageName) {
      return `/assets/ranks/${imageName}`
    }
    return null
  }


  const displayData = membersData?.members || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading clan members...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          <Users className="inline-block w-8 h-8 mr-2 text-blue-400" />
          Stormlight Clan Members
        </h1>
        <p className="text-slate-300">
          Meet the members of our RuneScape clan
        </p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
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
                  <SelectItem value="xp" className="text-white hover:bg-slate-600">Total XP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
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

      <div className="grid gap-4">
        {displayData.map((member, index) => {
          const memberRank = (currentPage - 1) * pageSize + index + 1
          return (
            <Card key={member.username} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        #{memberRank}
                      </Badge>
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(member.username.replace(/\s+/g, '%20'))}/chat.png`}
                          alt={member.username}
                        />
                        <AvatarFallback className="bg-blue-600 text-white">
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <Link 
                        to={`/clan-member/${encodeURIComponent(member.username.replace(/\u00A0/g, ' '))}`}
                        className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                      >
                        {member.username}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        {getRankIcon(member.clan_rank) ? (
                          <img 
                            src={getRankIcon(member.clan_rank)!} 
                            alt={member.clan_rank}
                            className="w-5 h-5"
                          />
                        ) : (
                          <span className="text-lg">👤</span>
                        )}
                        <p className="text-sm text-slate-400">{member.clan_rank}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-slate-400">Total XP</p>
                        <p className="text-xl font-bold text-green-400">
                          {member.total_xp.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Kills</p>
                        <p className="text-lg font-semibold text-red-400">
                          {member.kills.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No members found. Try searching for a specific member name.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Members
