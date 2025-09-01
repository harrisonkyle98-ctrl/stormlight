import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface ActivityData {
  username: string;
  text: string;
  timestamp: number;
}

export const ActivityTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const urlUsername = usernameToUrl(username);
        const response = await fetch(`${API_URL}/api/player/${urlUsername}/activities`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities || []);
        } else {
          setError('Failed to load activities');
        }
      } catch (err) {
        setError('Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [API_URL, username]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading activities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        activities.map((activity, index) => (
          <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
            <p className="text-white font-medium">{activity.username}</p>
            <p className="text-slate-300">{activity.text}</p>
            <p className="text-slate-500 text-sm">{new Date(activity.timestamp * 1000).toLocaleDateString()}</p>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No recent activities</p>
          <p className="text-slate-500 text-sm mt-2">This player has no recent activities in the last 2 days</p>
        </div>
      )}
    </div>
  );
}
