import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
  discriminator: string
  email?: string
  avatar?: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (code: string) => Promise<void>
  logout: () => void
  getAuthUrl: () => Promise<string>
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
  const [user, setUser] = useState<User | null>({
    id: 'test-user',
    username: 'TestUser',
    discriminator: '1234',
    avatar: undefined,
    email: 'test@example.com',
    created_at: new Date().toISOString()
  })
  const [loading, setLoading] = useState(false)

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
      const response = await fetch(`${API_URL}/api/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
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

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    getAuthUrl
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
