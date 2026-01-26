import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react'
import { ribbonColors, defaultRibbonColor, applyRibbonColor, applyPageRibbonColor, defaultPageRibbonColor } from '../config/themes'

interface ThemeContextType {
  theme: string
  setTheme: (themeId: string) => void
  pageRibbon: string | null
  setPageRibbon: (colorId: string | null) => void
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
  const [pageRibbon, setPageRibbonState] = useState<string | null>(defaultPageRibbonColor)

  // Apply ribbon colors based on user preferences from database (primary source)
  // Falls back to localStorage for anonymous users, then to default
  useLayoutEffect(() => {
    if (loading) {
      // While loading, apply defaults to prevent flash
      applyRibbonColor(ribbonColors[defaultRibbonColor])
      applyPageRibbonColor(null)
      setThemeState(defaultRibbonColor)
      setPageRibbonState(null)
      return
    }

    if (user) {
      // For logged-in users, read from database preferences (authoritative source)
      const prefs = (user as any).preferences || {}
      // Parse preferences if it's a string
      const parsedPrefs = typeof prefs === 'string' ? JSON.parse(prefs) : prefs
      
      // Profile ribbon: check new key first, then legacy keys for backward compatibility
      // Priority: profile-ribbon > ribbon_color > ribbonColor > theme (legacy)
      const userProfileRibbon = 
        parsedPrefs['profile-ribbon'] ||
        parsedPrefs.ribbon_color ||
        parsedPrefs.ribbonColor ||
        parsedPrefs.theme ||  // Legacy key - treat as profile-ribbon
        (user as any).theme ||
        (user as any).ribbonColor
      
      if (userProfileRibbon && ribbonColors[userProfileRibbon]) {
        applyRibbonColor(ribbonColors[userProfileRibbon])
        setThemeState(userProfileRibbon)
        localStorage.setItem('ribbonColor', userProfileRibbon)
      } else {
        // User has no valid preference - use default (purple)
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(defaultRibbonColor)
      }

      // Page ribbon: check new key (null means use default behavior)
      const userPageRibbon = parsedPrefs['page-ribbon'] || null
      if (userPageRibbon && ribbonColors[userPageRibbon]) {
        applyPageRibbonColor(ribbonColors[userPageRibbon])
        setPageRibbonState(userPageRibbon)
        localStorage.setItem('pageRibbonColor', userPageRibbon)
      } else {
        // No page ribbon preference - use default behavior (Sapphire sitewide, Amethyst for Admin)
        applyPageRibbonColor(null)
        setPageRibbonState(null)
        localStorage.removeItem('pageRibbonColor')
      }
    } else {
      // For anonymous users, use localStorage or default
      const storedColor = localStorage.getItem('ribbonColor')
      if (storedColor && ribbonColors[storedColor]) {
        applyRibbonColor(ribbonColors[storedColor])
        setThemeState(storedColor)
      } else {
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(defaultRibbonColor)
      }

      // Page ribbon for anonymous users
      const storedPageColor = localStorage.getItem('pageRibbonColor')
      if (storedPageColor && ribbonColors[storedPageColor]) {
        applyPageRibbonColor(ribbonColors[storedPageColor])
        setPageRibbonState(storedPageColor)
      } else {
        applyPageRibbonColor(null)
        setPageRibbonState(null)
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
          body: JSON.stringify({ 'profile-ribbon': colorId })
        })
      } catch (error) {
        console.error('Error saving profile ribbon color preference:', error)
      }
    }
  }

  const setPageRibbon = async (colorId: string | null) => {
    // Apply the page ribbon color immediately
    if (colorId && ribbonColors[colorId]) {
      applyPageRibbonColor(ribbonColors[colorId])
      setPageRibbonState(colorId)
      localStorage.setItem('pageRibbonColor', colorId)
    } else {
      applyPageRibbonColor(null)
      setPageRibbonState(null)
      localStorage.removeItem('pageRibbonColor')
    }
    
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
          body: JSON.stringify({ 'page-ribbon': colorId })
        })
      } catch (error) {
        console.error('Error saving page ribbon color preference:', error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, pageRibbon, setPageRibbon }}>
      {children}
    </ThemeContext.Provider>
  )
}
