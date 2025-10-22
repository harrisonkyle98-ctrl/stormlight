import { useEffect, useState } from 'react'
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { usernameToUrl } from '../../utils/urlUtils'
import { Link } from 'react-router-dom'

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
  placement?: number;
  contribution?: number;
}

export const CompetitionsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'placement'>('date');
  const itemsPerPage = 10;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-blue-500' }
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
        <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading competitions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">This player has not participated in any competitions yet.</p>
      </div>
    );
  }

  const sortedCompetitions = [...competitions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    } else {
      if (!a.placement) return 1;
      if (!b.placement) return -1;
      return a.placement - b.placement;
    }
  });

  const totalPages = Math.ceil(sortedCompetitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompetitions = sortedCompetitions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Sorting Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: 'date' | 'placement') => { setSortBy(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date (Newest)</SelectItem>
              <SelectItem value="placement">Placement (Best)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-slate-400 text-sm">
          {sortedCompetitions.length} competition{sortedCompetitions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Competitions List */}
      {paginatedCompetitions.map((competition) => {
        const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date);
        
        return (
          <Link 
            key={competition.id} 
            to={`/competitions/${competition.id}`}
            className="block bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex">
              {/* Placement Column - Dark Background, Full Height */}
              <div className="bg-slate-800/70 flex items-center justify-center px-6 py-5 min-w-[80px] relative">
                {competition.placement ? (
                  <>
                    {/* Faint Trophy Icon Behind Text */}
                    <Trophy 
                      className={`absolute w-12 h-12 opacity-20 ${
                        competition.placement === 1 ? 'text-yellow-400' :
                        competition.placement === 2 ? 'text-gray-400' :
                        competition.placement === 3 ? 'text-amber-600' :
                        'text-slate-500'
                      }`}
                    />
                    {/* Placement Text */}
                    <span className="text-white font-bold text-2xl relative z-10">
                      {competition.placement === 1 ? '1st' : 
                       competition.placement === 2 ? '2nd' : 
                       competition.placement === 3 ? '3rd' : 
                       `${competition.placement}th`}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Faint Trophy Icon for No Placement */}
                    <Trophy className="absolute w-12 h-12 opacity-10 text-slate-600" />
                    <span className="text-slate-600 font-bold text-xl relative z-10">—</span>
                  </>
                )}
              </div>

              {/* Main Content */}
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold text-lg mb-1">{competition.name}</h3>
                    {competition.description && (
                      <p className="text-slate-400 text-sm">{competition.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={`${color} text-white capitalize`}>
                      {status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Type</span>
                    <p className="text-white font-medium capitalize">
                      {competition.type === 'XP_GAIN' ? 'Skilling' : 'PvM'}
                    </p>
                  </div>
                  {competition.type === 'XP_GAIN' ? (
                    <>
                      <div>
                        <span className="text-slate-500">Skill</span>
                        <p className="text-white font-medium capitalize">
                          {competition.skill || 'Overall'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">XP Gained</span>
                        <p className="text-white font-medium">
                          {competition.contribution?.toLocaleString() || 0} XP
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Duration</span>
                        <p className="text-white font-medium text-xs">
                          {formatDate(competition.start_date)} – {formatDate(competition.end_date)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500">Grid Size</span>
                        <p className="text-white font-medium">
                          {competition.boardSize ? `${competition.boardSize}×${competition.boardSize}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Drops Obtained</span>
                        <p className="text-white font-medium">
                          {competition.contribution || 0} drop{competition.contribution !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Duration</span>
                        <p className="text-white font-medium text-xs">
                          {formatDate(competition.start_date)} – {formatDate(competition.end_date)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-blue-800"
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
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-blue-800"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
