import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { Button } from './button'
import { Tooltip } from './tooltip'

interface CustomBadge {
  id: string
  name: string
  description?: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
}

interface BadgeAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  customBadges: CustomBadge[]
  assignedBadgeIds: string[]
  onSave: (selectedBadgeIds: string[]) => void
  memberUsername: string
  loading?: boolean
  error?: string | null
}

export const BadgeAssignmentModal: React.FC<BadgeAssignmentModalProps> = ({
  isOpen,
  onClose,
  customBadges,
  assignedBadgeIds,
  onSave,
  memberUsername,
  loading = false,
  error = null
}) => {
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setSelectedBadgeIds([...assignedBadgeIds])
    }
  }, [isOpen, assignedBadgeIds])

  const handleBadgeToggle = (badgeId: string) => {
    setSelectedBadgeIds(prev => 
      prev.includes(badgeId)
        ? prev.filter(id => id !== badgeId)
        : [...prev, badgeId]
    )
  }

  const handleSave = async () => {
    try {
      await onSave(selectedBadgeIds)
      onClose()
    } catch (error) {
    }
  }

  const handleCancel = () => {
    setSelectedBadgeIds([...assignedBadgeIds])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Assign Custom Badges - {memberUsername}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-400">Loading badges...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-400">{error}</div>
            </div>
          ) : customBadges.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No custom badges available
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {customBadges.map((badge) => {
                const isSelected = selectedBadgeIds.includes(badge.id)
                const backgroundColor = badge.gradientColors 
                  ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                  : badge.backgroundColor || '#6b7280'
                
                return (
                  <Tooltip
                    key={badge.id}
                    content={
                      <div>
                        <div className="font-semibold text-white">{badge.name}</div>
                        {badge.description && (
                          <div className="text-slate-300 text-sm mt-1">
                            {badge.description}
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div
                      onClick={() => handleBadgeToggle(badge.id)}
                      className={`
                        relative cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? 'ring-2 ring-blue-400' 
                          : ''
                        }
                      `}
                    >
                      <div
                        className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white"
                        style={{ background: backgroundColor }}
                      >
                        <img
                          src={badge.imageUrl}
                          alt={badge.name}
                          className="w-4 h-4"
                        />
                        <span>{badge.name}</span>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-theme-button hover:bg-theme-button-hover text-white disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
