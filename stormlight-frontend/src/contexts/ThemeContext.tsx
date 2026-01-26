import { createContext, useContext, useState, useLayoutEffect, ReactNode } from 'react'
import { ribbonColors, defaultRibbonColor, applyRibbonColor, applyPageRibbonColor, defaultPageRibbonColor, applyNavRibbonColor, defaultNavRibbonColor } from '../config/themes'

interface ThemeContextType {
  theme: string | null
  setTheme: (themeId: string | null) => void
  pageRibbon: string | null
  setPageRibbon: (colorId: string | null) => void
  navRibbon: string | null
  setNavRibbon: (colorId: string | null) => void
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
  const [theme, setThemeState] = useState<string | null>(null)
  const [pageRibbon, setPageRibbonState] = useState<string | null>(defaultPageRibbonColor)
  const [navRibbon, setNavRibbonState] = useState<string | null>(defaultNavRibbonColor)

  // Apply ribbon colors based on user preferences from database (primary source)
  // Falls back to localStorage for anonymous users, then to default
  useLayoutEffect(() => {
    if (loading) {
      // While loading, apply defaults to prevent flash
      applyRibbonColor(ribbonColors[defaultRibbonColor])
      applyPageRibbonColor(null)
      applyNavRibbonColor(null)
      setThemeState(defaultRibbonColor)
      setPageRibbonState(null)
      setNavRibbonState(null)
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
        // User has no valid preference (Auto) - use default (purple) but state is null
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(null)
        localStorage.removeItem('ribbonColor')
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

      // Nav ribbon: check new key (null means use default behavior)
      const userNavRibbon = parsedPrefs['nav-ribbon'] || null
      if (userNavRibbon && ribbonColors[userNavRibbon]) {
        applyNavRibbonColor(ribbonColors[userNavRibbon])
        setNavRibbonState(userNavRibbon)
        localStorage.setItem('navRibbonColor', userNavRibbon)
      } else {
        // No nav ribbon preference - use default behavior
        applyNavRibbonColor(null)
        setNavRibbonState(null)
        localStorage.removeItem('navRibbonColor')
      }
    } else {
      // For anonymous users, use localStorage or default
      const storedColor = localStorage.getItem('ribbonColor')
      if (storedColor && ribbonColors[storedColor]) {
        applyRibbonColor(ribbonColors[storedColor])
        setThemeState(storedColor)
      } else {
        // No stored preference (Auto) - use default but state is null
        applyRibbonColor(ribbonColors[defaultRibbonColor])
        setThemeState(null)
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

      // Nav ribbon for anonymous users
      const storedNavColor = localStorage.getItem('navRibbonColor')
      if (storedNavColor && ribbonColors[storedNavColor]) {
        applyNavRibbonColor(ribbonColors[storedNavColor])
        setNavRibbonState(storedNavColor)
      } else {
        applyNavRibbonColor(null)
        setNavRibbonState(null)
      }
    }
  }, [user, loading])

  const setTheme = async (colorId: string | null) => {
    // Handle Auto (null) - apply default but store as unset
    if (colorId && ribbonColors[colorId]) {
      applyRibbonColor(ribbonColors[colorId])
      setThemeState(colorId)
      localStorage.setItem('ribbonColor', colorId)
    } else {
      // Auto - use default color but state is null
      applyRibbonColor(ribbonColors[defaultRibbonColor])
      setThemeState(null)
      localStorage.removeItem('ribbonColor')
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

  const setNavRibbon = async (colorId: string | null) => {
    // Apply the nav ribbon color immediately
    if (colorId && ribbonColors[colorId]) {
      applyNavRibbonColor(ribbonColors[colorId])
      setNavRibbonState(colorId)
      localStorage.setItem('navRibbonColor', colorId)
    } else {
      applyNavRibbonColor(null)
      setNavRibbonState(null)
      localStorage.removeItem('navRibbonColor')
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
          body: JSON.stringify({ 'nav-ribbon': colorId })
        })
      } catch (error) {
        console.error('Error saving nav ribbon color preference:', error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, pageRibbon, setPageRibbon, navRibbon, setNavRibbon }}>
      {children}
    </ThemeContext.Provider>
  )
}
