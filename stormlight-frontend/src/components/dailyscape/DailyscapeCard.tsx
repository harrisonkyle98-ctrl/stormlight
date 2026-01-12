import { useEffect, useState, useCallback, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { ShoppingBag, Sparkles, Search, Calendar, ChevronDown, Flame, Swords, BarChart2, Shuffle, Hourglass } from 'lucide-react'

interface MerchantItem {
  name: string
  iconUrl: string | null
  price: number | null
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
  wildyEvents: WildyEventsData | null
  vos: VoSData | null
  meta: {
    fetchedAt: string
    requestedDate: string
    cached: {
      merchant: boolean
      visWax: boolean
      wildyEvents: boolean
      vos: boolean
    }
    fetchDurationMs: number
  }
}

interface SearchItem {
  name: string
  iconUrl: string | null
  price: number | null
}

interface NextOccurrence {
  item: string
  next: string | null
  upcoming: string[]
}

interface WildyEvent {
  name: string
  type: 'combat' | 'skilling' | 'mixed'
  special: boolean
  startsAt: string
  hour?: string
  location?: string | null
}

interface WildyEventsData {
  current: WildyEvent
  nextStartsAt: string
  nextEventIn: string
  upcoming: WildyEvent[]
  meta: {
    rotationSource: string
    anchorMs: number
    rotationLength: number
    cached: boolean
    fetchedAt: string
  }
  unavailable?: boolean
  error?: string
}

interface VoSDistrict {
  name: string
  iconUrl: string | null
}

interface VoSData {
  current: VoSDistrict[]
  previous: VoSDistrict[] | null
  nextChangeAt: string
  nextChangeIn: number
  meta: {
    source: string
    cached: boolean
    fetchedAt: string
  }
  unavailable?: boolean
  error?: string
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

  // Wildy Events state
  const [wildyCountdown, setWildyCountdown] = useState<string>('')
  const [showSpecialOnly, setShowSpecialOnly] = useState(false)
  const [expandedEventName, setExpandedEventName] = useState<string | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // VoS state
  const [vosCountdown, setVosCountdown] = useState<string>('')
  const vosCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // Debounced search - 200ms debounce, show suggestions on every keystroke including single letter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 1) {
        searchMerchantItems(searchQuery)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMerchantItems])

  // Wildy Events countdown timer - updates every second
  useEffect(() => {
    if (!data?.wildyEvents?.nextStartsAt || data.wildyEvents.unavailable) {
      return
    }

    const updateCountdown = () => {
      const nextStart = new Date(data.wildyEvents!.nextStartsAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, nextStart - now)
      
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setWildyCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    countdownIntervalRef.current = setInterval(updateCountdown, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [data?.wildyEvents?.nextStartsAt, data?.wildyEvents?.unavailable])

  // VoS countdown timer - updates every second
  useEffect(() => {
    if (!data?.vos?.nextChangeAt || data.vos.unavailable) {
      return
    }

    const updateVosCountdown = () => {
      const nextChange = new Date(data.vos!.nextChangeAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, nextChange - now)
      
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setVosCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateVosCountdown()
    vosCountdownIntervalRef.current = setInterval(updateVosCountdown, 1000)

    return () => {
      if (vosCountdownIntervalRef.current) {
        clearInterval(vosCountdownIntervalRef.current)
      }
    }
  }, [data?.vos?.nextChangeAt, data?.vos?.unavailable])

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
        <Tabs defaultValue="wildy" className="w-full">
          <TabsList className="w-full bg-slate-700/30 mb-4">
            <TabsTrigger 
              value="wildy" 
              className="flex-1 data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300"
            >
              <Flame className="w-4 h-4 mr-2" />
              Wildy
            </TabsTrigger>
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
            <TabsTrigger 
              value="vos" 
              className="flex-1 data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-300"
            >
              <Hourglass className="w-4 h-4 mr-2" />
              VoS
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

              {/* Search bar - styled to match Members page exactly */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-3 w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                )}
                
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

              {/* Merchant items list - prices instead of wiki links */}
              {merchantLoading ? (
                <LoadingSkeleton />
              ) : merchantData ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{merchantData.date}</p>
                  {merchantData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
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
                      <span className="text-xs text-green-400 flex-shrink-0">
                        {item.price ? `${formatCost(item.price)} GP` : '—'}
                      </span>
                    </div>
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

          <TabsContent value="wildy">
            {data?.wildyEvents && !data.wildyEvents.unavailable ? (
              <div className="space-y-3">
                {/* NEXT event header with countdown (not current) */}
                {(() => {
                  const nextEvent = data.wildyEvents.upcoming[1] // First upcoming after current
                  if (!nextEvent) return null
                  return (
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-400">Next Event</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Starts in</span>
                          <span className="text-sm font-mono text-amber-400">{wildyCountdown || data.wildyEvents.nextEventIn}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${
                          nextEvent.type === 'combat' ? 'bg-red-500/20' :
                          nextEvent.type === 'skilling' ? 'bg-green-500/20' :
                          'bg-purple-500/20'
                        }`}>
                          {nextEvent.type === 'combat' ? (
                            <Swords className="w-4 h-4 text-red-400" />
                          ) : nextEvent.type === 'skilling' ? (
                            <BarChart2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Shuffle className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white truncate block">{nextEvent.name}</span>
                          <span className="text-xs text-slate-400">{nextEvent.hour} UTC</span>
                          {nextEvent.location && (
                            <span className="text-xs text-slate-500 truncate block">{nextEvent.location}</span>
                          )}
                        </div>
                        {/* Right-aligned: Special tag only (when applicable) */}
                        {nextEvent.special && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded flex-shrink-0">Special</span>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Special-only filter toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Upcoming Events (48h)</p>
                  <button
                    onClick={() => setShowSpecialOnly(!showSpecialOnly)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      showSpecialOnly 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-slate-700/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showSpecialOnly ? 'Special Only' : 'Show All'}
                  </button>
                </div>

                {/* Scrollable upcoming events list - full 48h */}
                <div 
                  className="max-h-64 overflow-y-auto pr-1 space-y-1.5 wildy-events-scroll"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgb(71 85 105) transparent'
                  }}
                >
                  {data.wildyEvents.upcoming
                    .slice(1) // Skip current event
                    .filter(event => !showSpecialOnly || event.special)
                    .map((event, index) => {
                      const isExpanded = expandedEventName === `${event.name}-${index}`
                      // Find all occurrences of this event in the 48h window
                      const sameEventOccurrences = data.wildyEvents!.upcoming
                        .slice(1)
                        .filter(e => e.name === event.name && e.startsAt !== event.startsAt)
                      
                      return (
                        <div key={`${event.name}-${index}`}>
                          <div
                            onClick={() => setExpandedEventName(isExpanded ? null : `${event.name}-${index}`)}
                            className={`flex items-center gap-2 p-2 bg-slate-700/20 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors ${
                              isExpanded ? 'bg-slate-700/40' : ''
                            }`}
                          >
                                                        <span className="text-xs text-slate-500 w-12 flex-shrink-0">{event.hour}</span>
                                                        <span className="text-xs text-white flex-1 truncate min-w-0 text-left">{event.name}</span>
                            {/* Right-aligned tags: Special first, then icon tag */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {event.special && (
                                <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Special</span>
                              )}
                              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                event.type === 'combat' ? 'bg-red-500/20' :
                                event.type === 'skilling' ? 'bg-green-500/20' :
                                'bg-purple-500/20'
                              }`}>
                                {event.type === 'combat' ? (
                                  <Swords className="w-3 h-3 text-red-400" />
                                ) : event.type === 'skilling' ? (
                                  <BarChart2 className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Shuffle className="w-3 h-3 text-purple-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Expanded section showing location and other occurrences of this event */}
                          {isExpanded && (
                            <div className="p-2 bg-slate-800/50 rounded-lg border-l-4 border-[rgba(51,65,85,0.6)]">
                              {event.location && (
                                <p className="text-xs text-slate-500 mb-1.5 truncate">{event.location}</p>
                              )}
                              {sameEventOccurrences.length > 0 && (
                                <>
                                  <p className="text-xs text-slate-400 mb-1.5">Other occurrences in 48h:</p>
                                  <div className="space-y-1">
                                    {sameEventOccurrences.map((occurrence, occIndex) => {
                                      // Format full date + time from startsAt ISO string
                                      const occDate = new Date(occurrence.startsAt)
                                      const formattedDate = occDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        timeZone: 'UTC'
                                      })
                                      const formattedTime = occDate.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'UTC'
                                      })
                                      return (
                                        <div key={occIndex} className="flex items-center gap-2 text-xs">
                                          <span className="text-slate-400">{formattedDate}, {formattedTime} UTC</span>
                                          {occurrence.special && (
                                            <span className="text-amber-400">(Special)</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : (
              <UnavailableState section="Wildy Events" />
            )}
          </TabsContent>

          <TabsContent value="vos">
            {data?.vos && !data.vos.unavailable ? (
              <div className="space-y-3">
                {/* Current Voice of Seren - Header with inline countdown (Wildy-style) */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Current Voice of Seren</p>
                  <span className="text-xs text-slate-400">
                    Next: <span className="font-mono text-amber-400">{vosCountdown || '--:--'}</span>
                  </span>
                </div>

                {/* Current districts - Two large centered containers (mini-cards) */}
                <div className="flex items-center justify-center gap-4">
                  {data.vos.current.map((district, index) => (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
                      {district.iconUrl && (
                        <img 
                          src={district.iconUrl} 
                          alt={district.name} 
                          className="w-10 h-10 mb-2"
                        />
                      )}
                      <span className="text-sm text-white font-medium">{district.name}</span>
                    </div>
                  ))}
                </div>

                {/* Previous Voice of Seren - Smaller/muted style */}
                <div className="pt-2 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2">Previous Voice of Seren</p>
                  {data.vos.previous && data.vos.previous.length > 0 ? (
                    <div className="flex items-center justify-center gap-3">
                      {data.vos.previous.map((district, index) => (
                        <div key={index} className="bg-slate-800/50 rounded-lg p-2 flex flex-col items-center min-w-[80px]">
                          {district.iconUrl && (
                            <img 
                              src={district.iconUrl} 
                              alt={district.name} 
                              className="w-6 h-6 mb-1 opacity-60"
                            />
                          )}
                          <span className="text-xs text-slate-400">{district.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center">Unavailable</p>
                  )}
                </div>
              </div>
            ) : (
              <UnavailableState section="Voice of Seren" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default DailyscapeCard
