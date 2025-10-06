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
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchActivities = async (append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const urlUsername = usernameToUrl(username);
      const page = append ? activityPage + 1 : 1;
      const response = await fetch(`${API_URL}/api/player/${urlUsername}/activities?page=${page}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        const newActivities = data.activities || [];
        
        if (append) {
          setActivities(prev => [...prev, ...newActivities]);
          setActivityPage(page);
        } else {
          setActivities(newActivities);
          setActivityPage(1);
        }
        
        setHasMoreActivities(data.has_more || false);
        setError(null);
      } else {
        setError('Failed to load activities');
      }
    } catch (err) {
      setError('Failed to load activities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreActivities = () => {
    fetchActivities(true);
  };

  useEffect(() => {
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

  const toMMDDYYYY = (ts: number): string => {
    const ms = ts > 1000000000000 ? ts : ts * 1000
    const d = new Date(ms)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}-${dd}-${yyyy}`
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        <>
          {activities.map((activity, index) => (
            <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
              <p className="text-white font-medium">{activity.username}</p>
              <p className="text-slate-300">{activity.text}</p>
              <p className="text-slate-500 text-sm">{toMMDDYYYY(activity.timestamp)}</p>
            </div>
          ))}
          
          {hasMoreActivities && (
            <div className="text-center pt-4">
              <button
                onClick={loadMoreActivities}
                disabled={loadingMore}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
              >
                {loadingMore ? 'Loading...' : 'See More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No activities found</p>
          <p className="text-slate-500 text-sm mt-2">This player has no activities available</p>
        </div>
      )}
    </div>
  );
}
