import { createContext, useContext, useState, useLayoutEffect, useRef, ReactNode } from 'react'
import { themes, defaultTheme, applyTheme } from '../config/themes'

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
  const [theme, setThemeState] = useState<string>(defaultTheme)
  const hasReconciledFromUser = useRef(false)
  const isInitialMount = useRef(true)

  useLayoutEffect(() => {
    const root = document.documentElement
    if (!root.dataset.theme) {
      root.setAttribute('data-theme', defaultTheme)
    }
    
    if (isInitialMount.current) {
      if (!loading && !user) {
        const storedTheme = localStorage.getItem('selectedTheme') || defaultTheme
        console.log('🎨 Guest user - applying theme from localStorage:', storedTheme)
        setThemeState(storedTheme)
        applyTheme(themes[storedTheme])
      } else if (!loading && user) {
        const userTheme = (user as any).theme || defaultTheme
        console.log('🎨 Logged in user - applying theme from database:', userTheme)
        setThemeState(userTheme)
        applyTheme(themes[userTheme])
        localStorage.setItem('selectedTheme', userTheme)
        hasReconciledFromUser.current = true
      }
      isInitialMount.current = false
    }
  }, [user, loading])

  useLayoutEffect(() => {
    if (user && !loading && !hasReconciledFromUser.current) {
      const userTheme = (user as any).theme || defaultTheme
      console.log('🎨 Reconciling to user theme:', userTheme, 'from user object:', user)
      
      if (userTheme !== theme) {
        setThemeState(userTheme)
        applyTheme(themes[userTheme])
        localStorage.setItem('selectedTheme', userTheme)
        hasReconciledFromUser.current = true
        
        const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--page-bg')
        console.log('🎨 Background variable after user reconcile:', computedBg)
      }
    }
  }, [user, loading, theme])

  const setTheme = async (themeId: string) => {
    console.log('🎨 Theme change requested:', themeId)
    setThemeState(themeId)
    const themeObj = themes[themeId]
    if (themeObj) {
      applyTheme(themeObj)
      localStorage.setItem('selectedTheme', themeId)
      console.log('✅ Theme applied and saved to localStorage:', themeId)
      
      const token = localStorage.getItem('access_token')
      if (token && user?.username) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          console.log('📡 Calling API to save theme to backend:', themeId)
          const response = await fetch(`${API_URL}/api/user/theme`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ theme: themeId })
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('✅ Theme saved to backend successfully:', result)
          } else {
            const error = await response.json()
            console.error('❌ Failed to save theme to backend:', response.status, error)
          }
        } catch (error) {
          console.error('❌ Error saving theme preference:', error)
        }
      } else {
        console.warn('⚠️ Theme not saved to backend - no token or user')
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
