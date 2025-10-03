import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { Button } from './button'
import { RunePixelsTooltip } from './tooltip'

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
}

export const BadgeAssignmentModal: React.FC<BadgeAssignmentModalProps> = ({
  isOpen,
  onClose,
  customBadges,
  assignedBadgeIds,
  onSave,
  memberUsername
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

  const handleSave = () => {
    onSave(selectedBadgeIds)
    onClose()
  }

  const handleCancel = () => {
    setSelectedBadgeIds([...assignedBadgeIds])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Assign Custom Badges - {memberUsername}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {customBadges.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No custom badges available
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {customBadges.map((badge) => {
                const isSelected = selectedBadgeIds.includes(badge.id)
                const backgroundColor = badge.gradientColors 
                  ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                  : badge.backgroundColor || '#6b7280'
                
                return (
                  <RunePixelsTooltip
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
                        relative cursor-pointer rounded-lg p-3 transition-all duration-200
                        ${isSelected 
                          ? 'ring-2 ring-blue-400 bg-blue-900/30' 
                          : 'hover:bg-slate-700/50'
                        }
                      `}
                    >
                      <div
                        className="flex flex-col items-center space-y-2 p-2 rounded-md text-white text-xs font-semibold"
                        style={{ background: backgroundColor }}
                      >
                        <img
                          src={badge.imageUrl}
                          alt={badge.name}
                          className="w-8 h-8"
                        />
                        <span className="text-center leading-tight">
                          {badge.name}
                        </span>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </RunePixelsTooltip>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="text-slate-300 border-slate-600 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
