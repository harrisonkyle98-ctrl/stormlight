import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { detectBingos, getBingoPositions } from '../utils/bingoDetection'
import { Link } from 'react-router-dom'
import { usernameToUrl } from '../utils/urlUtils'

interface GridItem {
  position: number
  itemName: string
  bossName: string
  imageUrl: string
}

interface BingoBoardProps {
  competitionId: string
  gridSize: number
  dropsGrid: GridItem[]
  completedPositions?: number[]
  username?: string
}

interface DropStats {
  item?: {
    name: string
    boss: string
    imageUrl: string
    position: number
  }
  players?: Array<{
    username: string
    count: number
  }>
  total_slots?: number
  ranked_players?: Array<{
    username: string
    filled_slots: number
  }>
}

export const BingoBoard = ({ 
  competitionId,
  gridSize, 
  dropsGrid, 
  completedPositions = [],
  username 
}: BingoBoardProps) => {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [dropStats, setDropStats] = useState<DropStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const completedSet = new Set(completedPositions)
  const bingoResult = detectBingos(gridSize, completedPositions)
  const bingoPositions = new Set(getBingoPositions(gridSize, bingoResult))
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  
  useEffect(() => {
    fetchDropStats(selectedPosition)
  }, [selectedPosition, competitionId])
  
  const fetchDropStats = async (position: number | null) => {
    setIsLoadingStats(true)
    try {
      const url = position !== null 
        ? `${API_URL}/api/competitions/${competitionId}/drop-stats?position=${position}`
        : `${API_URL}/api/competitions/${competitionId}/drop-stats`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDropStats(data)
      }
    } catch (error) {
      console.error('Error fetching drop stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }
  
  const handleCellClick = (position: number) => {
    const item = dropsGrid.find(i => i.position === position)
    if (!item) return
    
    if (selectedPosition === position) {
      setSelectedPosition(null)
    } else {
      setSelectedPosition(position)
    }
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Bingo Board</span>
              {username && (
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-slate-400">
                    {completedPositions.length} / {dropsGrid.length} completed
                  </span>
                  {bingoResult.total > 0 && (
                    <span className="text-yellow-400 font-bold">
                      {bingoResult.total} Bingo{bingoResult.total !== 1 ? 's' : ''}
                      {bingoResult.xShape && ' (X!)'}
                    </span>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid gap-0.5 md:gap-1 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                maxWidth: gridSize <= 7 ? '600px' : '800px'
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                const item = dropsGrid.find(i => i.position === index)
                const isCompleted = completedSet.has(index)
                const isBingo = bingoPositions.has(index)
                const isSelected = selectedPosition === index
                
                return (
                  <div
                    key={index}
                    onClick={() => item && handleCellClick(index)}
                    className={`aspect-square border rounded p-0.5 transition-all relative group bingo-slot ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/30 scale-105 ring-2 ring-blue-400'
                        : isBingo && isCompleted
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : isCompleted
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-[#475569] bg-slate-700/50'
                    } ${item ? 'cursor-pointer hover:scale-105' : ''}`}
                    style={{
                      minWidth: '0',
                      minHeight: '0'
                    }}
                  >
                    {item && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img
                            src={`https://stormlight.fly.dev${item.imageUrl}`}
                            alt={item.itemName}
                            className={`transition-all ${
                              isCompleted ? '' : 'opacity-50'
                            }`}
                            style={{ width: '32px', height: '32px' }}
                          />
                        </div>
                        <div className="absolute top-0 left-0 right-0 bg-slate-900/95 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 rounded">
                          {item.itemName}
                        </div>
                      </>
                    )}
                    {isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-2xl text-green-400">✓</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-1">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              {selectedPosition !== null && dropStats?.item 
                ? 'Drop Details' 
                : 'Overall Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="text-slate-400 text-center py-8">Loading...</div>
            ) : selectedPosition !== null && dropStats?.item ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-2 pb-3 border-b border-slate-600">
                  <img 
                    src={`https://stormlight.fly.dev${dropStats.item.imageUrl}`}
                    alt={dropStats.item.name}
                    style={{ width: '32px', height: '32px' }}
                  />
                  <div className="text-center">
                    <div className="text-white font-semibold">{dropStats.item.name}</div>
                    <div className="text-slate-400 text-sm">{dropStats.item.boss}</div>
                  </div>
                </div>
                
                {dropStats.players && dropStats.players.length > 0 ? (
                  <div>
                    <h4 className="text-slate-300 font-medium mb-2 text-sm">
                      Players who obtained this drop:
                    </h4>
                    <div className="space-y-2">
                      {dropStats.players.map((player) => (
                        <div key={player.username} className="flex items-center justify-between bg-slate-700/50 p-2 rounded">
                          <Link 
                            to={`/clan-member/${usernameToUrl(player.username)}`}
                            className="text-theme-accent-light hover:text-blue-300 transition-colors"
                          >
                            {player.username}
                          </Link>
                          <span className="text-slate-400 text-sm">
                            {player.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-4 text-sm">
                    No participants have obtained this drop yet
                  </div>
                )}
              </div>
            ) : dropStats && dropStats.ranked_players && dropStats.ranked_players.length > 0 ? (
              <div className="space-y-4">
                <div className="text-slate-300 text-sm">
                  <span className="font-medium">Total Slots:</span> {dropStats.total_slots}
                </div>
                
                <div>
                  <h4 className="text-slate-300 font-medium mb-2 text-sm">
                    Players by filled slots:
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dropStats.ranked_players.map((player, index) => (
                      <div 
                        key={player.username} 
                        className={`flex items-center justify-between p-2 rounded ${
                          index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                          index === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                          index === 2 ? 'bg-amber-500/20 border border-amber-500/30' :
                          'bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-400' :
                            'text-slate-400'
                          }`}>
                            #{index + 1}
                          </span>
                          <Link 
                            to={`/clan-member/${usernameToUrl(player.username)}`}
                            className="text-theme-accent-light hover:text-blue-300 transition-colors"
                          >
                            {player.username}
                          </Link>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400 font-semibold">
                            {player.filled_slots}
                          </span>
                          <span className="text-slate-400 text-sm">
                            / {dropStats.total_slots}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : dropStats && dropStats.ranked_players && dropStats.ranked_players.length === 0 ? (
              <div className="text-slate-400 text-center py-8 text-sm">
                No participants have obtained any drops yet
              </div>
            ): (
              <div className="text-slate-400 text-center py-8 text-sm">
                Click on a grid item to view drop details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
