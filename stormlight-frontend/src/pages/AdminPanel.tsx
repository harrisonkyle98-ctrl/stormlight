import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Home, Award, Trophy, ArrowBigUp, UsersRound, ChevronDown, ChevronUp, Link2, Palette, LogOut } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { Spinner } from '../components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { AdminHomeTab } from '../components/admin/AdminHomeTab'
import { BadgeManagementTab } from '../components/admin/BadgeManagementTab'
import { CompetitionManagementTab } from '../components/admin/CompetitionManagementTab'
import { RankTrackingTab } from '../components/admin/RankTrackingTab'
import { MemberLogTab } from '../components/admin/MemberLogTab'
import { checkPlayerMilestones } from '../utils/gradientUtils'
import { themes } from '../config/themes'
import AnimatedHeader from '../components/AnimatedHeader'
import RibbonNav from '../components/RibbonNav'
import '../styles/fantasy-container.css'

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

const AdminPanel = () => {
  const { user, logout } = useAuth()
  const { theme: selectedTheme, setTheme: handleThemeChange } = useTheme()
  const [activeTab, setActiveTab] = useState('home')
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profileAnimReady, setProfileAnimReady] = useState(false)
  
  // Profile card state
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

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  // Enable animation after initial render
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        body: JSON.stringify({ alternateUsername: newUsername.trim() })
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
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
        setEligibleBadges(data.badges || [])
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

  // Loading state
  if (!user) {
    return (
      <>
        <AnimatedHeader />
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading...</div>
        </div>
      </>
    )
  }

  // Permission check
  if (!user?.clanRank || !['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)) {
    return <Navigate to="/" replace />
  }

  // Get rank badge for profile
  const rankBadges = playerData?.clan_rank 
    ? checkPlayerMilestones(null, undefined, playerData.clan_rank, user?.username)
    : []
  const rankBadge = rankBadges.length > 0 ? rankBadges[0] : null

  return (
    <>
      {/* Static Header - STORMLIGHT banner */}
      <AnimatedHeader />

      {/* Profile Header Section - Gold Ribbon + Profile Panel */}
      {user?.username && user?.isLinked && (profileError ? (
        <section className="profile-header-section">
          <RibbonNav />
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Profile Error</h1>
              </div>
            </div>
          </div>
          <div className="profile-header-panel">
            <div className="profile-header-panel-content">
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">{profileError}</p>
                {!user?.requiresLinking && (
                  <Button onClick={fetchPlayerStats} className="profile-button">
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : profileLoading || !playerData ? (
        <section className="profile-header-section">
          <RibbonNav />
          <div className="gold-banner-wrapper">
            <div className="fantasy-banner fantasy-banner--gold">
              <div className="fantasy-banner-inner">
                <div className="w-32 h-6 bg-white/20 rounded animate-pulse mx-auto"></div>
              </div>
            </div>
          </div>
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
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : playerData && (
        <section className="profile-header-section">
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

          {/* Profile Panel - collapsible */}
          <div 
            className={`profile-header-panel ${
              profileAnimReady ? 'profile-header-panel--animated' : ''
            } ${profileExpanded ? 'profile-header-panel--expanded' : ''}`}
          >
            <div className="profile-header-panel-content">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Column - Avatar & Username */}
                <div className="lg:w-[30%] flex-shrink-0">
                  <div className="rounded-lg p-6 bg-slate-700/30 text-center">
                    <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-theme-accent">
                      <AvatarImage src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username)}/chat.png`} />
                      <AvatarFallback className="bg-slate-700 text-white text-2xl">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold text-white mb-2">{user.username}</h2>
                    {rankBadge && (
                      <div
                        className="inline-flex w-fit shrink-0 px-2 py-1 text-xs font-semibold items-center gap-1 rounded-md text-white mx-auto"
                        style={{ background: rankBadge.gradientBackground || rankBadge.backgroundColor }}
                      >
                        <img src={rankBadge.icon} alt={rankBadge.name} className="w-3 h-3" />
                        <span>{rankBadge.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Column - Action Buttons */}
                <div className="flex-1 lg:max-w-[40%] space-y-2">
                  <Button
                    onClick={() => setSettingsSection('account')}
                    className="w-full justify-start bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Account
                  </Button>
                  <Button
                    onClick={() => setSettingsSection('badges')}
                    className="w-full justify-start bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Badges
                  </Button>
                  <Button
                    onClick={() => setSettingsSection('appearance')}
                    className="w-full justify-start bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Change Theme
                  </Button>
                  <Button
                    onClick={logout}
                    className="w-full justify-start bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-900/50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>

                {/* Right Column - Quick Stats */}
                <div className="flex-1 lg:max-w-[30%]">
                  <div className="rounded-lg p-4 bg-slate-700/30 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Level</span>
                      <span className="text-white font-medium">{playerData.stats?.overall?.level?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total XP</span>
                      <span className="text-white font-medium">{playerData.stats?.overall?.xp?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Combat Level</span>
                      <span className="text-white font-medium">{playerData.stats?.overall?.combatlevel || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quest Points</span>
                      <span className="text-white font-medium">{questData?.quest_points || playerData.quest_points || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Settings Dialogs */}
      <Dialog open={settingsSection === 'account'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Account</DialogTitle>
            <DialogDescription>Link alternate RuneScape accounts to your profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Link New Account</label>
              <div className="flex gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleSubmitLinkRequest}
                  disabled={linkRequestLoading || !newUsername.trim()}
                  className="bg-theme-button hover:bg-theme-button-hover"
                >
                  {linkRequestLoading ? <Spinner size="sm" /> : 'Link'}
                </Button>
              </div>
            </div>
            
            {linkedAccounts.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Switch Account</label>
                <div className="space-y-1">
                  {linkedAccounts.map((account: any) => (
                    <Button
                      key={account.username}
                      onClick={() => handleSwitchAccount(account.username)}
                      disabled={account.username === user?.username}
                      className={`w-full justify-start ${
                        account.username === user?.username
                          ? 'bg-theme-accent/20 text-theme-accent-light'
                          : 'bg-slate-700/50 hover:bg-slate-600/50 text-white'
                      }`}
                    >
                      {account.username}
                      {account.username === user?.username && (
                        <Badge className="ml-auto bg-theme-accent/30 text-theme-accent-light">Current</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {accountLinkRequests.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Pending Requests</label>
                <div className="space-y-1">
                  {accountLinkRequests.filter((req: any) => req.status === 'PENDING').map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                      <span className="text-white">{req.alternateUsername}</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                    </div>
                  ))}
                  {accountLinkRequests.filter((req: any) => req.status === 'REJECTED').map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                      <span className="text-white">{req.alternateUsername}</span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRejectedRequest(req.id)}
                          className="text-red-400 hover:text-red-300 h-6 px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsSection === 'badges'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Badge Selection</DialogTitle>
            <DialogDescription>Select a badge to display with your username</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {eligibleBadges.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No badges available</p>
            ) : (
              eligibleBadges.map((badge) => {
                const backgroundColor = badge.gradientColors
                  ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                  : badge.backgroundColor || '#6b7280'
                return (
                  <Button
                    key={badge.id}
                    onClick={() => handleBadgeSelection(badge.id)}
                    className={`w-full justify-start ${
                      selectedBadgeId === badge.id
                        ? 'ring-2 ring-theme-accent'
                        : ''
                    }`}
                    style={{ background: backgroundColor }}
                  >
                    <img src={badge.imageUrl} alt={badge.name} className="w-4 h-4 mr-2" />
                    {badge.name}
                    {selectedBadgeId === badge.id && (
                      <Badge className="ml-auto bg-white/20">Selected</Badge>
                    )}
                  </Button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsSection === 'appearance'} onOpenChange={(open) => !open && setSettingsSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Theme</DialogTitle>
            <DialogDescription>Select a color theme for the site</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedTheme === key
                    ? 'border-white scale-105'
                    : 'border-slate-600 hover:border-slate-400'
                }`}
                style={{ background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentDark})` }}
              >
                <span className="text-white text-xs font-medium">{theme.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content - Unified Container */}
      <div className="fantasy-container">
        {/* Purple Admin Panel Header Ribbon */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner fantasy-banner--admin">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Admin Panel</h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="fantasy-content">
          {/* Admin Tabs */}
          <div className="fantasy-section">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-slate-700/50 border border-slate-600 mb-4">
                <TabsTrigger value="home" className="flex items-center space-x-2 data-[state=active]:bg-slate-600">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </TabsTrigger>
                <TabsTrigger value="badges" className="flex items-center space-x-2 data-[state=active]:bg-slate-600">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Badges</span>
                </TabsTrigger>
                <TabsTrigger value="competitions" className="flex items-center space-x-2 data-[state=active]:bg-slate-600">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Competitions</span>
                </TabsTrigger>
                <TabsTrigger value="ranks" className="flex items-center space-x-2 data-[state=active]:bg-slate-600">
                  <ArrowBigUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Ranks</span>
                </TabsTrigger>
                <TabsTrigger value="memberlog" className="flex items-center space-x-2 data-[state=active]:bg-slate-600">
                  <UsersRound className="w-4 h-4" />
                  <span className="hidden sm:inline">Log</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="home">
                <AdminHomeTab />
              </TabsContent>
              <TabsContent value="badges">
                <BadgeManagementTab />
              </TabsContent>
              <TabsContent value="competitions">
                <CompetitionManagementTab />
              </TabsContent>
              <TabsContent value="ranks">
                <RankTrackingTab />
              </TabsContent>
              <TabsContent value="memberlog">
                <MemberLogTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminPanel
