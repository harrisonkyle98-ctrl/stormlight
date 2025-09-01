import { useEffect, useState } from 'react'
import { Scroll, MapPin } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table'
import { Badge } from '../ui/badge'
import { usernameToUrl } from '../../utils/urlUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface QuestData {
  title: string;
  status: string;
  difficulty: number;
  members: boolean;
  questPoints: number;
  userEligible: boolean;
}

interface QuestResponse {
  quest_summary: {
    questsstarted: number;
    questscomplete: number;
    questsnotstarted: number;
  };
  total_quest_points: number;
  quests: QuestData[];
}

export const QuestsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [questData, setQuestData] = useState<QuestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const urlUsername = usernameToUrl(username);
        const response = await fetch(`${API_URL}/api/player/${urlUsername}/quests`);
        
        if (response.ok) {
          const data = await response.json();
          setQuestData(data);
          setError(null);
        } else {
          setError('Failed to load quest data');
        }
      } catch (err) {
        setError('Failed to load quest data');
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, [API_URL, username]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Scroll className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading quests...</p>
      </div>
    );
  }

  if (error || !questData) {
    return (
      <div className="text-center py-12">
        <Scroll className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error || 'No quest data available'}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 border-green-400';
      case 'STARTED': return 'text-yellow-400 border-yellow-400';
      case 'NOT_STARTED': return 'text-slate-400 border-slate-400';
      default: return 'text-slate-400 border-slate-400';
    }
  };

  const getDifficultyText = (difficulty: number) => {
    const levels = ['Novice', 'Intermediate', 'Experienced', 'Master', 'Grandmaster', 'Special'];
    return levels[difficulty] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Total Quest Points</p>
          <p className="text-2xl font-bold text-yellow-400">{questData.total_quest_points}</p>
        </div>
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-400">{questData.quest_summary.questscomplete}</p>
        </div>
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Started</p>
          <p className="text-2xl font-bold text-yellow-400">{questData.quest_summary.questsstarted}</p>
        </div>
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Not Started</p>
          <p className="text-2xl font-bold text-slate-400">{questData.quest_summary.questsnotstarted}</p>
        </div>
      </div>

      <div className="w-full">
        <Table className="text-slate-300">
          <TableHeader>
            <TableRow className="border-slate-600 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 font-medium py-3 h-auto">Quest</TableHead>
              <TableHead className="text-slate-400 font-medium py-3 h-auto">Status</TableHead>
              <TableHead className="text-slate-400 font-medium py-3 h-auto">Difficulty</TableHead>
              <TableHead className="text-slate-400 font-medium py-3 h-auto">Members</TableHead>
              <TableHead className="text-slate-400 font-medium py-3 h-auto">Quest Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questData.quests.map((quest, index) => (
              <TableRow key={index} className="border-slate-600 hover:bg-slate-800/50">
                <TableCell className="py-3">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-white">{quest.title}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={getStatusColor(quest.status)}>
                    {quest.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-slate-300">{getDifficultyText(quest.difficulty)}</span>
                </TableCell>
                <TableCell className="py-3">
                  <span className={quest.members ? 'text-yellow-400' : 'text-slate-400'}>
                    {quest.members ? 'Members' : 'F2P'}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-blue-400 font-medium">{quest.questPoints}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
