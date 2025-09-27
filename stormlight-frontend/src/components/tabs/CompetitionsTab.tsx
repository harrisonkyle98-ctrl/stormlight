import { useEffect, useState } from 'react'
import { Swords } from 'lucide-react'
import { Badge } from '../ui/badge'
import { usernameToUrl } from '../../utils/urlUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface Competition {
  id: number;
  name: string;
  description: string;
  type: 'xp' | 'drops';
  skill?: string;
  boss?: string;
  start_date: string;
  end_date: string;
  placement?: number;
  contribution?: number;
}

export const CompetitionsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading competitions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="text-center py-12">
        <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">No competition history</p>
        <p className="text-slate-500 text-sm mt-2">This player hasn't participated in any competitions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {competitions.map((competition) => {
        const { status, color } = getCompetitionStatus(competition.start_date, competition.end_date);
        
        return (
          <div key={competition.id} className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">{competition.name}</h3>
              <div className="flex items-center space-x-2">
                {competition.placement && (
                  <Badge className="bg-yellow-600 text-white">
                    #{competition.placement}
                  </Badge>
                )}
                <Badge className={`${color} text-white capitalize`}>
                  {status}
                </Badge>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">{competition.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Type: </span>
                <span className="text-white capitalize">{competition.type}</span>
              </div>
              <div>
                <span className="text-slate-400">Contribution: </span>
                <span className="text-white">
                  {competition.type === 'xp' 
                    ? `${competition.contribution?.toLocaleString()} XP`
                    : `${competition.contribution} drops`
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-400">Duration: </span>
                <span className="text-white">
                  {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">
                  {competition.type === 'xp' ? 'Skill' : 'Boss'}: 
                </span>
                <span className="text-white capitalize ml-1">
                  {competition.type === 'xp' ? competition.skill : competition.boss || 'All'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
