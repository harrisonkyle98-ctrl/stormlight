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

  const renderPlacementBadge = (placement: number | undefined) => {
    if (!placement) return null;

    if (placement === 1) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold">1st</span>
        </div>
      );
    } else if (placement === 2) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400 font-semibold">2nd</span>
        </div>
      );
    } else if (placement === 3) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="text-amber-600 font-semibold">3rd</span>
        </div>
      );
    } else {
      return <span className="text-slate-400 font-semibold">#{placement}</span>;
    }
  };

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
            className="block bg-slate-700/30 hover:bg-slate-700/50 p-5 rounded-lg transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold text-lg mb-1">{competition.name}</h3>
                {competition.description && (
                  <p className="text-slate-400 text-sm">{competition.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                {renderPlacementBadge(competition.placement)}
                <Badge className={`${color} text-white capitalize`}>
                  {status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Type</span>
                <p className="text-white font-medium capitalize">
                  {competition.type === 'XP_GAIN' ? 'Skilling' : 'PvM'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">
                  {competition.type === 'XP_GAIN' ? 'XP Gained' : 'Drops Obtained'}
                </span>
                <p className="text-white font-medium">
                  {competition.type === 'XP_GAIN' 
                    ? `${competition.contribution?.toLocaleString() || 0} XP`
                    : `${competition.contribution || 0} drop${competition.contribution !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <div>
                <span className="text-slate-500">
                  {competition.type === 'XP_GAIN' ? 'Skill' : 'Duration'}
                </span>
                <p className="text-white font-medium text-xs capitalize">
                  {competition.type === 'XP_GAIN' 
                    ? competition.skill 
                    : `${formatDate(competition.start_date)} - ${formatDate(competition.end_date)}`
                  }
                </p>
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
