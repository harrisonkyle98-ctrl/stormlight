import { useEffect, useState } from 'react'
import { Package, Filter } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

interface DropData {
  item_name: string;
  boss_name: string;
  activity_timestamp: number;
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

  const groupedDrops = filteredDrops.reduce((groups, drop) => {
    const cleanBossName = drop.boss_name.replace(/^a\s+/i, '').trim();
    const cleanItemName = drop.item_name.replace(/^some\s+/i, '').trim();
    
    if (!groups[cleanBossName]) {
      groups[cleanBossName] = {};
    }
    
    if (!groups[cleanBossName][cleanItemName]) {
      groups[cleanBossName][cleanItemName] = {
        item_name: cleanItemName,
        item_image_url: drop.item_image_url,
        count: 0,
        mostRecentTimestamp: 0
      };
    }
    
    groups[cleanBossName][cleanItemName].count++;
    groups[cleanBossName][cleanItemName].mostRecentTimestamp = Math.max(
      groups[cleanBossName][cleanItemName].mostRecentTimestamp,
      drop.activity_timestamp
    );
    
    return groups;
  }, {} as Record<string, Record<string, { item_name: string; item_image_url: string; count: number; mostRecentTimestamp: number }>>);

  const sortedBossGroups = Object.entries(groupedDrops)
    .map(([cleanBossName, items]) => {
      const itemsArray = Object.values(items).sort((a, b) => a.item_name.localeCompare(b.item_name));
      const totalDrops = itemsArray.reduce((sum, item) => sum + item.count, 0);
      const mostRecentTimestamp = Math.max(...itemsArray.map(item => item.mostRecentTimestamp));
      
      return {
        bossName: cleanBossName,
        items: itemsArray,
        totalDrops,
        mostRecentTimestamp
      };
    })
    .sort((a, b) => b.mostRecentTimestamp - a.mostRecentTimestamp);

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

      {sortedBossGroups.length > 0 ? (
        <>
          {sortedBossGroups.map((bossGroup) => (
            <div key={bossGroup.bossName} className="space-y-2">
              {/* Boss Header */}
              <div className="bg-slate-600/50 px-4 py-3 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-white font-semibold text-lg">{bossGroup.bossName}</h3>
                <p className="text-slate-300 text-sm">{bossGroup.totalDrops} drop{bossGroup.totalDrops !== 1 ? 's' : ''}</p>
              </div>
              
              {/* Boss Items */}
              <div className="space-y-1 ml-4">
                {bossGroup.items.map((item, index) => (
                  <div key={index} className="bg-slate-700/30 p-3 rounded-lg flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.item_image_url}
                        alt={item.item_name}
                        className="w-10 h-10 rounded border border-slate-600"
                        onError={(e) => {
                          e.currentTarget.src = "https://runescape.wiki/images/thumb/b/b0/Item_icon.png/32px-Item_icon.png";
                        }}
                      />
                      <div>
                        <h4 className="text-white font-medium">{item.item_name}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-lg font-bold">{item.count}</p>
                    </div>
                  </div>
                ))}
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
