import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Trophy, Calendar, Users, Plus } from 'lucide-react'
import { getSkillIcon } from '../utils/skillIcons'

interface Competition {
  id: number
  name: string
  description: string
  type: 'xp' | 'drops'
  skill?: string
  boss?: string
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'xp' | 'drops'>('all')

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


  const filteredCompetitions = competitionsData?.competitions.filter(comp => {
    if (typeFilter === 'all') return true
    return comp.type === typeFilter
  }) || []

  const activeCompetitions = filteredCompetitions.filter(comp => {
    const { status } = getCompetitionStatus(comp.start_date, comp.end_date)
    return status === 'active' || status === 'upcoming'
  })

  const pastCompetitions = filteredCompetitions.filter(comp => {
    const { status } = getCompetitionStatus(comp.start_date, comp.end_date)
    return status === 'ended'
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading competitions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          <Trophy className="inline-block w-8 h-8 mr-2 text-green-400" />
          Clan Competitions
        </h1>
        <p className="text-slate-300">
          Compete with your clan mates in XP and Drop challenges
        </p>
      </div>

      <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
        <span className="text-slate-300 font-medium">Filter by type:</span>
        <div className="flex space-x-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className={typeFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
          >
            All
          </Button>
          <Button
            variant={typeFilter === 'xp' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('xp')}
            className={typeFilter === 'xp' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
          >
            XP
          </Button>
          <Button
            variant={typeFilter === 'drops' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('drops')}
            className={typeFilter === 'drops' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
          >
            Drops
          </Button>
        </div>
      </div>

      {activeCompetitions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Active Competitions</h2>
          <div className="grid gap-6">
            {activeCompetitions.map((competition) => {
              const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date)
              
              return (
                <Card key={competition.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {competition.type === 'xp' ? (
                          getSkillIcon(competition.skill || 'overall') ? (
                            <img 
                              src={getSkillIcon(competition.skill || 'overall')!} 
                              alt={competition.skill}
                              className="w-6 h-6"
                            />
                          ) : (
                            <div className="text-2xl">📊</div>
                          )
                        ) : (
                          <div className="text-2xl">💀</div>
                        )}
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
                          <p className="text-sm text-slate-400">Type</p>
                          <p className="text-white font-medium capitalize">
                            {competition.type}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-slate-400">
                          {competition.type === 'xp' ? 'Skill' : 'Boss'}: 
                          <span className="text-white capitalize ml-1">
                            {competition.type === 'xp' 
                              ? competition.skill 
                              : competition.boss || 'All bosses'
                            }
                          </span>
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
            })}
          </div>
        </div>
      )}

      {pastCompetitions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Past Competitions</h2>
          <div className="grid gap-6">
            {pastCompetitions.map((competition) => {
              const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date)
              
              return (
                <Card key={competition.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {competition.type === 'xp' ? (
                          getSkillIcon(competition.skill || 'overall') ? (
                            <img 
                              src={getSkillIcon(competition.skill || 'overall')!} 
                              alt={competition.skill}
                              className="w-6 h-6"
                            />
                          ) : (
                            <div className="text-2xl">📊</div>
                          )
                        ) : (
                          <div className="text-2xl">💀</div>
                        )}
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
                          <p className="text-sm text-slate-400">Type</p>
                          <p className="text-white font-medium capitalize">
                            {competition.type}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-slate-400">
                          {competition.type === 'xp' ? 'Skill' : 'Boss'}: 
                          <span className="text-white capitalize ml-1">
                            {competition.type === 'xp' 
                              ? competition.skill 
                              : competition.boss || 'All bosses'
                            }
                          </span>
                        </span>
                      </div>
                      <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                        <Link to={`/competitions/${competition.id}`}>
                          View Final Results
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {filteredCompetitions.length === 0 && (
        <div className="grid gap-6">
          {competitionsData?.competitions.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 text-center">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No {typeFilter} competitions found</h3>
                <p className="text-slate-400 mb-4">
                  Try adjusting your filter or check back later for new competitions!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default Competitions
