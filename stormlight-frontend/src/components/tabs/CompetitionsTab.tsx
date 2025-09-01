import { useEffect, useState } from 'react'
import { Swords } from 'lucide-react'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

export const CompetitionsTab = ({ username: _username, playerData: _playerData, API_URL }: TabProps) => {
  const [_competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/competitions`);
        if (response.ok) {
          const data = await response.json();
          setCompetitions(data.competitions || []);
        }
      } catch (err) {
        console.error('Failed to load competitions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [API_URL]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading competitions...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Swords className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">Competition history coming soon</p>
      <p className="text-slate-500 text-sm mt-2">Past and current competition participation</p>
    </div>
  );
}
