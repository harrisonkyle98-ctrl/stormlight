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

  // Apply ribbon color on initial mount from localStorage
  useLayoutEffect(() => {
    const storedColor = localStorage.getItem('ribbonColor') || defaultRibbonColor
    const ribbonColor = ribbonColors[storedColor]
    
    if (ribbonColor) {
      applyRibbonColor(ribbonColor)
      setThemeState(storedColor)
    } else {
      // Fallback to default if stored color is invalid
      applyRibbonColor(ribbonColors[defaultRibbonColor])
      setThemeState(defaultRibbonColor)
    }
  }, [])

  // Handle user preference from database (if logged in)
  useLayoutEffect(() => {
    if (!loading && user) {
      // Check if user has a ribbon color preference stored
      const userRibbonColor = (user as any).theme || (user as any).ribbonColor
      if (userRibbonColor && ribbonColors[userRibbonColor]) {
        applyRibbonColor(ribbonColors[userRibbonColor])
        setThemeState(userRibbonColor)
        localStorage.setItem('ribbonColor', userRibbonColor)
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
