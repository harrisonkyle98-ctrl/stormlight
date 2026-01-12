import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ExternalLink, ShoppingBag, Sparkles } from 'lucide-react'

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

const DailyscapeCard = () => {
  const [data, setData] = useState<DailyscapeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const fetchDailyscape = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/wiki/dailyscape`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
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
  }, [API_URL])

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
            {data?.merchant ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 mb-3">{data.merchant.date}</p>
                {data.merchant.items.map((item, index) => (
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
                      <span className="text-xs text-yellow-400 flex-shrink-0">{formatCost(data.visWax.slot1.cost)} gp</span>
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
                          <span className="text-xs text-yellow-400 flex-shrink-0">{formatCost(option.cost)} gp</span>
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
