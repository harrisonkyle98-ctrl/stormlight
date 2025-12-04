import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'
import { ActivityLogRow } from '../activityLogs/ActivityLogRow'

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

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now() / 1000
    const ts = timestamp > 1000000000000 ? timestamp / 1000 : timestamp
    const diff = now - ts

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 2592000)}mo ago`
  }

  return (
    <div className="space-y-4">
      {activities.length > 0 ? (
        <>
          {activities.map((activity, index) => (
            <ActivityLogRow
              key={index}
              activity={activity}
              formatTimeAgo={formatTimeAgo}
              usernameToUrl={usernameToUrl}
            />
          ))}
          
          {hasMoreActivities && (
            <div className="text-center pt-4">
              <button
                onClick={loadMoreActivities}
                disabled={loadingMore}
                className="px-6 py-2 bg-theme-button hover:bg-theme-button-hover disabled:bg-theme-slate-700 text-white rounded-lg transition-colors"
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
