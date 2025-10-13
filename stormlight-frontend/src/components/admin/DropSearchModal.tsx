import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Search } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'

interface Drop {
  item_name: string
  file: string
  bosses: string[]
}

interface DropSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (drop: Drop, bossName: string) => void
  position: number
}

export const DropSearchModal = ({ isOpen, onClose, onSelect, position }: DropSearchModalProps) => {
  const [drops, setDrops] = useState<Drop[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [bossFilter, setBossFilter] = useState('')
  const [filteredDrops, setFilteredDrops] = useState<Drop[]>([])

  useEffect(() => {
    fetch('/assets/drops/manifest.json')
      .then(res => res.json())
      .then(data => {
        const filteredData = data.filter((drop: Drop) => 
          !drop.bosses.every(boss => boss.toLowerCase() === 'misc')
        )
        setDrops(filteredData)
        setFilteredDrops(filteredData)
      })
      .catch(err => console.error('Error loading drops:', err))
  }, [])

  useEffect(() => {
    const filtered = drops.filter(drop => {
      const matchesSearch = searchTerm === '' || 
        drop.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesBoss = bossFilter === '' || 
        drop.bosses.some(boss => boss.toLowerCase().includes(bossFilter.toLowerCase()))
      return matchesSearch && matchesBoss
    })
    setFilteredDrops(filtered)
  }, [searchTerm, bossFilter, drops])

  const handleSelect = (drop: Drop, bossName: string) => {
    onSelect(drop, bossName)
    setSearchTerm('')
    setBossFilter('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white">
            Select Drop for Position {position + 1}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Input
              placeholder="Filter by boss..."
              value={bossFilter}
              onChange={(e) => setBossFilter(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredDrops.map((drop, idx) => (
                <div key={idx} className="space-y-1">
                  {drop.bosses.map((boss) => (
                    <Button
                      key={`${drop.item_name}-${boss}`}
                      onClick={() => handleSelect(drop, boss)}
                      className="w-full justify-start bg-slate-700/50 hover:bg-slate-700 text-white border border-slate-600"
                      variant="outline"
                    >
                      <img
                        src={drop.file}
                        alt={drop.item_name}
                        className="w-8 h-8 mr-3 object-contain"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{drop.item_name}</div>
                        <div className="text-xs text-slate-400">{boss}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              ))}
              {filteredDrops.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  No drops found matching your search
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
