import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface ProfileGainEntry {
  displayUsername: string
  xpToday: number
  lastUpdated: number
  period1: string
  period2: string
}

interface ProfileGainsContextType {
  gainsMap: Map<string, ProfileGainEntry>
  publish: (username: string, entry: Omit<ProfileGainEntry, 'displayUsername'>) => void
  getTodayGains: () => Array<{ username: string; xp_gained: number }>
}

const ProfileGainsContext = createContext<ProfileGainsContextType | undefined>(undefined)

export const ProfileGainsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gainsMap, setGainsMap] = useState<Map<string, ProfileGainEntry>>(new Map())
  const previousValuesRef = useRef<Map<string, ProfileGainEntry>>(new Map())

  const publish = useCallback((username: string, entry: Omit<ProfileGainEntry, 'displayUsername'>) => {
    const normalizedUsername = username.toLowerCase().trim()
    
    if (entry.period1 !== 'today') {
      return
    }

    const fullEntry: ProfileGainEntry = {
      ...entry,
      displayUsername: username
    }

    const previousEntry = previousValuesRef.current.get(normalizedUsername)
    if (
      previousEntry &&
      previousEntry.xpToday === fullEntry.xpToday &&
      previousEntry.lastUpdated === fullEntry.lastUpdated &&
      previousEntry.period1 === fullEntry.period1 &&
      previousEntry.period2 === fullEntry.period2
    ) {
      return
    }

    setGainsMap((prev) => {
      const newMap = new Map(prev)
      newMap.set(normalizedUsername, fullEntry)
      return newMap
    })

    previousValuesRef.current.set(normalizedUsername, fullEntry)
  }, [])

  const getTodayGains = useCallback(() => {
    const entries = Array.from(gainsMap.entries())
    const list = entries
      .filter(([_, entry]) => entry.period1 === 'today' && entry.xpToday > 0)
      .map(([_, entry]) => ({
        username: entry.displayUsername,
        xp_gained: entry.xpToday
      }))
      .sort((a, b) => b.xp_gained - a.xp_gained)
    
    return list
  }, [gainsMap])

  return (
    <ProfileGainsContext.Provider value={{ gainsMap, publish, getTodayGains }}>
      {children}
    </ProfileGainsContext.Provider>
  )
}

export const useProfileGains = () => {
  const context = useContext(ProfileGainsContext)
  if (context === undefined) {
    throw new Error('useProfileGains must be used within a ProfileGainsProvider')
  }
  return context
}
