import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Crown, Plus, Edit, Trash2 } from 'lucide-react'

interface CustomBadge {
  id: string
  name: string
  backgroundColor: string
  icon?: string
  description?: string
}

export const BadgeManagementTab = () => {
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBadge, setEditingBadge] = useState<CustomBadge | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    backgroundColor: '#3b82f6',
    icon: '',
    description: ''
  })

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
    
    try {
      const token = localStorage.getItem('access_token')
      const url = editingBadge 
        ? `${API_URL}/api/admin/badges/${editingBadge.id}`
        : `${API_URL}/api/admin/badges`
      
      const method = editingBadge ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchCustomBadges()
        setShowCreateForm(false)
        setEditingBadge(null)
        setFormData({ name: '', backgroundColor: '#3b82f6', icon: '', description: '' })
      }
    } catch (error) {
      console.error('Error saving badge:', error)
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
    setFormData({
      name: badge.name,
      backgroundColor: badge.backgroundColor,
      icon: badge.icon || '',
      description: badge.description || ''
    })
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
                  Background Color
                </label>
                <Input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="bg-slate-600 border-slate-500 h-10 w-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Icon URL (optional)
                </label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="https://example.com/icon.png"
                  className="bg-slate-600 border-slate-500 text-white"
                />
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
                    setFormData({ name: '', backgroundColor: '#3b82f6', icon: '', description: '' })
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
                    <div
                      className="px-3 py-1 text-sm font-semibold flex items-center space-x-2 rounded-md text-white"
                      style={{ backgroundColor: badge.backgroundColor }}
                    >
                      {badge.icon && (
                        <img src={badge.icon} alt={badge.name} className="w-4 h-4" />
                      )}
                      <span>{badge.name}</span>
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
                  {badge.description && (
                    <p className="text-sm text-slate-400">{badge.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
