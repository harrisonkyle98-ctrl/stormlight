import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

export const AnalyticsTab = ({ username: _username, playerData: _playerData, API_URL: _API_URL }: TabProps) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">XP analytics coming soon</p>
      <p className="text-slate-500 text-sm mt-2">Experience tracking and progress analytics</p>
    </div>
  )
}
