import React, { useEffect, useRef, useMemo } from 'react'
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
  FloatingArrow,
  Placement
} from '@floating-ui/react'
import { X } from 'lucide-react'
import { useHoverPersist } from '../../../hooks/useHoverPersist'
import './tooltip-advanced.css'

export interface TooltipRow {
  iconSrc?: string
  label: string
  value: string
}

export interface AdvancedTooltipProps {
  children: React.ReactNode
  title: string
  description?: string | React.ReactNode
  rows?: TooltipRow[]
  footerText?: string
  placement?: 'top' | 'bottom'
  openDelayMs?: number
  persistMs?: number
  imageSrc?: string
  className?: string
  onOpenChange?: (open: boolean) => void
}

export const AdvancedTooltip: React.FC<AdvancedTooltipProps> = ({
  children,
  title,
  description,
  rows = [],
  footerText,
  placement = 'top',
  openDelayMs = 150,
  persistMs = 3000,
  imageSrc,
  className = '',
  onOpenChange
}) => {
  const arrowRef = useRef<SVGSVGElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<{x: number; y: number} | null>(null)
  const rafRef = useRef<number | null>(null)

  const {
    open,
    persisted,
    progressActive,
    onMouseEnter,
    onMouseLeave,
    setOpen
  } = useHoverPersist({
    delay: openDelayMs,
    persistMs,
    onOpenChange
  })

  const virtualRef = useMemo(() => ({
    getBoundingClientRect: () => {
      const x = cursorRef.current?.x ?? 0
      const y = cursorRef.current?.y ?? 0
      return {
        width: 0,
        height: 0,
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
        toJSON: () => {}
      } as DOMRect
    }
  }), [])

  const { refs, floatingStyles, context, update } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: placement as Placement,
    middleware: [
      offset(12),
      flip({
        fallbackPlacements: ['top', 'bottom', 'left', 'right']
      }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef })
    ],
    whileElementsMounted: autoUpdate
  })

  useEffect(() => {
    if (open && cursorRef.current) {
      refs.setReference(virtualRef as any)
      update()
    } else if (triggerRef.current) {
      refs.setReference(triggerRef.current)
    }
  }, [open, refs, update, virtualRef])

  useEffect(() => {
    if (persisted && open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false)
        }
      }
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [persisted, open, setOpen])

  useEffect(() => {
    if (!persisted || !open) return
    
    const handleOutsideClick = (e: MouseEvent) => {
      const floating = refs.floating.current
      const reference = triggerRef.current
      if (
        floating &&
        !floating.contains(e.target as Node) &&
        reference &&
        !reference.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleOutsideClick, true)
    return () => document.removeEventListener('mousedown', handleOutsideClick, true)
  }, [persisted, open, refs, setOpen])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleMouseEnter = (e: React.MouseEvent) => {
    cursorRef.current = { x: e.clientX, y: e.clientY }
    onMouseEnter()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!open || persisted) return
    
    cursorRef.current = { x: e.clientX, y: e.clientY }
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(() => {
      update()
    })
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={onMouseLeave}
        className="contents"
      >
        {children}
      </div>

      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className={`tooltip-advanced ${className}`}
          role="tooltip"
          aria-hidden={!open}
        >
          {/* Inner wrapper to clip progress bar inside rounded corners */}
          <div className="tooltip-inner">
            {/* Progress Bar */}
            <div
              className={`tooltip-progress-bar ${progressActive ? 'active' : ''}`}
              style={{
                animationDuration: progressActive ? `${persistMs}ms` : '0ms'
              }}
            />

            {/* Close Button - Only show on persistent tooltips */}
            {persisted && (
              <button
                onClick={() => setOpen(false)}
                className="tooltip-close-button"
                aria-label="Close tooltip"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Content Container */}
            <div className="tooltip-content">
              {/* Header with Image and Title */}
              <div className="tooltip-header">
                {imageSrc && (
                  <div className="tooltip-image">
                    <img src={imageSrc} alt="" />
                  </div>
                )}
                <div className="tooltip-header-text">
                  <h3 className="tooltip-title">{title}</h3>
                  {description && (
                    <div className="tooltip-description">{description}</div>
                  )}
                </div>
              </div>

              {/* Rows */}
              {rows.length > 0 && (
                <div className="tooltip-rows">
                  {rows.map((row, index) => (
                    <div key={index} className="tooltip-row">
                      {row.iconSrc && (
                        <div className="tooltip-row-icon">
                          <img src={row.iconSrc} alt="" />
                        </div>
                      )}
                      <div className="tooltip-row-content">
                        <span className="tooltip-row-label">{row.label}</span>
                        <span className="tooltip-row-value">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              {footerText && (
                <div className="tooltip-footer">
                  {footerText}
                </div>
              )}
            </div>
          </div>

          {/* Arrow - Keep outside inner wrapper so it's not clipped */}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="tooltip-arrow"
            fill="var(--tooltip-bg)"
          />
        </div>
      )}
    </>
  )
}
