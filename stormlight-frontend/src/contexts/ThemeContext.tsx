import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react'
import { ribbonColors, defaultRibbonColor, applyRibbonColor } from '../config/themes'

interface ThemeContextType {
  theme: string
  setTheme: (themeId: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
  user?: any
  loading?: boolean
}

export function ThemeProvider({ children, user, loading }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<string>(defaultRibbonColor)

  // Apply ribbon color based on user preferences from database (primary source)
  // Falls back to localStorage for anonymous users, then to default (purple)
  useLayoutEffect(() => {
    if (loading) {
      // While loading, apply default to prevent flash
      applyRibbonColor(ribbonColors[defaultRibbonColor])
      setThemeState(defaultRibbonColor)
      return
    }

    if (user) {
      // For logged-in users, read from database preferences (authoritative source)
      const prefs = (user as any).preferences || {}
      // Parse preferences if it's a string
      const parsedPrefs = typeof prefs === 'string' ? JSON.parse(prefs) : prefs
      
      // Check multiple possible keys for backward compatibility
      const userRibbonColor = 
        parsedPrefs.ribbon_color ||
        parsedPrefs.ribbonColor ||
        parsedPrefs.theme ||
        (user as any).theme ||
        (user as any).ribbonColor
      
      if (userRibbonColor && ribbonColors[userRibbonColor]) {
        applyRibbonColor(ribbonColors[userRibbonColor])
        setThemeState(userRibbonColor)
        // Also update localStorage as a cache
        localStorage.setItem('ribbonColor', userRibbonColor)
      } else {
        // User has no valid preference - use default (purple)
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(defaultRibbonColor)
      }
    } else {
      // For anonymous users, use localStorage or default
      const storedColor = localStorage.getItem('ribbonColor')
      if (storedColor && ribbonColors[storedColor]) {
        applyRibbonColor(ribbonColors[storedColor])
        setThemeState(storedColor)
      } else {
        // No stored preference - use default (purple)
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(defaultRibbonColor)
      }
    }
  }, [user, loading])

  const setTheme = async (colorId: string) => {
    const ribbonColor = ribbonColors[colorId]
    if (!ribbonColor) return
    
    // Apply the ribbon color immediately
    applyRibbonColor(ribbonColor)
    setThemeState(colorId)
    localStorage.setItem('ribbonColor', colorId)
    
    // Save to backend if user is logged in
    const token = localStorage.getItem('access_token')
    if (token && user?.username) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        await fetch(`${API_URL}/api/user/theme`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ theme: colorId })
        })
      } catch (error) {
        console.error('Error saving ribbon color preference:', error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
