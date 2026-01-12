import { useEffect, useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ExternalLink, ShoppingBag, Sparkles, Search, Calendar, ChevronDown } from 'lucide-react'

interface MerchantItem {
  name: string
  iconUrl: string | null
  wikiUrl: string
}

interface MerchantData {
  items: MerchantItem[]
  date: string
}

interface VisWaxSlot {
  rune: string
  cost: number
  iconUrl: string
}

interface VisWaxData {
  slot1: VisWaxSlot | null
  slot2Options: VisWaxSlot[]
  slot3: string
  date: string
}

interface DailyscapeResponse {
  merchant: MerchantData | null
  visWax: VisWaxData | null
  wildyEvents: unknown
  meta: {
    fetchedAt: string
    requestedDate: string
    cached: {
      merchant: boolean
      visWax: boolean
      wildyEvents: boolean
    }
    fetchDurationMs: number
  }
}

interface SearchItem {
  name: string
  iconUrl: string | null
  wikiUrl: string | null
}

interface NextOccurrence {
  item: string
  next: string | null
  upcoming: string[]
}

const DailyscapeCard = () => {
  const [data, setData] = useState<DailyscapeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Merchant sub-tab state
  const [merchantSubTab, setMerchantSubTab] = useState<'today' | 'tomorrow' | 'pick'>('today')
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)
  const [merchantLoading, setMerchantLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [nextOccurrence, setNextOccurrence] = useState<NextOccurrence | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Get today and tomorrow dates in UTC
  const getTodayUTC = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }
  
  const getTomorrowUTC = () => {
    const now = new Date()
    now.setDate(now.getDate() + 1)
    return now.toISOString().split('T')[0]
  }

  // Fetch merchant data for a specific date
  const fetchMerchantForDate = useCallback(async (dateStr: string) => {
    try {
      setMerchantLoading(true)
      const response = await fetch(`${API_URL}/api/wiki/dailyscape?date=${dateStr}`)
      if (response.ok) {
        const result = await response.json()
        setMerchantData(result.merchant)
      }
    } catch (err) {
      console.error('Error fetching merchant data:', err)
    } finally {
      setMerchantLoading(false)
    }
  }, [API_URL])

  // Fetch available dates for Pick Date dropdown
  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/wiki/merchant/dates?days=60`)
      if (response.ok) {
        const result = await response.json()
        setAvailableDates(result.dates || [])
      }
    } catch (err) {
      console.error('Error fetching available dates:', err)
    }
  }, [API_URL])

  // Search for merchant items
  const searchMerchantItems = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    
    try {
      setSearchLoading(true)
      const response = await fetch(`${API_URL}/api/wiki/merchant/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const result = await response.json()
        setSearchResults(result.items || [])
        setShowSearchResults(true)
      }
    } catch (err) {
      console.error('Error searching merchant items:', err)
    } finally {
      setSearchLoading(false)
    }
  }, [API_URL])

  // Get next occurrence for an item
  const getNextOccurrence = useCallback(async (itemName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/wiki/merchant/next?item=${encodeURIComponent(itemName)}`)
      if (response.ok) {
        const result = await response.json()
        setNextOccurrence(result)
        setShowSearchResults(false)
        setSearchQuery('')
      }
    } catch (err) {
      console.error('Error getting next occurrence:', err)
    }
  }, [API_URL])

  // Initial data fetch
  useEffect(() => {
    const fetchDailyscape = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/wiki/dailyscape`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
          setMerchantData(result.merchant)
          setError(null)
        } else {
          setError('Failed to load Dailyscape data')
        }
      } catch (err) {
        console.error('Error fetching Dailyscape:', err)
        setError('Failed to load Dailyscape data')
      } finally {
        setLoading(false)
      }
    }

    fetchDailyscape()
    fetchAvailableDates()
  }, [API_URL, fetchAvailableDates])

  // Handle merchant sub-tab changes
  useEffect(() => {
    if (merchantSubTab === 'today') {
      fetchMerchantForDate(getTodayUTC())
    } else if (merchantSubTab === 'tomorrow') {
      fetchMerchantForDate(getTomorrowUTC())
    }
  }, [merchantSubTab, fetchMerchantForDate])

  // Handle Pick Date selection
  useEffect(() => {
    if (merchantSubTab === 'pick' && selectedDate) {
      fetchMerchantForDate(selectedDate)
    }
  }, [selectedDate, merchantSubTab, fetchMerchantForDate])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchMerchantItems(searchQuery)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMerchantItems])

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z')
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatCost = (cost: number) => {
    if (cost >= 1000000) return `${(cost / 1000000).toFixed(1)}M`
    if (cost >= 1000) return `${(cost / 1000).toFixed(0)}K`
    return cost.toString()
  }

  const LoadingSkeleton = () => (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg">
        <div className="w-8 h-8 bg-slate-700/50 rounded"></div>
        <div className="h-4 bg-slate-700/50 rounded w-32"></div>
      </div>
      <div className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg">
        <div className="w-8 h-8 bg-slate-700/50 rounded"></div>
        <div className="h-4 bg-slate-700/50 rounded w-28"></div>
      </div>
      <div className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg">
        <div className="w-8 h-8 bg-slate-700/50 rounded"></div>
        <div className="h-4 bg-slate-700/50 rounded w-36"></div>
      </div>
    </div>
  )

  const UnavailableState = ({ section }: { section: string }) => (
    <div className="p-4 bg-slate-700/20 rounded-lg text-center">
      <p className="text-sm text-slate-400">{section} data unavailable</p>
    </div>
  )

  return (
    <div className="fantasy-section">
      <h3 className="fantasy-section-title">Dailyscape</h3>
      
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-4 bg-slate-700/20 rounded-lg text-center">
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : (
        <Tabs defaultValue="merchant" className="w-full">
          <TabsList className="w-full bg-slate-700/30 mb-4">
            <TabsTrigger 
              value="merchant" 
              className="flex-1 data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Merchant
            </TabsTrigger>
            <TabsTrigger 
              value="viswax" 
              className="flex-1 data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Vis Wax
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchant">
            <div className="space-y-3">
              {/* Sub-tabs: Today / Tomorrow / Pick Date */}
              <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => { setMerchantSubTab('today'); setNextOccurrence(null); }}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                    merchantSubTab === 'today' 
                      ? 'bg-slate-600 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => { setMerchantSubTab('tomorrow'); setNextOccurrence(null); }}
                  className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                    merchantSubTab === 'tomorrow' 
                      ? 'bg-slate-600 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Tomorrow
                </button>
                <div className="relative flex-1">
                  <button
                    onClick={() => { setMerchantSubTab('pick'); setShowDatePicker(!showDatePicker); setNextOccurrence(null); }}
                    className={`w-full px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                      merchantSubTab === 'pick' 
                        ? 'bg-slate-600 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Pick Date
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showDatePicker && merchantSubTab === 'pick' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {availableDates.slice(0, 30).map((dateStr) => (
                        <button
                          key={dateStr}
                          onClick={() => { setSelectedDate(dateStr); setShowDatePicker(false); }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-700 transition-colors ${
                            selectedDate === dateStr ? 'bg-slate-700 text-white' : 'text-slate-300'
                          }`}
                        >
                          {formatDateDisplay(dateStr)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none min-w-0"
                  />
                  {searchLoading && (
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
                
                {/* Search results dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => getNextOccurrence(item.name)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors"
                      >
                        {item.iconUrl && (
                          <img src={item.iconUrl} alt={item.name} className="w-5 h-5 object-contain" />
                        )}
                        <span className="text-sm text-white truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Next occurrence display */}
              {nextOccurrence && nextOccurrence.next && (
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Next appearance of {nextOccurrence.item}:</p>
                  <p className="text-sm text-white font-medium">{formatDateDisplay(nextOccurrence.next)}</p>
                  {nextOccurrence.upcoming.length > 1 && (
                    <p className="text-xs text-slate-400 mt-2">
                      Also: {nextOccurrence.upcoming.slice(1, 4).map(d => formatDateDisplay(d)).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Merchant items list */}
              {merchantLoading ? (
                <LoadingSkeleton />
              ) : merchantData ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{merchantData.date}</p>
                  {merchantData.items.map((item, index) => (
                    <a
                      key={index}
                      href={item.wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors group"
                    >
                      {item.iconUrl ? (
                        <img 
                          src={item.iconUrl} 
                          alt={item.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-600/50 rounded flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <span className="text-sm text-white flex-1 truncate min-w-0">{item.name}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-400 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <UnavailableState section="Merchant" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="viswax">
            {data?.visWax ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">{data.visWax.date}</p>
                
                {data.visWax.slot1 && (
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Slot 1 (Fixed)</p>
                    <div className="flex items-center gap-3">
                      <img 
                        src={data.visWax.slot1.iconUrl} 
                        alt={data.visWax.slot1.rune}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="text-sm text-white flex-1 truncate min-w-0">{data.visWax.slot1.rune} rune</span>
                      <span className="text-xs text-green-400 flex-shrink-0">{formatCost(data.visWax.slot1.cost)} GP</span>
                    </div>
                  </div>
                )}

                {data.visWax.slot2Options.length > 0 && (
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Slot 2 Options</p>
                    <div className="space-y-2">
                      {data.visWax.slot2Options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <img 
                            src={option.iconUrl} 
                            alt={option.rune}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <span className="text-sm text-white flex-1 truncate min-w-0">{option.rune} rune</span>
                          <span className="text-xs text-green-400 flex-shrink-0">{formatCost(option.cost)} GP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Slot 3</p>
                  <p className="text-sm text-slate-300">{data.visWax.slot3}</p>
                </div>
              </div>
            ) : (
              <UnavailableState section="Vis Wax" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default DailyscapeCard
