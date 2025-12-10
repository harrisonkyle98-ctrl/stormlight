import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Trophy, Calendar, Users, BarChart3 } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import { getSkillIcon } from '../utils/skillIcons'
import { useAuth } from '../contexts/AuthContext'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import '../styles/fantasy-container.css'

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

const getCompetitionTypeLabel= (type: string): string => {
  if (type === 'XP_GAIN') return 'Skilling'
  if (type === 'BOSS_KILLS') return 'PvM'
  return type
}

const Competitions = () => {
  const { user } = useAuth()
  const [competitionsData, setCompetitionsData] = useState<CompetitionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCompetitions()
  }, [activeTab])

  const fetchCompetitions= async () => {
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

    if (now < start) return { status: 'upcoming', color: 'bg-[#60a5fa]' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const datePart = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
    const timePart = date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    })
    return { datePart, timePart }
  }

  const competitions = competitionsData?.competitions || []

  if (loading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading competitions...</div>
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
        {/* Competitions Banner Header - magenta theme */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--competitions">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Competitions</h1>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="fantasy-content">
          {/* Tab Buttons - NOT in fantasy-section */}
          <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg justify-center mb-6">
            <Button
              onClick={() => setActiveTab('active')}
              variant="default"
              className={activeTab === 'active' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Active
            </Button>
            <Button
              onClick={() => setActiveTab('upcoming')}
              variant="default"
              className={activeTab === 'upcoming' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Upcoming
            </Button>
            <Button
              onClick={() => setActiveTab('ended')}
              variant="default"
              className={activeTab === 'ended' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Users className="w-4 h-4 mr-2" />
              Completed
            </Button>
          </div>

          {/* Competition Entries - Each wrapped in fantasy-section */}
          {competitions.length > 0 && (
            <div className="space-y-4">
              <div className="grid gap-6">
                {competitions.map((competition) => {
                  const { status } = getCompetitionStatus(competition.startDate, competition.endDate)
                  
                  return (
                    <div key={competition.id} className="competition-entry">
                      {/* Fantasy Header Ribbon - Color based on status: Active=green, Upcoming=blue, Ended=grey */}
                      <div className={`competition-header-plate ${status === 'active' ? 'competition-header-plate--active' : status === 'ended' ? 'competition-header-plate--ended' : ''}`}>
                        <div className="competition-header-plate-content">
                          {/* Centered title */}
                          <div className="competition-header-plate-title">
                            {competition.name}
                          </div>
                          {/* Icon positioned on the right */}
                          {competition.type === 'XP_GAIN' ? (
                            getSkillIcon(competition.skill || 'overall') ? (
                              <img 
                                src={getSkillIcon(competition.skill || 'overall')!} 
                                alt={competition.skill}
                                className="competition-header-plate-icon"
                              />
                            ) : null
                          ) : (
                            <span className="competition-header-plate-icon text-2xl">💀</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Inner panel - content below the ribbon header */}
                      <div className="fantasy-section">
                        {/* Description */}
                        {competition.description && (
                          <p className="text-slate-400 mb-4 text-sm">
                            {competition.description}
                          </p>
                        )}
                      
                      {/* Content section */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">Start Date</p>
                              <p className="text-white font-medium">
                                {formatDate(competition.startDate).datePart}
                              </p>
                              <p className="text-white font-medium text-sm">
                                {formatDate(competition.startDate).timePart}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">End Date</p>
                              <p className="text-white font-medium">
                                {formatDate(competition.endDate).datePart}
                              </p>
                              <p className="text-white font-medium text-sm">
                                {formatDate(competition.endDate).timePart}
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
                              <BarChart3 className="w-4 h-4 text-slate-400" />
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
                                  {competition.boardSize}x{competition.boardSize}
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
                            <div className="flex space-x-3">
                              {competition.rewardFirstGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-yellow-400 text-base">🥇</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardFirstGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                              {competition.rewardSecondGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-gray-300 text-base">🥈</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardSecondGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                              {competition.rewardThirdGp && (
                                <div className="flex items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-md">
                                  <span className="text-amber-400 text-base">🥉</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    {(competition.rewardThirdGp / 1000000).toFixed(0)}M GP
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button asChild variant="default" className="bg-theme-button hover:bg-theme-button-hover">
                              <Link to={`/competitions/${competition.id}`}>
                                View Leaderboard
                              </Link>
                            </Button>
                          </div>
                        )}
                        {!(competition.rewardFirstGp || competition.rewardSecondGp || competition.rewardThirdGp) && (
                          <div className="flex justify-end pt-4 border-t border-slate-700">
                            <Button asChild variant="default" className="bg-theme-button hover:bg-theme-button-hover">
                              <Link to={`/competitions/${competition.id}`}>
                                View Leaderboard
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State - Also wrapped in fantasy-section */}
          {competitions.length === 0 && !loading && (
            <div className="fantasy-section">
              <div className="p-8 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No {activeTab} competitions found
                </h3>
                <p className="text-slate-400">
                  Check back later for new competitions!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Competitions
