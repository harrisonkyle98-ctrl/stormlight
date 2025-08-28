import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Search, Trophy, User } from 'lucide-react'

interface PlayerStats {
  username: string
  stats: {
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
    }
  }
  last_updated: string
}

interface HiscoresData {
  hiscores: PlayerStats[]
  pagination: {
    page: number
    limit: number
    total_players: number
    has_next: boolean
  }
  skill: string
}

const Hiscores = () => {
  const [hiscoresData, setHiscoresData] = useState<HiscoresData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('overall')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchHiscores()
  }, [sortBy, currentPage, pageSize, searchQuery])

  const fetchHiscores = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        skill: sortBy,
        page: currentPage.toString(),
        limit: pageSize.toString()
      })
      
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      
      const response = await fetch(`${API_URL}/api/hiscores?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHiscoresData(data)
      }
    } catch (error) {
      console.error('Error fetching hiscores:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const displayData = hiscoresData?.hiscores || []

  const skills = [
    'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
    'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'summoning',
    'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading hiscores...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          <Trophy className="inline-block w-8 h-8 mr-2 text-yellow-400" />
          RuneScape Global Hiscores
        </h1>
        <p className="text-slate-300">
          Discover and compete with RuneScape players worldwide
        </p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Filter & Sort</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search players..."
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
            <div className="md:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Sort by skill" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {skills.map(skill => (
                    <SelectItem key={skill} value={skill} className="text-white hover:bg-slate-600">
                      {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    </SelectItem>
                  ))}
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
                disabled={!hiscoresData?.pagination?.has_next}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {displayData.map((player, index) => {
          const skillData = player.stats[sortBy] || { level: 1, xp: 0, rank: null }
          const globalRank = (currentPage - 1) * pageSize + index + 1
          return (
            <Card key={player.username} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        #{globalRank}
                      </Badge>
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <Link 
                        to={`/player/${player.username}`}
                        className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                      >
                        {player.username}
                      </Link>
                      <p className="text-sm text-slate-400">
                        Last updated: {new Date(player.last_updated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-slate-400">Level</p>
                        <p className="text-xl font-bold text-white">{skillData.level}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">XP</p>
                        <p className="text-xl font-bold text-green-400">
                          {formatNumber(skillData.xp)}
                        </p>
                      </div>
                      {skillData.rank && (
                        <div>
                          <p className="text-sm text-slate-400">Rank</p>
                          <p className="text-lg font-semibold text-blue-400">
                            #{skillData.rank.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {displayData.length === 0 && !loading && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No players found. Try searching for a specific RuneScape username.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Hiscores
