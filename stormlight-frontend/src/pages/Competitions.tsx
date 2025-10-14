import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Trophy, Calendar, Users } from 'lucide-react'
import { getSkillIcon } from '../utils/skillIcons'

interface Competition {
  id: string
  name: string
  description: string
  type: 'XP_GAIN' | 'BOSS_KILLS'
  skill?: string
  boardSize?: number
  dropsGrid?: any[]
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  participants: string[]
  rewardFirstGp?: number
  rewardSecondGp?: number
  rewardThirdGp?: number
  rewardBadgeId?: string
}

interface CompetitionsData {
  competitions: Competition[]
}

const getCompetitionTypeLabel = (type: string): string => {
  if (type === 'XP_GAIN') return 'Skilling'
  if (type === 'BOSS_KILLS') return 'PvM'
  return type
}

const Competitions = () => {
  const [competitionsData, setCompetitionsData] = useState<CompetitionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCompetitions()
  }, [activeTab])

  const fetchCompetitions = async () => {
    try {
      setLoading(true)
      const statusParam = activeTab ? `?status=${activeTab}` : ''
      const response = await fetch(`${API_URL}/api/competitions${statusParam}`)
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

  const competitions = competitionsData?.competitions || []

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

      <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg justify-center">
        <Button
          onClick={() => setActiveTab('active')}
          variant={activeTab === 'active' ? 'default' : 'outline'}
          className={activeTab === 'active' ? 'bg-green-600 hover:bg-green-700' : 'text-white border-slate-600'}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Active
        </Button>
        <Button
          onClick={() => setActiveTab('upcoming')}
          variant={activeTab === 'upcoming' ? 'default' : 'outline'}
          className={activeTab === 'upcoming' ? 'bg-blue-600 hover:bg-blue-700' : 'text-white border-slate-600'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Upcoming
        </Button>
        <Button
          onClick={() => setActiveTab('ended')}
          variant={activeTab === 'ended' ? 'default' : 'outline'}
          className={activeTab === 'ended' ? 'bg-gray-600 hover:bg-gray-700' : 'text-white border-slate-600'}
        >
          <Users className="w-4 h-4 mr-2" />
          Completed
        </Button>
      </div>

      {competitions.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-6">
            {competitions.map((competition) => {
              const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date)
              
              return (
                <Card key={competition.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {competition.type === 'XP_GAIN' ? (
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
                          <p className="text-white font-medium">
                            {getCompetitionTypeLabel(competition.type)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex flex-col space-y-2">
                        {competition.type === 'BOSS_KILLS' && competition.boardSize && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-400">Grid Size:</span>
                            <span className="text-white font-medium">
                              {competition.boardSize}x{competition.boardSize}
                            </span>
                          </div>
                        )}
                        {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                          <div className="flex items-center space-x-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-slate-400">Rewards:</span>
                            <div className="flex space-x-3 text-white text-sm">
                              {competition.rewardFirstGp && (
                                <span className="text-yellow-400 font-bold">
                                  1st: {(competition.rewardFirstGp / 1000000).toFixed(0)}M GP
                                </span>
                              )}
                              {competition.rewardSecondGp && (
                                <span className="text-gray-300">
                                  2nd: {(competition.rewardSecondGp / 1000000).toFixed(0)}M GP
                                </span>
                              )}
                              {competition.rewardThirdGp && (
                                <span className="text-amber-600">
                                  3rd: {(competition.rewardThirdGp / 1000000).toFixed(0)}M GP
                                </span>
                              )}
                            </div>
                          </div>
                        )}
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

      {competitions.length === 0 && !loading && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No {activeTab} competitions found
            </h3>
            <p className="text-slate-400">
              Check back later for new competitions!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Competitions
