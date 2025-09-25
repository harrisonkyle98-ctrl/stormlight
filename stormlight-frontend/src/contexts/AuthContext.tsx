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
  linkAccount: (username: string) => Promise<{ status: 'linked' | 'already-linked' }>
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
    let token = localStorage.getItem('access_token')
    
    if (!token) {
      const cookies = document.cookie.split(';')
      const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='))
      if (accessTokenCookie) {
        token = accessTokenCookie.split('=')[1]
        localStorage.setItem('access_token', token)
      }
    }
    
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
      const response = await fetch(`${API_URL}/api/auth/callback/discord?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          const token = data.access_token
          localStorage.setItem('access_token', token)
          
          try {
            const userResponse = await fetch(`${API_URL}/api/user/me?refresh=true`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (userResponse.ok) {
              const userData = await userResponse.json()
              setUser(userData)
            } else {
              setUser(data.user)
            }
          } catch (error) {
            console.error('Failed to refresh user data:', error)
            setUser(data.user)
          }
        } else {
          const token = localStorage.getItem('access_token')
          if (token) {
            await fetchCurrentUser(token)
          }
        }
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

  const linkAccount = async (username: string): Promise<{ status: 'linked' | 'already-linked' }> => {
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
        setUser(data.user)
        return { status: 'linked' }
      } else {
        let detail = 'Account linking failed'
        try {
          const err = await response.json()
          detail = err?.detail || detail
        } catch (_) {}

        if (response.status === 400 && /already linked/i.test(detail)) {
          if (token) {
            await fetchCurrentUser(token)
          }
          return { status: 'already-linked' }
        }
        throw new Error(detail)
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
