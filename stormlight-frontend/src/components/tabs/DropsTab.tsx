import { useEffect, useState } from 'react'
import { Package, Filter, Calendar } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface DropData {
  item_name: string;
  boss_name: string;
  timestamp: number;
  date: string;
  item_image_url: string;
  activity_text: string;
}

export const DropsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [drops, setDrops] = useState<DropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropPage, setDropPage] = useState(1);
  const [hasMoreDrops, setHasMoreDrops] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bossFilter, setBossFilter] = useState<string>('');
  const [itemFilter, setItemFilter] = useState<string>('');

  const fetchDrops = async (append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const urlUsername = usernameToUrl(username);
      const page = append ? dropPage + 1 : 1;
      const response = await fetch(`${API_URL}/api/player/${urlUsername}/drops?page=${page}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        const newDrops = data.drops || [];
        
        if (append) {
          setDrops(prev => [...prev, ...newDrops]);
          setDropPage(page);
        } else {
          setDrops(newDrops);
          setDropPage(1);
        }
        
        setHasMoreDrops(data.has_more || false);
        setError(null);
      } else {
        setError('Failed to load drops');
      }
    } catch (err) {
      setError('Failed to load drops');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreDrops = () => {
    fetchDrops(true);
  };

  useEffect(() => {
    fetchDrops();
  }, [API_URL, username]);

  const filteredDrops = drops.filter(drop => {
    const matchesBoss = !bossFilter || drop.boss_name.toLowerCase().includes(bossFilter.toLowerCase());
    const matchesItem = !itemFilter || drop.item_name.toLowerCase().includes(itemFilter.toLowerCase());
    return matchesBoss && matchesItem;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading drops...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-700/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by boss..."
            value={bossFilter}
            onChange={(e) => setBossFilter(e.target.value)}
            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by item..."
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
        </div>
      </div>

      {filteredDrops.length > 0 ? (
        <>
          {filteredDrops.map((drop, index) => (
            <div key={index} className="bg-slate-700/50 p-4 rounded-lg flex items-center space-x-4">
              <img
                src={drop.item_image_url}
                alt={drop.item_name}
                className="w-12 h-12 rounded border border-slate-600"
                onError={(e) => {
                  e.currentTarget.src = "https://runescape.wiki/images/thumb/b/b0/Item_icon.png/32px-Item_icon.png";
                }}
              />
              <div className="flex-1">
                <h3 className="text-white font-medium">{drop.item_name}</h3>
                <p className="text-slate-300 text-sm">from {drop.boss_name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <p className="text-slate-500 text-xs">{new Date(drop.timestamp * 1000).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
          
          {hasMoreDrops && (
            <div className="text-center pt-4">
              <button
                onClick={loadMoreDrops}
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
          <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No drops found</p>
          <p className="text-slate-500 text-sm mt-2">
            {bossFilter || itemFilter ? 'Try adjusting your filters' : 'This player has no recorded boss drops'}
          </p>
        </div>
      )}
    </div>
  );
};
