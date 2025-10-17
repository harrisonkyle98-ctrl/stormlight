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
  startDate: string
  endDate: string
  createdBy: string
  createdAt: string
  participants: string[]
  participantCount?: number
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
          variant="default"
          className={activeTab === 'active' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/60 hover:bg-blue-600/80'}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Active
        </Button>
        <Button
          onClick={() => setActiveTab('upcoming')}
          variant="default"
          className={activeTab === 'upcoming' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/60 hover:bg-blue-600/80'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Upcoming
        </Button>
        <Button
          onClick={() => setActiveTab('ended')}
          variant="default"
          className={activeTab === 'ended' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/60 hover:bg-blue-600/80'}
        >
          <Users className="w-4 h-4 mr-2" />
          Completed
        </Button>
      </div>

      {competitions.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-6">
            {competitions.map((competition) => {
              const { status, color } = getCompetitionStatus(competition.startDate, competition.endDate)
              
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-400">Start Date</p>
                          <p className="text-white font-medium">
                            {formatDate(competition.startDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-400">End Date</p>
                          <p className="text-white font-medium">
                            {formatDate(competition.endDate)}
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
                      {competition.type === 'XP_GAIN' && competition.skill && (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4">
                            {getSkillIcon(competition.skill) ? (
                              <img 
                                src={getSkillIcon(competition.skill)!} 
                                alt={competition.skill}
                                className="w-4 h-4"
                              />
                            ) : (
                              <span className="text-slate-400">📊</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Skill</p>
                            <p className="text-white font-medium capitalize">
                              {competition.skill}
                            </p>
                          </div>
                        </div>
                      )}
                      {competition.type === 'BOSS_KILLS' && competition.boardSize && (
                        <div className="flex items-center space-x-2">
                          <Trophy className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-400">Grid Size</p>
                            <p className="text-white font-medium">
                              {competition.boardSize}×{competition.boardSize}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-400">Participants</p>
                          <p className="text-white font-medium">
                            {competition.participantCount || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                        <div className="flex items-center space-x-3 bg-blue-600 px-3 py-2 rounded-md">
                          <span className="text-sm text-white">Rewards:</span>
                          <div className="flex space-x-3 text-white text-sm">
                            {competition.rewardFirstGp && (
                              <div className="flex items-center space-x-1">
                                <span className="text-yellow-400 text-base">🥇</span>
                                <span className="text-green-400 font-bold">
                                  {(competition.rewardFirstGp / 1000000).toFixed(0)}M GP
                                </span>
                              </div>
                            )}
                            {competition.rewardSecondGp && (
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-300 text-base">🥈</span>
                                <span className="text-green-400 font-bold">
                                  {(competition.rewardSecondGp / 1000000).toFixed(0)}M GP
                                </span>
                              </div>
                            )}
                            {competition.rewardThirdGp && (
                              <div className="flex items-center space-x-1">
                                <span className="text-amber-400 text-base">🥉</span>
                                <span className="text-green-400 font-bold">
                                  {(competition.rewardThirdGp / 1000000).toFixed(0)}M GP
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700">
                          <Link to={`/competitions/${competition.id}`}>
                            View Leaderboard
                          </Link>
                        </Button>
                      </div>
                    )}
                    {!(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                      <div className="flex justify-end pt-4 border-t border-slate-700">
                        <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700">
                          <Link to={`/competitions/${competition.id}`}>
                            View Leaderboard
                          </Link>
                        </Button>
                      </div>
                    )}
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
