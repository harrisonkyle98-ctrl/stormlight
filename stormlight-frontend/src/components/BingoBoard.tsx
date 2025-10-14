import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface GridItem {
  position: number
  itemName: string
  bossName: string
  imagePath: string
}

interface BingoBoardProps {
  competitionId: string
  gridSize: number
  dropsGrid: GridItem[]
  completedPositions?: number[]
  username?: string
}

export const BingoBoard = ({ 
  gridSize, 
  dropsGrid, 
  completedPositions = [],
  username 
}: BingoBoardProps) => {
  const completedSet = new Set(completedPositions)
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Bingo Board</span>
          {username && (
            <span className="text-sm text-slate-400">
              {completedPositions.length} / {dropsGrid.length} completed
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-0.5 md:gap-1 max-w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: gridSize <= 7 ? '600px' : '800px',
            margin: '0 auto'
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const item = dropsGrid.find(i => i.position === index)
            const isCompleted = completedSet.has(index)
            
            return (
              <div
                key={index}
                className={`aspect-square border rounded p-0.5 transition-all relative ${
                  isCompleted
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-slate-600 bg-slate-700/50'
                }`}
                style={{
                  minWidth: '0',
                  minHeight: '0'
                }}
              >
                {item && (
                  <img
                    src={`https://stormlight.fly.dev${item.imagePath}`}
                    alt={item.itemName}
                    className={`w-full h-full object-contain transition-all ${
                      isCompleted ? '' : 'opacity-50'
                    }`}
                    title={`${item.itemName} - ${item.bossName}`}
                  />
                )}
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl text-green-400">✓</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
