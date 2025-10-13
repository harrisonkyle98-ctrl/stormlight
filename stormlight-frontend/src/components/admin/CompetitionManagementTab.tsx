import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Trophy, Plus, Edit, Trash2, Users } from 'lucide-react'
import { DropSearchModal } from './DropSearchModal'

interface Competition {
  id: number
  name: string
  description: string
  type: 'XP' | 'DROPS'
  skill?: string
  boss?: string
  startDate: string
  endDate: string
  createdBy: string
  participantCount?: number
}

export const CompetitionManagementTab = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    type: 'XP' | 'DROPS'
    skill: string
    boss: string
    board_size?: number
    drops_grid?: any[]
    startDate: string
    endDate: string
  }>({
    name: '',
    description: '',
    type: 'XP',
    skill: '',
    boss: '',
    startDate: '',
    endDate: ''
  })
  const [showGridBuilder, setShowGridBuilder] = useState(false)
  const [gridSize, setGridSize] = useState<6 | 10 | 12>(6)
  const [gridItems, setGridItems] = useState<Array<{
    position: number
    itemName: string
    bossName: string
    imageUrl: string
  }>>([])
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [showDropModal, setShowDropModal] = useState(false)

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  const skills = [
    'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
    'slayer', 'farming', 'runecrafting', 'hunter', 'construction',
    'summoning', 'dungeoneering', 'divination', 'invention', 'archaeology', 'necromancy'
  ]

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/competitions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCompetitions(data.competitions || [])
      }
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const startDate = new Date(formData.startDate + 'T00:00:00.000Z')
      const endDate = new Date(formData.endDate + 'T00:00:00.000Z')
      
      if (startDate.getUTCHours() !== 0 || startDate.getUTCMinutes() !== 0 || 
          endDate.getUTCHours() !== 0 || endDate.getUTCMinutes() !== 0) {
        alert('Competition times must be at midnight UTC (00:00:00). Please adjust your dates.')
        return
      }

      const token = localStorage.getItem('access_token')
      const url = editingCompetition
        ? `${API_URL}/api/admin/competitions/${editingCompetition.id}`
        : `${API_URL}/api/admin/competitions`

      const method = editingCompetition ? 'PUT' : 'POST'

      const payload: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }

      if (formData.type === 'XP') {
        payload.skill = formData.skill || 'overall'
      } else if (formData.type === 'DROPS') {
        payload.board_size = gridSize
        payload.drops_grid = gridItems
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await fetchCompetitions()
        setShowCreateForm(false)
        setEditingCompetition(null)
        setShowGridBuilder(false)
        setGridItems([])
        setFormData({
          name: '',
          description: '',
          type: 'XP',
          skill: '',
          boss: '',
          startDate: '',
          endDate: ''
        })
      } else {
        const error = await response.json()
        alert(`Error: ${error.detail || 'Failed to save competition'}`)
      }
    } catch (error) {
      console.error('Error saving competition:', error)
      alert('Error saving competition')
    }
  }

  const handleDelete = async (competitionId: number) => {
    if (!confirm('Are you sure you want to delete this competition?')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/competitions/${competitionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await fetchCompetitions()
      }
    } catch (error) {
      console.error('Error deleting competition:', error)
    }
  }

  const startEdit = (competition: Competition) => {
    setEditingCompetition(competition)
    setFormData({
      name: competition.name,
      description: competition.description,
      type: competition.type,
      skill: competition.skill || '',
      boss: competition.boss || '',
      startDate: competition.startDate.split('T')[0],
      endDate: competition.endDate.split('T')[0]
    })
    setShowCreateForm(true)
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-blue-500' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  const handleDropSelect = (drop: any, bossName: string) => {
    if (selectedPosition === null) return
    
    const newGridItems = [...gridItems]
    const existingIndex = newGridItems.findIndex(item => item.position === selectedPosition)
    
    const newItem = {
      position: selectedPosition,
      itemName: drop.item_name,
      bossName: bossName,
      imageUrl: drop.file
    }
    
    if (existingIndex >= 0) {
      newGridItems[existingIndex] = newItem
    } else {
      newGridItems.push(newItem)
    }
    
    setGridItems(newGridItems)
    setSelectedPosition(null)
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading competitions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Competition Management</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Competition
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">
              {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Competition Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter competition name"
                    required
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'XP' | 'DROPS') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XP">XP Competition</SelectItem>
                      <SelectItem value="DROPS">Drop Competition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter competition description"
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>

              {formData.type === 'XP' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Skill
                  </label>
                  <Select
                    value={formData.skill}
                    onValueChange={(value) => setFormData({ ...formData, skill: value })}
                  >
                    <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skills.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'DROPS' && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    onClick={() => setShowGridBuilder(!showGridBuilder)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {showGridBuilder ? 'Hide' : 'Build'} Bingo Grid
                  </Button>

                  {showGridBuilder && (
                    <Card className="bg-slate-700/30 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-white">Bingo Grid Builder</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Grid Size
                            </label>
                            <Select
                              value={gridSize.toString()}
                              onValueChange={(value) => {
                                const size = parseInt(value) as 6 | 10 | 12
                                setGridSize(size)
                                setGridItems([])
                              }}
                            >
                              <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="6">6x6 (36 squares)</SelectItem>
                                <SelectItem value="10">10x10 (100 squares)</SelectItem>
                                <SelectItem value="12">12x12 (144 squares)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid gap-1" style={{
                            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
                          }}>
                            {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                              const item = gridItems.find(i => i.position === index)
                              return (
                                <div
                                  key={index}
                                  className="aspect-square border border-slate-600 rounded bg-slate-700/50 hover:bg-slate-700 cursor-pointer p-1"
                                  onClick={() => {
                                    setSelectedPosition(index)
                                    setShowDropModal(true)
                                  }}
                                >
                                  {item ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.itemName}
                                      className="w-full h-full object-contain"
                                      title={`${item.itemName} - ${item.bossName}`}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                                      +
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-slate-300 text-sm">
                              {gridItems.length} / {gridSize * gridSize} squares filled
                            </span>
                            <Button
                              type="button"
                              onClick={() => setGridItems([])}
                              variant="outline"
                              className="text-red-400 border-red-400"
                            >
                              Clear Grid
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingCompetition ? 'Update' : 'Create'} Competition
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingCompetition(null)
                    setFormData({
                      name: '',
                      description: '',
                      type: 'XP',
                      skill: '',
                      boss: '',
                      startDate: '',
                      endDate: ''
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Competitions List */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-blue-400" />
            <span>Active Competitions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No competitions created yet</p>
          ) : (
            <div className="space-y-4">
              {competitions.map((competition) => {
                const { status, color } = getCompetitionStatus(competition.startDate, competition.endDate)

                return (
                  <div key={competition.id} className="p-4 bg-slate-600/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-white font-semibold">{competition.name}</h3>
                        <Badge className={`${color} text-white capitalize`}>
                          {status}
                        </Badge>
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          {competition.type}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(competition)}
                          className="p-1 h-8 w-8"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(competition.id)}
                          className="p-1 h-8 w-8 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-slate-400 text-sm mb-2">{competition.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">
                          {competition.type === 'XP' ? 'Skill:' : 'Boss:'}
                        </span>
                        <span className="text-white ml-1 capitalize">
                          {competition.type === 'XP' ? competition.skill : competition.boss || 'All'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Start:</span>
                        <span className="text-white ml-1">
                          {new Date(competition.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">End:</span>
                        <span className="text-white ml-1">
                          {new Date(competition.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-white">
                          {competition.participantCount || 'Auto-enrolled'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DropSearchModal
        isOpen={showDropModal}
        onClose={() => {
          setShowDropModal(false)
          setSelectedPosition(null)
        }}
        onSelect={handleDropSelect}
        position={selectedPosition || 0}
      />
    </div>
  )
}
