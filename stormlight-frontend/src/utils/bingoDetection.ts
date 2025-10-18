export interface BingoResult {
  rows: number[]
  columns: number[]
  diagonals: ('main' | 'anti')[]
  xShape: boolean
  total: number
}

export function detectBingos(gridSize: number, completedPositions: number[]): BingoResult {
  const completedSet = new Set(completedPositions)
  const result: BingoResult = {
    rows: [],
    columns: [],
    diagonals: [],
    xShape: false,
    total: 0
  }
  
  // Check rows
  for (let row = 0; row < gridSize; row++) {
    let rowComplete = true
    for (let col = 0; col < gridSize; col++) {
      const position = row * gridSize + col
      if (!completedSet.has(position)) {
        rowComplete = false
        break
      }
    }
    if (rowComplete) {
      result.rows.push(row)
      result.total++
    }
  }
  
  // Check columns
  for (let col = 0; col < gridSize; col++) {
    let colComplete = true
    for (let row = 0; row < gridSize; row++) {
      const position = row * gridSize + col
      if (!completedSet.has(position)) {
        colComplete = false
        break
      }
    }
    if (colComplete) {
      result.columns.push(col)
      result.total++
    }
  }
  
  // Check main diagonal (top-left to bottom-right)
  let mainDiagComplete = true
  for (let i = 0; i < gridSize; i++) {
    const position = i * gridSize + i
    if (!completedSet.has(position)) {
      mainDiagComplete = false
      break
    }
  }
  if (mainDiagComplete) {
    result.diagonals.push('main')
    result.total++
  }
  
  // Check anti-diagonal (top-right to bottom-left)
  let antiDiagComplete = true
  for (let i = 0; i < gridSize; i++) {
    const position = i * gridSize + (gridSize - 1 - i)
    if (!completedSet.has(position)) {
      antiDiagComplete = false
      break
    }
  }
  if (antiDiagComplete) {
    result.diagonals.push('anti')
    result.total++
  }
  
  // Check X-shape (both diagonals)
  result.xShape = mainDiagComplete && antiDiagComplete
  
  return result
}

export function getBingoPositions(gridSize: number, bingo: BingoResult): number[] {
  const positions: Set<number> = new Set()
  
  // Add row positions
  for (const row of bingo.rows) {
    for (let col = 0; col < gridSize; col++) {
      positions.add(row * gridSize + col)
    }
  }
  
  // Add column positions
  for (const col of bingo.columns) {
    for (let row = 0; row < gridSize; row++) {
      positions.add(row * gridSize + col)
    }
  }
  
  // Add diagonal positions
  if (bingo.diagonals.includes('main')) {
    for (let i = 0; i < gridSize; i++) {
      positions.add(i * gridSize + i)
    }
  }
  
  if (bingo.diagonals.includes('anti')) {
    for (let i = 0; i < gridSize; i++) {
      positions.add(i * gridSize + (gridSize - 1 - i))
    }
  }
  
  return Array.from(positions)
}
