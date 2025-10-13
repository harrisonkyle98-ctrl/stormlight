import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

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
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const item = dropsGrid.find(i => i.position === index)
            const isCompleted = completedSet.has(index)
            
            return (
              <div
                key={index}
                className={`aspect-square border rounded p-1 transition-all ${
                  isCompleted
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-slate-600 bg-slate-700/50'
                }`}
              >
                {item && (
                  <img
                    src={item.imageUrl}
                    alt={item.itemName}
                    className={`w-full h-full object-contain transition-all ${
                      isCompleted ? '' : 'grayscale opacity-50'
                    }`}
                    title={`${item.itemName} - ${item.bossName}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
