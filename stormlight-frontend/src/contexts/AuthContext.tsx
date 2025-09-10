import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
  displayName?: string
  clanRank?: string
  discriminator?: string
  email?: string
  avatar?: string
  isLinked: boolean
  requiresLinking?: boolean
  discordId: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (code: string) => Promise<void>
  logout: () => void
  getAuthUrl: () => Promise<string>
  linkAccount: (username: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchCurrentUser(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchCurrentUser = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        console.log('User data from /api/user/me:', userData)
        setUser(userData)
      } else {
        localStorage.removeItem('access_token')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('access_token')
    } finally {
      setLoading(false)
    }
  }

  const getAuthUrl = async (): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/discord`)
      const data = await response.json()
      return data.auth_url
    } catch (error) {
      console.error('Error getting auth URL:', error)
      throw error
    }
  }

  const login = async (code: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/callback/discord?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('access_token', data.access_token)
        setUser(data.user)
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  const linkAccount = async (username: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/auth/link-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('User data after linking:', data.user)
        setUser(data.user)
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Account linking failed' }))
        throw new Error(errorData.detail || 'Account linking failed')
      }
    } catch (error) {
      console.error('Link account error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    getAuthUrl,
    linkAccount
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
