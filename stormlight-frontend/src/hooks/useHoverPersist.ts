import { useState, useRef, useEffect, useCallback } from 'react'

interface UseHoverPersistOptions {
  delay?: number
  persistMs?: number
  onOpenChange?: (open: boolean) => void
}

interface UseHoverPersistReturn {
  open: boolean
  hovered: boolean
  persisted: boolean
  progressActive: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  setOpen: (open: boolean) => void
}

export function useHoverPersist({
  delay = 150,
  persistMs = 3000,
  onOpenChange
}: UseHoverPersistOptions = {}): UseHoverPersistReturn {
  const [open, setOpenState] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [persisted, setPersisted] = useState(false)
  const [progressActive, setProgressActive] = useState(false)
  
  const timerRef = useRef<number | null>(null)
  const delayRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  const setOpen = useCallback((newOpen: boolean) => {
    setOpenState(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  const onMouseEnter = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }

    delayRef.current = window.setTimeout(() => {
      setOpen(true)
      setHovered(true)
      setProgressActive(true)
      
      timerRef.current = window.setTimeout(() => {
        setPersisted(true)
        setProgressActive(false)
      }, persistMs)
    }, delay)
  }, [delay, persistMs, setOpen])

  const onMouseLeave = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }

    if (!persisted) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setOpen(false)
      setHovered(false)
      setProgressActive(false)
    }
  }, [persisted, setOpen])

  useEffect(() => {
    if (!open) {
      setHovered(false)
      setPersisted(false)
      setProgressActive(false)
    }
  }, [open])

  useEffect(() => {
    if (persisted && open) {
      const handleOutsideClick = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          setOpen(false)
          setPersisted(false)
        }
      }

      const handleScroll = () => {
        setOpen(false)
        setPersisted(false)
      }

      window.addEventListener('mousedown', handleOutsideClick, true)
      window.addEventListener('scroll', handleScroll, true)

      return () => {
        window.removeEventListener('mousedown', handleOutsideClick, true)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [persisted, open, setOpen])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (delayRef.current) clearTimeout(delayRef.current)
    }
  }, [])

  return {
    open,
    hovered,
    persisted,
    progressActive,
    onMouseEnter,
    onMouseLeave,
    setOpen
  }
}
