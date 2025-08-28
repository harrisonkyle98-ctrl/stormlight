import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Swords, Calendar, Trophy, Users, Plus } from 'lucide-react'

interface Competition {
  id: number
  name: string
  description: string
  skill: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  participants: string[]
}

interface CompetitionsData {
  competitions: Competition[]
}

const Competitions = () => {
  const [competitionsData, setCompetitionsData] = useState<CompetitionsData | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/competitions`)
      if (response.ok) {
        const data = await response.json()
        setCompetitionsData(data)
      }
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-blue-500' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSkillIcon = (skill: string) => {
    const icons: { [key: string]: string } = {
      overall: '⚔️',
      attack: '⚔️',
      defence: '🛡️',
      strength: '💪',
      constitution: '❤️',
      ranged: '🏹',
      prayer: '🙏',
      magic: '🔮',
      cooking: '🍳',
      woodcutting: '🪓',
      fletching: '🏹',
      fishing: '🎣',
      firemaking: '🔥',
      crafting: '🔨',
      smithing: '⚒️',
      mining: '⛏️',
      herblore: '🧪',
      agility: '🏃',
      thieving: '🗡️',
      slayer: '💀',
      farming: '🌱',
      runecrafting: '🔮',
      hunter: '🏹',
      construction: '🏠',
      summoning: '👹',
      dungeoneering: '🏰',
      divination: '✨',
      invention: '⚙️'
    }
    return icons[skill] || '📊'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading competitions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            <Swords className="inline-block w-8 h-8 mr-2 text-green-400" />
            Clan Competitions
          </h1>
          <p className="text-slate-300">
            Compete with your clan mates in XP-based challenges
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Competition
        </Button>
      </div>

      <div className="grid gap-6">
        {competitionsData?.competitions.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Competitions Yet</h3>
              <p className="text-slate-400 mb-4">
                Be the first to create a competition for your clan!
              </p>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Competition
              </Button>
            </CardContent>
          </Card>
        ) : (
          competitionsData?.competitions.map((competition) => {
            const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date)
            
            return (
              <Card key={competition.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getSkillIcon(competition.skill)}</div>
                      <div>
                        <CardTitle className="text-white text-xl">
                          {competition.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                          {competition.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${color} text-white capitalize`}>
                      {status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-400">Start Date</p>
                        <p className="text-white font-medium">
                          {formatDate(competition.start_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-400">End Date</p>
                        <p className="text-white font-medium">
                          {formatDate(competition.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-400">Participants</p>
                        <p className="text-white font-medium">
                          {competition.participants.length} members
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-slate-400">
                        Skill: <span className="text-white capitalize">{competition.skill}</span>
                      </span>
                    </div>
                    <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Link to={`/competitions/${competition.id}`}>
                        View Leaderboard
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Sample competitions for demonstration */}
      <div className="grid gap-6">
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🪓</div>
                <div>
                  <CardTitle className="text-white text-xl">
                    Woodcutting XP Week
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    See who can gain the most Woodcutting XP in one week!
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-500 text-white">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Start Date</p>
                  <p className="text-white font-medium">Aug 25, 2025</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">End Date</p>
                  <p className="text-white font-medium">Sep 1, 2025</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Participants</p>
                  <p className="text-white font-medium">8 members</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-400">
                  Skill: <span className="text-white">Woodcutting</span>
                </span>
              </div>
              <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link to="/competitions/1">
                  View Leaderboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">💀</div>
                <div>
                  <CardTitle className="text-white text-xl">
                    Slayer Showdown
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Monthly Slayer XP competition - who will be the ultimate slayer?
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-blue-500 text-white">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Start Date</p>
                  <p className="text-white font-medium">Sep 1, 2025</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">End Date</p>
                  <p className="text-white font-medium">Sep 30, 2025</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">Participants</p>
                  <p className="text-white font-medium">12 members</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-400">
                  Skill: <span className="text-white">Slayer</span>
                </span>
              </div>
              <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link to="/competitions/2">
                  View Leaderboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Competitions
