import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Award, Plus, Edit, Trash2, Lock } from 'lucide-react'
import { Spinner } from '../ui/spinner'
import '../../styles/fantasy-container.css'

interface CustomBadge {
  id: string
  name: string
  description?: string
  imagePath: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
  allowUsernameColorOverride?: boolean
  createdBy: string
  createdAt: string
  competitions?: any[]
  category?: 'CUSTOM' | 'SKILL' | 'DXP' | 'PVM' | 'API'
  isSystemBadge?: boolean
  skillName?: string
  hierarchyPath?: string
  hierarchyTier?: number
}

interface CategorizedBadges {
  CUSTOM: CustomBadge[]
  SKILL: CustomBadge[]
  DXP: CustomBadge[]
  PVM: CustomBadge[]
  API: CustomBadge[]
}

export const BadgeManagementTab = () => {
  const [categorizedBadges, setCategorizedBadges] = useState<CategorizedBadges>({
    CUSTOM: [],
    SKILL: [],
    DXP: [],
    PVM: [],
    API: []
  })
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState<CustomBadge | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    backgroundColor: '#3b82f6',
    gradientColor1: '#3b82f6',
    gradientColor2: '#1d4ed8',
    allowUsernameColorOverride: false
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid')

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchBadgesByCategory()
  }, [])

  const fetchBadgesByCategory = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/badges/by-category`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCategorizedBadges(data)
      }
    } catch (error) {
      console.error('Error fetching badges by category:', error)
    } finally {
      setLoading(false)
    }
  }

  const seedSystemBadges = async () => {
    setSeeding(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/badges/seed-system-badges`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`System badges seeded: ${data.created_count} created, ${data.skipped_count} already existed`)
        await fetchBadgesByCategory()
      } else {
        const errorData = await response.json()
        alert(errorData.detail || 'Error seeding system badges')
      }
    } catch (error) {
      console.error('Error seeding system badges:', error)
      alert('Error seeding system badges')
    } finally {
      setSeeding(false)
    }
  }

  // Legacy function for backward compatibility
  const fetchCustomBadges = async () => {
    await fetchBadgesByCategory()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile && !editingBadge) {
      alert('Please select a badge image file')
      return
    }
    
    try {
      const token = localStorage.getItem('access_token')
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      
      if (colorMode === 'solid') {
        formDataToSend.append('background_color', formData.backgroundColor)
      } else {
        formDataToSend.append('gradient_color1', formData.gradientColor1)
        formDataToSend.append('gradient_color2', formData.gradientColor2)
      }
      
      if (selectedFile) {
        formDataToSend.append('badge_file', selectedFile)
      }
      
      formDataToSend.append('allow_username_color_override', formData.allowUsernameColorOverride.toString())
      
      const url = editingBadge
        ? `${API_URL}/api/admin/badges/${editingBadge.id}`
        : `${API_URL}/api/admin/badges`
      
      const method = editingBadge ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })

      if (response.ok) {
        await fetchCustomBadges()
        setShowCreateForm(false)
        setEditingBadge(null)
        setSelectedFile(null)
        setFormData({ 
          name: '', 
          description: '',
          backgroundColor: '#3b82f6',
          gradientColor1: '#3b82f6',
          gradientColor2: '#1d4ed8',
          allowUsernameColorOverride: false
        })
        setColorMode('solid')
      } else {
        const errorData = await response.json()
        alert(errorData.detail || 'Error saving badge')
      }
    } catch (error) {
      console.error('Error saving badge:', error)
      alert('Error saving badge')
    }
  }

  const handleDelete = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge?')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/badges/${badgeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await fetchCustomBadges()
      }
    } catch (error) {
      console.error('Error deleting badge:', error)
    }
  }

  const startEdit = (badge: CustomBadge) => {
    setEditingBadge(badge)
    
    const hasGradient = badge.gradientColors && Array.isArray(badge.gradientColors) && badge.gradientColors.length === 2
    const gradColors = badge.gradientColors || []
    
    setFormData({
      name: badge.name,
      description: badge.description || '',
      backgroundColor: badge.backgroundColor || '#3b82f6',
      gradientColor1: hasGradient ? gradColors[0] : '#3b82f6',
      gradientColor2: hasGradient ? gradColors[1] : '#1d4ed8',
      allowUsernameColorOverride: badge.allowUsernameColorOverride || false
    })
    
    setColorMode(hasGradient ? 'gradient' : 'solid')
    
    setSelectedFile(null)
    setShowCreateForm(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Spinner size="md" />
        <div className="text-center text-slate-400">Loading badges...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Badge Management</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={seedSystemBadges}
            disabled={seeding}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {seeding ? 'Seeding...' : 'Seed System Badges'}
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-theme-button hover:bg-theme-button-hover"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Badge
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="fantasy-section">
          <h3 className="text-white font-semibold mb-4" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>
            {editingBadge ? 'Edit Badge' : 'Create New Badge'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Badge Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter badge name"
                  required
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Badge Image {!editingBadge && '*'}
                </label>
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-slate-600 border-slate-500 text-white"
                  required={!editingBadge}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Accepted formats: PNG, JPG, SVG. Max size: 2MB
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (optional)
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Badge description"
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Background Style
                </label>
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="solid"
                      checked={colorMode === 'solid'}
                      onChange={(e) => setColorMode(e.target.value as 'solid' | 'gradient')}
                      className="mr-2"
                    />
                    <span className="text-white">Solid Color</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="gradient"
                      checked={colorMode === 'gradient'}
                      onChange={(e) => setColorMode(e.target.value as 'solid' | 'gradient')}
                      className="mr-2"
                    />
                    <span className="text-white">Gradient</span>
                  </label>
                </div>
                
                {colorMode === 'solid' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-full h-10 rounded border border-slate-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gradient Color 1
                      </label>
                      <input
                        type="color"
                        value={formData.gradientColor1}
                        onChange={(e) => setFormData({ ...formData, gradientColor1: e.target.value })}
                        className="w-full h-10 rounded border border-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gradient Color 2
                      </label>
                      <input
                        type="color"
                        value={formData.gradientColor2}
                        onChange={(e) => setFormData({ ...formData, gradientColor2: e.target.value })}
                        className="w-full h-10 rounded border border-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowUsernameColorOverride}
                    onChange={(e) => setFormData({ ...formData, allowUsernameColorOverride: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Allow this badge to override username color
                  </span>
                </label>
                <p className="text-xs text-slate-400 mt-1 ml-6">
                  Users with this badge can select it to apply its color to their username site-wide
                </p>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingBadge ? 'Update' : 'Create'} Badge
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingBadge(null)
                    setSelectedFile(null)
                    setFormData({ 
                      name: '', 
                      description: '',
                      backgroundColor: '#3b82f6',
                      gradientColor1: '#3b82f6',
                      gradientColor2: '#1d4ed8',
                      allowUsernameColorOverride: false
                    })
                    setColorMode('solid')
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {/* Custom Badges Section (Editable) */}
      <div className="fantasy-section">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-4 h-4 text-slate-400" />
          <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Custom Badges</h3>
        </div>
        {categorizedBadges.CUSTOM.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No custom badges created yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categorizedBadges.CUSTOM.map((badge) => {
              const backgroundColor = badge.gradientColors 
                ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                : badge.backgroundColor || '#6b7280'
              
              return (
                <div key={badge.id} className="flex items-center justify-between">
                  <div
                    className="flex-1 px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                    style={{
                      background: backgroundColor
                    }}
                  >
                    <img
                      src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                      alt={badge.name} 
                      className="w-4 h-4"
                    />
                    <span>{badge.name}</span>
                    {badge.competitions && badge.competitions.length > 0 && (
                      <span title={`Linked to ${badge.competitions.length} competition(s)`}>
                        <Lock className="w-3 h-3 ml-1 text-yellow-400" />
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(badge)}
                      className="p-1 h-8 w-8 bg-theme-button hover:bg-theme-button-hover border-theme-accent text-white"
                      title="Edit badge"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(badge.id)}
                      className="p-1 h-8 w-8 bg-theme-button hover:bg-theme-button-hover border-theme-accent text-red-400 hover:text-red-300"
                      title="Delete badge"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Skill Competition Badges Section (Read-Only) */}
      <div className="fantasy-section opacity-90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Skill Competition Badges</h3>
            <span title="System badges - read only"><Lock className="w-3 h-3 text-slate-500" /></span>
          </div>
          <span className="text-xs text-slate-500">Auto-awarded for skill competitions</span>
        </div>
        {categorizedBadges.SKILL.length === 0 ? (
          <p className="text-slate-400 text-center py-4 text-sm">No skill badges seeded yet. Click "Seed System Badges" above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorizedBadges.SKILL.map((badge) => {
              const backgroundColor = badge.gradientColors 
                ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                : badge.backgroundColor || '#6b7280'
              
              return (
                <div
                  key={badge.id}
                  className="px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{ background: backgroundColor }}
                  title={badge.skillName ? `Awarded for winning ${badge.skillName} competitions` : badge.name}
                >
                  {badge.imageUrl && (
                    <img
                      src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                      alt={badge.name} 
                      className="w-4 h-4"
                    />
                  )}
                  <span>{badge.name}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DXP Badges Section (Read-Only) */}
      <div className="fantasy-section opacity-90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>DXP Badges</h3>
            <span title="System badges - read only"><Lock className="w-3 h-3 text-slate-500" /></span>
          </div>
          <span className="text-xs text-slate-500">Hierarchical - upgrades with each DXP win</span>
        </div>
        {categorizedBadges.DXP.length === 0 ? (
          <p className="text-slate-400 text-center py-4 text-sm">No DXP badges seeded yet. Click "Seed System Badges" above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorizedBadges.DXP.sort((a, b) => (a.hierarchyTier || 0) - (b.hierarchyTier || 0)).map((badge) => {
              const backgroundColor = badge.gradientColors 
                ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                : badge.backgroundColor || '#6b7280'
              
              return (
                <div
                  key={badge.id}
                  className="px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{ background: backgroundColor }}
                  title={`Tier ${badge.hierarchyTier || 1} DXP badge`}
                >
                  {badge.imageUrl && (
                    <img
                      src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                      alt={badge.name} 
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  <span>{badge.name}</span>
                  <span className="text-xs opacity-70">T{badge.hierarchyTier || 1}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PvM Badges Section (Read-Only) */}
      <div className="fantasy-section opacity-90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>PvM Badges</h3>
            <span title="System badges - read only"><Lock className="w-3 h-3 text-slate-500" /></span>
          </div>
          <span className="text-xs text-slate-500">Hierarchical - upgrades with each PvM win</span>
        </div>
        {categorizedBadges.PVM.length === 0 ? (
          <p className="text-slate-400 text-center py-4 text-sm">No PvM badges seeded yet. Click "Seed System Badges" above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorizedBadges.PVM.sort((a, b) => (a.hierarchyTier || 0) - (b.hierarchyTier || 0)).map((badge) => {
              const backgroundColor = badge.gradientColors 
                ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                : badge.backgroundColor || '#6b7280'
              
              return (
                <div
                  key={badge.id}
                  className="px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{ background: backgroundColor }}
                  title={`Tier ${badge.hierarchyTier || 1} PvM badge`}
                >
                  {badge.imageUrl && (
                    <img
                      src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                      alt={badge.name} 
                      className="w-4 h-4"
                    />
                  )}
                  <span>{badge.name}</span>
                  <span className="text-xs opacity-70">T{badge.hierarchyTier || 1}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* API Badges Section (Read-Only) */}
      <div className="fantasy-section opacity-90">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>API Badges</h3>
            <span title="System badges - read only"><Lock className="w-3 h-3 text-slate-500" /></span>
          </div>
          <span className="text-xs text-slate-500">Auto-awarded based on game achievements</span>
        </div>
        {categorizedBadges.API.length === 0 ? (
          <p className="text-slate-400 text-center py-4 text-sm">No API badges seeded yet. Click "Seed System Badges" above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorizedBadges.API.map((badge) => {
              const backgroundColor = badge.gradientColors 
                ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                : badge.backgroundColor || '#6b7280'
              
              return (
                <div
                  key={badge.id}
                  className="px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                  style={{ background: backgroundColor }}
                  title={badge.hierarchyPath ? `Hierarchical: ${badge.hierarchyPath}` : badge.name}
                >
                  {badge.imageUrl && (
                    <img
                      src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlight.fly.dev${badge.imageUrl}`}
                      alt={badge.name} 
                      className="w-4 h-4"
                    />
                  )}
                  <span>{badge.name}</span>
                  {badge.hierarchyTier && <span className="text-xs opacity-70">T{badge.hierarchyTier}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
