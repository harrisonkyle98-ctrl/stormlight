import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Trophy, Plus, Edit, Trash2, Users, Calendar, BarChart3 } from 'lucide-react'
import { Spinner } from '../ui/spinner'
import { toast } from 'sonner'
import { DropSearchModal } from './DropSearchModal'
import { getSkillIcon } from '../../utils/skillIcons'
import '../../styles/fantasy-container.css'

interface Competition {
  id: string
  name: string
  description: string
  type: 'XP' | 'DROPS' | 'XP_GAIN' | 'BOSS_KILLS'
  skill?: string
  boss?: string
  boardSize?: number
  startDate: string
  endDate: string
  createdBy: string
  participantCount?: number
  awardBadge?: boolean
  isDxpEvent?: boolean
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
    reward_first_gp?: string
    reward_second_gp?: string
    reward_third_gp?: string
    award_badge: boolean
    is_dxp_event: boolean
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  }>({
    name: '',
    description: '',
    type: 'XP',
    skill: '',
    boss: '',
    award_badge: false,
    is_dxp_event: false,
    startDate: '',
    startTime: '00:00',
    endDate: '',
    endTime: '00:00'
  })
  const [showGridBuilder, setShowGridBuilder] = useState(false)
  const [gridSize, setGridSize] = useState<3 | 5 | 7 | 9 | 11>(5)
  const [gridItems, setGridItems] = useState<Array<{
    position: number
    itemName: string
    bossName: string
    imageUrl: string
  }>>([])
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [showDropModal, setShowDropModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit= async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    if (formData.type === 'DROPS') {
      const requiredSquares = gridSize * gridSize
      if (gridItems.length < requiredSquares) {
        toast.error(`Please fill all ${requiredSquares} grid squares before creating the competition. Currently filled: ${gridItems.length}/${requiredSquares}`)
        setIsSubmitting(false)
        return
      }
    }

    try {
      const token = localStorage.getItem('access_token')
      const url = editingCompetition
        ? `${API_URL}/api/admin/competitions/${editingCompetition.id}`
        : `${API_URL}/api/admin/competitions`

      const method = editingCompetition ? 'PUT' : 'POST'

      const typeMapping: Record<string, string> = {
        'XP': 'XP_GAIN',
        'DROPS': 'BOSS_KILLS'
      }

      const payload: any = {
        name: formData.name,
        description: formData.description,
        type: typeMapping[formData.type] || formData.type,
        start_date: `${formData.startDate}T${formData.startTime}:00.000Z`,
        end_date: `${formData.endDate}T${formData.endTime}:00.000Z`,
        reward_first_gp: formData.reward_first_gp ? parseInt(formData.reward_first_gp) : null,
        reward_second_gp: formData.reward_second_gp ? parseInt(formData.reward_second_gp) : null,
        reward_third_gp: formData.reward_third_gp ? parseInt(formData.reward_third_gp) : null,
        award_badge: formData.award_badge,
        is_dxp_event: formData.is_dxp_event
      }

      if (formData.type === 'XP') {
        payload.skill = formData.skill || 'overall'
      } else if (formData.type === 'DROPS') {
        payload.board_size = gridSize
        payload.drops_grid = gridItems
      }

      console.log('Submitting competition:', payload)

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Competition saved successfully:', data)
        
        toast.success(editingCompetition ? 'Competition updated successfully!' : 'Competition created successfully!')
        
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
          award_badge: false,
          is_dxp_event: false,
          startDate: '',
          startTime: '00:00',
          endDate: '',
          endTime: '00:00',
          reward_first_gp: '',
          reward_second_gp: '',
          reward_third_gp: ''
        })
      } else {
        const error = await response.json()
        console.error('Competition save error:', error)
        toast.error(error.detail || 'Failed to save competition. Please try again.')
      }
    } catch (error) {
      console.error('Error saving competition:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (competitionId: string) => {
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
    
    const normalizedType = (competition.type === 'XP_GAIN' ? 'XP' : 
                           competition.type === 'BOSS_KILLS' ? 'DROPS' : 
                           competition.type) as 'XP' | 'DROPS'
    
    const startDateTime = new Date(competition.startDate)
    const endDateTime = new Date(competition.endDate)
    
    setFormData({
      name: competition.name,
      description: competition.description,
      type: normalizedType,
      skill: competition.skill || '',
      boss: competition.boss || '',
      award_badge: competition.awardBadge || false,
      is_dxp_event: competition.isDxpEvent || false,
      startDate: competition.startDate.split('T')[0],
      startTime: startDateTime.toISOString().substring(11, 16),
      endDate: competition.endDate.split('T')[0],
      endTime: endDateTime.toISOString().substring(11, 16)
    })
    setShowCreateForm(true)
  }

  const getCompetitionStatus = (startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { status: 'upcoming', color: 'bg-[#60a5fa]' }
    if (now > end) return { status: 'ended', color: 'bg-gray-500' }
    return { status: 'active', color: 'bg-green-500' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const datePart = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
    const timePart = date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    })
    return { datePart, timePart }
  }

  const getCompetitionTypeLabel = (type: string): string => {
    if (type === 'XP' || type === 'XP_GAIN') return 'Skilling'
    if (type === 'DROPS' || type === 'BOSS_KILLS') return 'PvM'
    return type
  }

  const handleDropSelect = (drop: any, bossName: string) => {
    if (selectedPosition === null) return
    
    const isDuplicate = gridItems.some(item => 
      item.itemName === drop.item_name && item.bossName === bossName && item.position !== selectedPosition
    )
    
    if (isDuplicate) {
      alert(`${drop.item_name} from ${bossName} is already in the grid. Each item can only be selected once.`)
      return
    }
    
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
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Spinner size="md" />
        <div className="text-center text-slate-400">Loading competitions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Competition Management</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-theme-button hover:bg-theme-button-hover"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Competition
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="fantasy-section">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>
              {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
            </h3>
          </div>
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
                    <div className="fantasy-section">
                      <div className="flex items-center space-x-2 mb-4">
                        <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Bingo Grid Builder</h3>
                      </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Grid Size
                            </label>
                            <Select
                              value={gridSize.toString()}
                              onValueChange={(value) => {
                                const size = parseInt(value) as 3 | 5 | 7 | 9 | 11
                                setGridSize(size)
                                setGridItems([])
                              }}
                            >
                              <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">3x3 (9 squares)</SelectItem>
                                <SelectItem value="5">5x5 (25 squares)</SelectItem>
                                <SelectItem value="7">7x7 (49 squares)</SelectItem>
                                <SelectItem value="9">9x9 (81 squares)</SelectItem>
                                <SelectItem value="11">11x11 (121 squares)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div 
                            className="grid gap-1 max-w-full overflow-auto" 
                            style={{
                              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                              maxHeight: '500px',
                              aspectRatio: '1/1'
                            }}
                          >
                            {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                              const item = gridItems.find(i => i.position === index)
                              return (
                                <div
                                  key={index}
                                  className="aspect-square border border-slate-600 rounded bg-slate-700/50 hover:bg-slate-700 cursor-pointer p-0.5 relative"
                                  onClick={() => {
                                    setSelectedPosition(index)
                                    setShowDropModal(true)
                                  }}
                                >
                                  {item ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <img
                                        src={item.imageUrl}
                                        alt={item.itemName}
                                        style={{ width: '32px', height: '32px' }}
                                        title={`${item.itemName} - ${item.bossName}`}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                                      +
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${
                              gridItems.length === gridSize * gridSize 
                                ? 'text-green-400 font-semibold' 
                                : 'text-slate-300'
                            }`}>
                              {gridItems.length} / {gridSize * gridSize} squares filled
                              {gridItems.length === gridSize * gridSize && ' ✓'}
                            </span>
                            <Button
                              type="button"
                              onClick={() => setGridItems([])}
                              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
                            >
                              Clear Grid
                            </Button>
                          </div>
                        </div>
                    </div>
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
                    Start Time (UTC)
                  </label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Time (UTC)
                  </label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Competition Rewards</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      1st Place GP Reward
                    </label>
                    <Input
                      type="number"
                      value={formData.reward_first_gp || ''}
                      onChange={(e) => setFormData({ ...formData, reward_first_gp: e.target.value })}
                      placeholder="e.g., 100000000"
                      disabled={!!(editingCompetition && new Date() >= new Date(editingCompetition.startDate))}
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      2nd Place GP Reward
                    </label>
                    <Input
                      type="number"
                      value={formData.reward_second_gp || ''}
                      onChange={(e) => setFormData({ ...formData, reward_second_gp: e.target.value })}
                      placeholder="e.g., 50000000"
                      disabled={!!(editingCompetition && new Date() >= new Date(editingCompetition.startDate))}
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      3rd Place GP Reward
                    </label>
                    <Input
                      type="number"
                      value={formData.reward_third_gp || ''}
                      onChange={(e) => setFormData({ ...formData, reward_third_gp: e.target.value })}
                      placeholder="e.g., 25000000"
                      disabled={!!(editingCompetition && new Date() >= new Date(editingCompetition.startDate))}
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="award_badge"
                      checked={formData.award_badge}
                      onChange={(e) => setFormData({ ...formData, award_badge: e.target.checked })}
                      disabled={!!(editingCompetition && new Date() >= new Date(editingCompetition.startDate))}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="award_badge" className="text-sm font-medium text-slate-300">
                      Award a badge to the 1st place winner
                    </label>
                  </div>
                  {formData.award_badge && (
                    <p className="text-xs text-slate-400 ml-7">
                      {formData.type === 'DROPS' 
                        ? 'A PvM badge will be automatically awarded (upgrades if winner already has one)'
                        : formData.skill === 'overall'
                          ? formData.is_dxp_event
                            ? 'A DXP badge will be automatically awarded (upgrades if winner already has one)'
                            : 'Select "DXP Event" below to award a DXP badge, or the Overall Champion badge will be awarded'
                          : `The ${formData.skill ? formData.skill.charAt(0).toUpperCase() + formData.skill.slice(1) : 'skill'} Champion badge will be automatically awarded`
                      }
                    </p>
                  )}
                  
                  {formData.type === 'XP' && formData.skill === 'overall' && formData.award_badge && (
                    <div className="flex items-center space-x-3 ml-7">
                      <input
                        type="checkbox"
                        id="is_dxp_event"
                        checked={formData.is_dxp_event}
                        onChange={(e) => setFormData({ ...formData, is_dxp_event: e.target.checked })}
                        disabled={!!(editingCompetition && new Date() >= new Date(editingCompetition.startDate))}
                        className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-yellow-500 focus:ring-yellow-500"
                      />
                      <label htmlFor="is_dxp_event" className="text-sm font-medium text-yellow-400">
                        This is a DXP Event
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (editingCompetition ? 'Updating...' : 'Creating...') 
                    : (editingCompetition ? 'Update' : 'Create') + ' Competition'}
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
                      award_badge: false,
                      is_dxp_event: false,
                      startDate: '',
                      startTime: '00:00',
                      endDate: '',
                      endTime: '00:00',
                      reward_first_gp: '',
                      reward_second_gp: '',
                      reward_third_gp: ''
                    })
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {/* Competitions List - No wrapper, matches public Competitions page styling */}
      {competitions.length === 0 ? (
        <div className="fantasy-section">
          <div className="p-8 text-center">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No competitions created yet
            </h3>
            <p className="text-slate-400">
              Create a new competition to get started!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-6">
            {competitions.map((competition) => {
              const { status } = getCompetitionStatus(competition.startDate, competition.endDate)

              return (
                <div key={competition.id} className="competition-entry">
                  {/* Fantasy Header Ribbon - Color based on status: Active=green, Upcoming=blue, Ended=grey */}
                  <div className={`competition-header-plate ${status === 'active' ? 'competition-header-plate--active' : status === 'ended' ? 'competition-header-plate--ended' : ''}`}>
                    <div className="competition-header-plate-content">
                      {/* Centered title */}
                      <div className="competition-header-plate-title">
                        {competition.name}
                      </div>
                      {/* Icon positioned on the right */}
                      {competition.type === 'XP' || competition.type === 'XP_GAIN' ? (
                        getSkillIcon(competition.skill || 'overall') ? (
                          <img 
                            src={getSkillIcon(competition.skill || 'overall')!} 
                            alt={competition.skill}
                            className="competition-header-plate-icon"
                          />
                        ) : null
                      ) : (
                        <span className="competition-header-plate-icon text-2xl">💀</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Inner panel - content below the ribbon header */}
                  <div className="fantasy-section">
                    {/* Description */}
                    {competition.description && (
                      <p className="text-slate-400 mb-4 text-sm">
                        {competition.description}
                      </p>
                    )}
                  
                    {/* Content section */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-400">Start Date</p>
                            <p className="text-white font-medium">
                              {formatDate(competition.startDate).datePart}
                            </p>
                            <p className="text-white font-medium text-sm">
                              {formatDate(competition.startDate).timePart}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-400">End Date</p>
                            <p className="text-white font-medium">
                              {formatDate(competition.endDate).datePart}
                            </p>
                            <p className="text-white font-medium text-sm">
                              {formatDate(competition.endDate).timePart}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-400">Type</p>
                            <p className="text-white font-medium">
                              {getCompetitionTypeLabel(competition.type)}
                            </p>
                          </div>
                        </div>
                        {(competition.type === 'XP' || competition.type === 'XP_GAIN') && competition.skill && (
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">Skill</p>
                              <p className="text-white font-medium capitalize">
                                {competition.skill}
                              </p>
                            </div>
                          </div>
                        )}
                        {(competition.type === 'DROPS' || competition.type === 'BOSS_KILLS') && competition.boardSize && (
                          <div className="flex items-center space-x-2">
                            <Trophy className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-slate-400">Grid Size</p>
                              <p className="text-white font-medium">
                                {competition.boardSize}x{competition.boardSize}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-400">Participants</p>
                            <p className="text-white font-medium">
                              Auto-Enrolled
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Admin Controls - Edit and Delete buttons */}
                      <div className="flex justify-end pt-4 border-t border-slate-700">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(competition)}
                            className="bg-theme-button hover:bg-theme-button-hover border-theme-accent text-white"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(competition.id)}
                            className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
