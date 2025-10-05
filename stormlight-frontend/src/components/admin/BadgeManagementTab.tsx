import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Crown, Plus, Edit, Trash2 } from 'lucide-react'

interface CustomBadge {
  id: string
  name: string
  description?: string
  imagePath: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
  createdBy: string
  createdAt: string
}

export const BadgeManagementTab = () => {
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState<CustomBadge | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    backgroundColor: '#3b82f6',
    gradientColor1: '#3b82f6',
    gradientColor2: '#1d4ed8'
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>('solid')

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCustomBadges()
  }, [])

  const fetchCustomBadges = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/admin/badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomBadges(data.badges || [])
      }
    } catch (error) {
      console.error('Error fetching custom badges:', error)
    } finally {
      setLoading(false)
    }
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
          gradientColor2: '#1d4ed8'
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
      gradientColor2: hasGradient ? gradColors[1] : '#1d4ed8'
    })
    
    setColorMode(hasGradient ? 'gradient' : 'solid')
    
    setSelectedFile(null)
    setShowCreateForm(true)
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading badges...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Custom Badge Management</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Badge
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">
              {editingBadge ? 'Edit Badge' : 'Create New Badge'}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                      gradientColor2: '#1d4ed8'
                    })
                    setColorMode('solid')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Badges List */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span>Custom Badges</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customBadges.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No custom badges created yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customBadges.map((badge) => (
                <div key={badge.id} className="p-4 bg-slate-600/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={`https://stormlight.fly.dev${badge.imageUrl}`} 
                        alt={badge.name} 
                        className="w-8 h-8 rounded object-cover"
                      />
                      <div>
                        <span className="text-white font-medium">{badge.name}</span>
                        {badge.description && (
                          <p className="text-sm text-slate-400">{badge.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(badge)}
                        className="p-1 h-8 w-8"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(badge.id)}
                        className="p-1 h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
