import { useEffect, useState } from 'react'
import { Star, Calendar, Users, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { usernameToUrl } from '../../utils/urlUtils'
import { Link } from 'react-router-dom'
import { getSkillIcon } from '../../utils/skillIcons'
import '../../styles/fantasy-container.css'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface Competition {
  id: number;
  name: string;
  description: string;
  type: 'XP_GAIN' | 'BOSS_KILLS';
  skill?: string;
  boardSize?: number;
  start_date: string;
  end_date: string;
  participantCount?: number;
  rewardFirstGp?: number;
  rewardSecondGp?: number;
  rewardThirdGp?: number;
}

const getCompetitionTypeLabel = (type: string): string => {
  if (type === 'XP_GAIN') return 'Skilling'
  if (type === 'BOSS_KILLS') return 'PvM'
  return type
}

export const CompetitionsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-[#60a5fa]' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  useEffect(() => {
    const fetchPlayerCompetitions = async () => {
      try {
        const urlUsername = usernameToUrl(username);
        const response = await fetch(`${API_URL}/api/player/${urlUsername}/competitions`);
        if (response.ok) {
          const data = await response.json();
          setCompetitions(data.competitions || []);
        } else {
          setError('Failed to load competitions');
        }
      } catch (err) {
        setError('Failed to load competitions');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerCompetitions();
  }, [API_URL, username]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Star className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading competitions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Star className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="fantasy-section">
        <div className="p-8 text-center">
          <Star className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No competitions found
          </h3>
          <p className="text-slate-400">
            This player has not participated in any competitions yet.
          </p>
        </div>
      </div>
    );
  }

  // Sort by date (newest first)
  const sortedCompetitions = [...competitions].sort((a, b) => {
    return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
  });

  const totalPages = Math.ceil(sortedCompetitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompetitions = sortedCompetitions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Competition count */}
      <div className="text-right">
        <span className="text-slate-400 text-sm">
          {sortedCompetitions.length} competition{sortedCompetitions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Competition Entries - Styled exactly like main Competitions page */}
      <div className="grid gap-6">
        {paginatedCompetitions.map((competition) => {
          const { status } = getCompetitionStatus(competition.start_date, competition.end_date);
          
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
                          {formatDate(competition.start_date).datePart}
                        </p>
                        <p className="text-white font-medium text-sm">
                          {formatDate(competition.start_date).timePart}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-400">End Date</p>
                        <p className="text-white font-medium">
                          {formatDate(competition.end_date).datePart}
                        </p>
                        <p className="text-white font-medium text-sm">
                          {formatDate(competition.end_date).timePart}
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
                        <Star className="w-4 h-4 text-slate-400" />
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
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            size="sm"
            className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50 disabled:bg-theme-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-slate-400 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50 disabled:bg-theme-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
