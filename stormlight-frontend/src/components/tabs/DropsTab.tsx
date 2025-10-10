import { useEffect, useState } from 'react'
import { Package, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { usernameToUrl } from '../../utils/urlUtils'
import { Tooltip } from '../ui/tooltip'

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

interface RareDropItem {
  name: string;
  image_url: string;
  count: number;
  has_drop: boolean;
}

interface BossDropTable {
  boss_name: string;
  items: RareDropItem[];
}

export const DropsTab = ({ username, playerData: _playerData, API_URL }: TabProps) => {
  const [bossDropTables, setBossDropTables] = useState<BossDropTable[]>([]);
  const [userDrops, setUserDrops] = useState<DropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bossFilter, setBossFilter] = useState<string>('');
  const [itemFilter, setItemFilter] = useState<string>('');
  const [expandedBosses, setExpandedBosses] = useState<Set<string>>(new Set());

  const fetchBossDropTables = async () => {
    try {
      const bossesResponse = await fetch(`${API_URL}/api/bosses/all`);
      if (!bossesResponse.ok) {
        throw new Error('Failed to fetch boss list');
      }
      const bossesData = await bossesResponse.json();
      const bosses = bossesData.bosses || [];
      
      console.log(`Fetching drop tables for ${bosses.length} bosses from dataset`);

      const fetchBossWithTimeout = async (boss: string): Promise<BossDropTable | null> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per boss
          
          const response = await fetch(
            `${API_URL}/api/boss/${encodeURIComponent(boss)}/rare-drops`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              return {
                boss_name: boss,
                items: data.items.map((item: any) => ({
                  name: item.name,
                  image_url: item.image_url || '/api/placeholder/32/32',
                  count: 0,
                  has_drop: false
                }))
              };
            }
          }
          return null;
        } catch (err) {
          console.error(`Failed to fetch drops for ${boss}:`, err);
          return null;
        }
      };

      const results = await Promise.allSettled(
        bosses.map(boss => fetchBossWithTimeout(boss))
      );

      const dropTables: BossDropTable[] = results
        .filter((result): result is PromiseFulfilledResult<BossDropTable | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value!);

      setBossDropTables(dropTables);
      console.log(`Successfully loaded ${dropTables.length}/${bosses.length} boss drop tables`);
    } catch (err) {
      console.error('Error fetching boss drop tables:', err);
    }
  };

  const fetchUserDrops = async () => {
    try {
      const urlUsername = usernameToUrl(username);
      const response = await fetch(`${API_URL}/api/player/${urlUsername}/drops?limit=50`);
      if (!response.ok) {
        throw new Error('Failed to fetch user drops');
      }

      const data = await response.json();
      setUserDrops(data.drops || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drops');
      console.error('Error fetching user drops:', err);
    }
  };

  const mergeDropData = () => {
    const userDropCounts = userDrops.reduce((acc, drop) => {
      const key = `${drop.boss_name}:${drop.item_name}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return bossDropTables.map(table => ({
      ...table,
      items: table.items.map(item => {
        const key = `${table.boss_name}:${item.name}`;
        const count = userDropCounts[key] || 0;
        return {
          ...item,
          count,
          has_drop: count > 0
        };
      })
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBossDropTables(), fetchUserDrops()]);
      setLoading(false);
    };

    loadData();
  }, [username, API_URL]);

  const toggleBoss = (bossName: string) => {
    const newExpanded = new Set(expandedBosses);
    if (newExpanded.has(bossName)) {
      newExpanded.delete(bossName);
    } else {
      newExpanded.add(bossName);
    }
    setExpandedBosses(newExpanded);
  };

  const mergedData = mergeDropData();
  
  const filteredData = mergedData.filter(table => {
    if (bossFilter && !table.boss_name.toLowerCase().includes(bossFilter.toLowerCase())) {
      return false;
    }
    if (itemFilter) {
      return table.items.some(item => 
        item.name.toLowerCase().includes(itemFilter.toLowerCase())
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading rare drop tables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg">Error loading drops</p>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
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

      {/* Boss drop tables */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No boss drop tables found</p>
          <p className="text-slate-500 text-sm mt-2">
            {bossFilter || itemFilter ? 'Try adjusting your filters' : 'Unable to load rare drop tables'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((table) => {
            const isExpanded = expandedBosses.has(table.boss_name);
            const ownedItems = table.items.filter(item => item.has_drop).length;
            const totalItems = table.items.length;
            
            return (
              <div key={table.boss_name} className="space-y-2">
                <button
                  onClick={() => toggleBoss(table.boss_name)}
                  className="w-full bg-slate-600/50 px-4 py-3 rounded-lg border-l-4 border-blue-500 flex items-center justify-between hover:bg-slate-600/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white font-semibold text-lg">{table.boss_name}</h3>
                    <p className="text-slate-300 text-sm">
                      ({ownedItems}/{totalItems} items)
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="space-y-1 ml-4">
                    {table.items
                      .filter(item => !itemFilter || item.name.toLowerCase().includes(itemFilter.toLowerCase()))
                      .map((item) => (
                      <div 
                        key={item.name} 
                        className={`bg-slate-700/30 p-3 rounded-lg flex items-center justify-between hover:bg-slate-700/50 transition-colors ${
                          item.has_drop ? '' : 'opacity-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Tooltip
                            content={
                              <div>
                                <div className="font-semibold text-white">{item.name}</div>
                                {item.has_drop ? (
                                  <div className="text-green-400 mt-1">
                                    ✅ Unlocked - Owned: {item.count} {item.count === 1 ? 'drop' : 'drops'}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 mt-1">
                                    🔒 Not obtained
                                  </div>
                                )}
                              </div>
                            }
                          >
                            <div className="relative">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className={`w-10 h-10 rounded border border-slate-600 cursor-help ${item.has_drop ? '' : 'grayscale'}`}
                                onError={(e) => {
                                  e.currentTarget.src = "https://runescape.wiki/images/thumb/b/b0/Item_icon.png/32px-Item_icon.png";
                                }}
                              />
                              {item.has_drop && item.count > 0 && (
                                <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1 rounded-tl border border-slate-600 font-bold">
                                  ×{item.count}
                                </div>
                              )}
                            </div>
                          </Tooltip>
                          <div>
                            <h4 className={`font-medium ${
                              item.has_drop ? 'text-white' : 'text-slate-500'
                            }`}>{item.name}</h4>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
