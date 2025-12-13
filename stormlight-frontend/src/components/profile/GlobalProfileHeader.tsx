import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { ChevronDown, ChevronUp, Link2, Palette, Award, LogOut, User, Key } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Username } from '../ui/username'
import { usernameToUrl } from '../../utils/urlUtils'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { checkPlayerMilestones } from '../../utils/gradientUtils'
import { ribbonColors } from '../../config/themes'
import RibbonNav from '../RibbonNav'
import '../../styles/fantasy-container.css'

interface CustomBadge {
  id: string
  name: string
  description?: string
  imageUrl: string
  backgroundColor?: string
  gradientColors?: string[]
  allowUsernameColorOverride?: boolean
}

interface PlayerStats {
  badges?: Array<{ id: string; name: string; imageUrl: string; type: string }>
  custom_badges?: CustomBadge[]
  username: string
  clan_xp?: number
  clan_rank_number?: number
  runescore?: number
  league_points?: number
  stats: {
    overall: {
      rank: number | null
      level: number
      xp: number
      combatlevel: number
    }
    [skill: string]: {
      rank: number | null
      level: number
      xp: number
    }
  }
  quest_points?: number
  last_updated: string
  clan_rank?: string
  is_verified?: boolean
  join_date?: string
}

const GlobalProfileHeader = () => {
  const { user, logout } = useAuth()
  const { theme: selectedTheme, setTheme: handleThemeChange } = useTheme()
  const navigate = useNavigate()
  
  // Profile card state
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profileAnimReady, setProfileAnimReady] = useState(false)
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null)
  const [questData, setQuestData] = useState<any>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'account' | 'badges' | 'appearance' | null>(null)
  const [eligibleBadges, setEligibleBadges] = useState<CustomBadge[]>([])
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [accountLinkRequests, setAccountLinkRequests] = useState<any[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [linkRequestLoading, setLinkRequestLoading] = useState(false)
  const [themeTooltip, setThemeTooltip] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Enable animation after initial render to prevent flicker
  useEffect(() => {
    const timer = setTimeout(() => setProfileAnimReady(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Profile data fetching
  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.username && user?.isLinked) {
        setProfileLoading(true)
        try {
          await Promise.all([
            fetchPlayerStats(),
            fetchQuestData()
          ])
        } finally {
          setProfileLoading(false)
        }
      } else if (user) {
        setProfileError(user.requiresLinking ? 'Please link your RuneScape account' : 'Account not linked to clan member')
      }
    }
    loadProfileData()
  }, [user?.username, user?.isLinked])

  // Fetch settings data when dialog opens
  useEffect(() => {
    if (settingsSection !== null) {
      fetchAccountLinkRequests()
      fetchLinkedAccounts()
      fetchEligibleBadges()
    }
  }, [settingsSection])

  const fetchPlayerStats = async () => {
    if (!user?.username) return
    try {
      setProfileError(null)
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/stats`)
      if (response.ok) {
        const data = await response.json()
        setPlayerData(data)
      } else {
        setProfileError(`Failed to load profile data (${response.status})`)
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
      setProfileError('Error loading profile data')
    }
  }

  const fetchQuestData = async () => {
    if (!user?.username) return
    try {
      const encodedUsername = encodeURIComponent(user.username)
      const response = await fetch(`${API_URL}/api/player/${encodedUsername}/quests`)
      if (response.ok) {
        const data = await response.json()
        setQuestData(data)
      }
    } catch (error) {
      console.error('Error fetching quest data:', error)
    }
  }

  const fetchAccountLinkRequests = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/my-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAccountLinkRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching account link requests:', error)
    }
  }

  const fetchLinkedAccounts = async () => {
    if (!user?.username || !user?.discordId) return
    
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const [membersResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/api/clan/members`),
        fetch(`${API_URL}/api/account-link-requests/my-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        const requestsData = requestsResponse.ok ? await requestsResponse.json() : { requests: [] }
        const requests = requestsData.requests || []
        
        const linkedUsernames = new Set<string>()
        linkedUsernames.add(user.username)
        
        requests.forEach((req: any) => {
          if (req.status === 'APPROVED') {
            linkedUsernames.add(req.alternateUsername)
            linkedUsernames.add(req.primaryUsername)
          }
        })
        
        const allLinkedAccounts = membersData.members.filter((member: any) => 
          linkedUsernames.has(member.username)
        )
        setLinkedAccounts(allLinkedAccounts)
      }
    } catch (error) {
      console.error('Error fetching linked accounts:', error)
    }
  }

  const handleSubmitLinkRequest = async () => {
    const token = localStorage.getItem('access_token')
    if (!newUsername.trim() || !token) return
    
    setLinkRequestLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          alternateUsername: newUsername.trim()
        })
      })
      
      if (response.ok) {
        setNewUsername('')
        await fetchAccountLinkRequests()
        await fetchLinkedAccounts()
        alert('Link request submitted successfully! An admin will review it.')
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to submit link request')
      }
    } catch (error) {
      console.error('Error submitting link request:', error)
      alert('Failed to submit link request')
    } finally {
      setLinkRequestLoading(false)
    }
  }

  const handleDeleteRejectedRequest = async (requestId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        await fetchAccountLinkRequests()
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    }
  }

  const handleSwitchAccount = async (targetUsername: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    
    try {
      const response = await fetch(`${API_URL}/api/account-link-requests/switch/${encodeURIComponent(targetUsername)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to switch account')
      }
    } catch (error) {
      console.error('Error switching account:', error)
      alert('Failed to switch account')
    }
  }

  const fetchEligibleBadges = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const response = await fetch(`${API_URL}/api/user/eligible-badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEligibleBadges(data.eligibleBadges || [])
        setSelectedBadgeId(data.selectedBadgeId || null)
      }
    } catch (error) {
      console.error('Error fetching eligible badges:', error)
    }
  }

  const handleBadgeSelection = async (badgeId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const newBadgeId = selectedBadgeId === badgeId ? null : badgeId
      const response = await fetch(`${API_URL}/api/user/selected-badge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ badgeId: newBadgeId })
      })
      if (response.ok) {
        setSelectedBadgeId(newBadgeId)
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(errorData.detail || 'Failed to update badge selection')
      }
    } catch (error) {
      console.error('Error updating badge selection:', error)
      alert('Failed to update badge selection')
    }
  }

  // Don't render anything if user is not logged in or not linked
  if (!user?.username || !user?.isLinked) {
    return null
  }

  return (
    <>
      {/* Profile Header Section - Gold Ribbon + Profile Panel */}
      {profileError ? (
        <section className="profile-header-section">
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          {/* Gold Ribbon with error state */}
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Profile Error</h1>
              </div>
            </div>
          </div>
          {/* Profile Panel */}
          <div className="profile-header-panel">
            <div className="profile-header-panel-content">
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">{profileError}</p>
                {!user?.requiresLinking && (
                  <Button
                    onClick={fetchPlayerStats}
                    className="profile-button"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : profileLoading || !playerData ? (
        <section className="profile-header-section">
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          {/* Gold Ribbon with loading state */}
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <div className="w-32 h-6 bg-white/20 rounded animate-pulse mx-auto"></div>
              </div>
            </div>
          </div>
          {/* Profile Panel skeleton */}
          <div className="profile-header-panel">
            <div className="profile-header-panel-content">
              <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
                <div className="lg:w-[30%] flex-shrink-0">
                  <div className="rounded-lg p-6 bg-slate-700/30">
                    <div className="w-20 h-20 bg-slate-600/50 rounded-full mx-auto mb-4"></div>
                    <div className="w-24 h-5 bg-slate-600/50 rounded mx-auto"></div>
                  </div>
                </div>
                <div className="flex-1 lg:max-w-[40%] space-y-2">
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                  <div className="h-10 bg-slate-700/30 rounded"></div>
                </div>
                <div className="flex-1 lg:max-w-[30%]">
                  <div className="h-32 bg-slate-700/30 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : playerData && (
        <section className="profile-header-section">
          {/* Hanging Ribbon Navigation */}
          <RibbonNav />
          
          {/* Gold Ribbon with username - clickable to toggle collapse */}
          <div 
            className="gold-banner-wrapper cursor-pointer"
            onClick={() => setProfileExpanded(prev => !prev)}
            role="button"
            aria-expanded={profileExpanded}
          >
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner relative flex items-center justify-center pr-14">
                <h1 className="fantasy-banner-title">{user.username}</h1>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
                  {profileExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/80" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/80" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Panel - collapsible with smooth animation */}
          <div 
            className={`profile-header-panel ${
              profileAnimReady ? 'profile-header-panel-anim ' : ''
            }${
              profileExpanded 
                ? 'profile-header-panel-anim--expanded' 
                : 'profile-header-panel-anim--collapsed'
            }`}
            aria-hidden={!profileExpanded}
          >
            <div className="profile-header-panel-content">
                {/* Three column layout - equal widths */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Left Column: Avatar with rank badge - reduced spacing */}
                  <div className="lg:flex-1 flex flex-col">
                    <div className="profile-avatar-section rounded-lg p-4">
                      <div className="flex flex-col items-center space-y-2">
                        <Avatar className="w-20 h-20">
                          <AvatarImage
                            src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username)}/chat.png`}
                            alt={user.username}
                          />
                          <AvatarFallback className="bg-theme-button text-white">
                            <User className="w-10 h-10" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-center">
                            <Link
                              to={`/clan-member/${usernameToUrl(user.username)}`}
                              className="hover:opacity-80 transition-opacity"
                            >
                              <Username
                                username={user.username}
                                clanRank={playerData.clan_rank}
                              />
                            </Link>
                          </h1>

                          {playerData.stats && (() => {
                            const allBadges = checkPlayerMilestones(playerData.stats, questData, playerData.clan_rank, user.username, playerData.league_points)
                            const rankBadge = allBadges.find(badge => badge.id.startsWith('rank-'))
                            return rankBadge ? (
                              <div className="mt-1">
                                <div
                                  className="inline-flex items-center space-x-2 px-3 py-1 text-sm font-semibold rounded-md text-white"
                                  style={{
                                    background: rankBadge.gradientBackground || rankBadge.backgroundColor
                                  }}
                                >
                                  <img
                                    src={rankBadge.icon}
                                    alt={rankBadge.name}
                                    className="w-4 h-4"
                                  />
                                  <span>{rankBadge.name}</span>
                                </div>
                              </div>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Action Buttons (Link Account, Badges, View My Profile) */}
                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('account')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Link2 className="w-5 h-5" />
                      <span>Link Account</span>
                    </Button>

                    <Button
                      onClick={() => setSettingsSection('badges')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Award className="w-5 h-5" />
                      <span>Badges</span>
                    </Button>

                    <Button
                      onClick={() => navigate(`/clan-member/${usernameToUrl(user.username)}`)}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <User className="w-5 h-5" />
                      <span>View My Profile</span>
                    </Button>
                  </div>

                  {/* Right Column: Change Theme, Admin Panel (admins only), Log Out */}
                  <div className="lg:flex-1 flex flex-col gap-2">
                    <Button
                      onClick={() => setSettingsSection('appearance')}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <Palette className="w-5 h-5" />
                      <span>Change Theme</span>
                    </Button>

                    {/* Admin Panel - only visible for admins */}
                    {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                      <Button
                        onClick={() => navigate('/admin')}
                        className="profile-button w-full justify-start gap-3"
                      >
                        <Key className="w-5 h-5" />
                        <span>Admin Panel</span>
                      </Button>
                    )}

                    <Button
                      onClick={logout}
                      className="profile-button w-full justify-start gap-3"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Log Out</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
        </section>
      )}

      {/* User Settings Modal */}
      <Dialog open={settingsSection !== null} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {settingsSection === 'account' && 'Link Account'}
              {settingsSection === 'badges' && 'Username Color Badge'}
              {settingsSection === 'appearance' && 'Change Theme'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {settingsSection === 'account' && 'Manage your linked RuneScape accounts'}
              {settingsSection === 'badges' && 'Select a badge to apply its color to your username'}
              {settingsSection === 'appearance' && 'Customize the appearance of the site'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Account Section */}
            {settingsSection === 'account' && (
            <div className="space-y-3">
              
              <div className="space-y-2">
                {linkedAccounts.map((account, index) => {
                  const isActive = account.discord_id === user?.discordId
                  const isPrimary = index === 0

                  const approvedUsernames = new Set(
                    accountLinkRequests
                      .filter((req: any) => req.status === 'APPROVED')
                      .flatMap((req: any) => [req.primaryUsername, req.alternateUsername])
                  )

                  const canSwitch = !isActive && approvedUsernames.has(account.username) && !account.discord_id
                  
                  return (
                    <div 
                      key={account.username}
                      className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{account.username}</span>
                        {isActive ? (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-theme-accent-light border border-theme-accent/30">
                            Active
                          </span>
                        ) : isPrimary ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            Linked (Primary)
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            Linked (Alternate)
                          </span>
                        )}
                      </div>
                      
                      {canSwitch && (
                        <Button
                          size="sm"
                          className="bg-theme-button hover:bg-theme-button-hover text-white"
                          onClick={() => handleSwitchAccount(account.username)}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  )
                })}
                
                {accountLinkRequests.filter((req: any) => 
                  req.status === 'APPROVED' && !linkedAccounts.some((acc) => acc.username === req.alternateUsername)
                ).map((request: any) => (
                  <div 
                    key={request.id}
                    className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{request.alternateUsername}</span>
                      <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        Linked (Alternate)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-theme-button hover:bg-theme-button-hover text-white"
                      onClick={() => handleSwitchAccount(request.alternateUsername)}
                    >
                      Switch
                    </Button>
                  </div>
                ))}
                
                {accountLinkRequests.filter((req: any) => 
                  req.status !== 'APPROVED' && !linkedAccounts.some((acc) => acc.username === req.alternateUsername)
                ).map((request: any) => (
                  <div 
                    key={request.id}
                    className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{request.alternateUsername}</span>
                      {request.status === 'PENDING' && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Pending
                        </span>
                      )}
                      {request.status === 'REJECTED' && (
                        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          Rejected
                        </span>
                      )}
                    </div>
                    {request.status === 'REJECTED' && (
                      <button
                        onClick={() => handleDeleteRejectedRequest(request.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove rejected request"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter RuneScape username"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={linkRequestLoading}
                    />
                    <Button
                      onClick={handleSubmitLinkRequest}
                      disabled={!newUsername.trim() || linkRequestLoading}
                      className="bg-theme-button hover:bg-theme-button-hover text-white"
                    >
                      {linkRequestLoading ? 'Submitting...' : '+ Add Another Account'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Badge Username Color Section */}
            {settingsSection === 'badges' && eligibleBadges.length > 0 && (
              <div className="space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 mb-3">
                      Select a badge to apply its color to your username across the site. Click again to deselect.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {eligibleBadges.map((badge) => {
                        const isSelected = selectedBadgeId === badge.id
                        const backgroundColor = badge.gradientColors 
                          ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                          : badge.backgroundColor || '#6b7280'
                        
                        return (
                          <button
                            key={badge.id}
                            onClick={() => handleBadgeSelection(badge.id)}
                            className={`px-3 py-1.5 text-sm font-semibold flex items-center space-x-2 rounded-md text-white transition-all ${
                              isSelected 
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-105' 
                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            style={{
                              background: backgroundColor
                            }}
                            title={badge.description || badge.name}
                          >
                            <img 
                              src={badge.imageUrl?.startsWith('http') ? badge.imageUrl : `https://stormlightrs.com${badge.imageUrl}`}
                              alt={badge.name} 
                              className="w-4 h-4 object-contain"
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                            />
                            <span>{badge.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {settingsSection === 'appearance' && (
            <div className="space-y-3">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Profile Ribbon Color</h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.values(ribbonColors).map((color) => (
                        <div key={color.id} className="relative">
                          <button
                            onClick={() => handleThemeChange(color.id)}
                            onMouseEnter={() => setThemeTooltip(color.name)}
                            onMouseLeave={() => setThemeTooltip(null)}
                            className={`w-12 h-12 rounded-full transition-all ${
                              selectedTheme === color.id 
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' 
                                : 'hover:scale-105'
                            }`}
                            style={{ background: color.gradient }}
                            title={color.name}
                          />
                          {themeTooltip === color.name && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-50">
                              {color.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Select a color for your profile ribbon. Your preference will be saved.
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default GlobalProfileHeader
