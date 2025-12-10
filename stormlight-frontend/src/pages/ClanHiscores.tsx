import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Trophy, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { User } from 'lucide-react'
import { usernameToUrl } from '../utils/urlUtils'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import '../styles/fantasy-container.css'

interface Badge {
  id: string
  name: string
  imageUrl?: string
  gradientColors?: string[]
  backgroundColor?: string
  category?: string
  hierarchyTier?: number
  hierarchyPath?: string
}

interface MemberWithBadges {
  username: string
  clan_rank: string
  total_xp: number
  badges: Badge[]
  badgeScore: number
  skillBadgeCount: number
  pvmBadgeCount: number
  dxpBadgeCount: number
  skillBadgeScore: number
  pvmBadgeScore: number
  dxpBadgeScore: number
}

type TabType = 'overall' | 'skill' | 'pvm' | 'dxp'

// Badge tier weights for hierarchical badges
const PVM_TIER_WEIGHTS: Record<number, number> = {
  1: 1,   // PvM Champion
  2: 2,   // PvM Warden
  3: 3,   // PvM Master
  4: 4,   // PvM Patron
  5: 5,   // PvM Overlord
  6: 6,   // PvM Completionist
}

const DXP_TIER_WEIGHTS: Record<number, number> = {
  1: 1,   // DXP Champion
  2: 2,   // DXP Warden
  3: 3,   // DXP Master
  4: 4,   // DXP Patron
  5: 5,   // DXP Completionist
}

const ClanHiscores = () => {
    const [members, setMembers] = useState<MemberWithBadges[]>([])
    const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overall')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all clan members with their badges
      const membersResponse = await fetch(`${API_URL}/api/clan/members?limit=250`)
      const membersData = await membersResponse.json()
      
      // Fetch all custom badges to get category and tier info
      const badgesResponse = await fetch(`${API_URL}/api/badges`)
      const badgesData = await badgesResponse.json()
      
      const badgeMap = new Map<string, Badge>()
      if (badgesData.badges) {
        badgesData.badges.forEach((badge: Badge) => {
          badgeMap.set(badge.id, badge)
        })
      }
      
            // Process members and calculate badge scores
      const processedMembers: MemberWithBadges[] = (membersData.members || []).map((member: any) => {
        const memberBadges: Badge[] = []
        let skillBadgeCount = 0
        let pvmBadgeCount = 0
        let dxpBadgeCount = 0
        let skillBadgeScore = 0
        let pvmBadgeScore = 0
        let dxpBadgeScore = 0
        
        // Process each badge the member has
        if (member.badges && Array.isArray(member.badges)) {
          member.badges.forEach((badgeRef: any) => {
            const badgeId = typeof badgeRef === 'string' ? badgeRef : badgeRef.id
            const badgeInfo = badgeMap.get(badgeId)
            
            if (badgeInfo) {
              memberBadges.push(badgeInfo)
              
              // Calculate scores based on category
              const category = badgeInfo.category?.toUpperCase() || ''
              const tier = badgeInfo.hierarchyTier || 1
              
              if (category === 'SKILL') {
                skillBadgeCount++
                skillBadgeScore += 1 // Skill badges are not tiered, each counts as 1
              } else if (category === 'PVM') {
                pvmBadgeCount++
                pvmBadgeScore += PVM_TIER_WEIGHTS[tier] || tier
              } else if (category === 'DXP') {
                dxpBadgeCount++
                dxpBadgeScore += DXP_TIER_WEIGHTS[tier] || tier
              }
            }
          })
        }
        
        const totalScore = skillBadgeScore + pvmBadgeScore + dxpBadgeScore
        
        return {
          username: member.username,
          clan_rank: member.clan_rank,
          total_xp: member.total_xp,
          badges: memberBadges,
          badgeScore: totalScore,
          skillBadgeCount,
          pvmBadgeCount,
          dxpBadgeCount,
          skillBadgeScore,
          pvmBadgeScore,
          dxpBadgeScore,
        }
      })
      
      setMembers(processedMembers)
    } catch (error) {
      console.error('Error fetching clan hiscores data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sort members based on active tab
  const getSortedMembers = () => {
    const sorted = [...members]
    
    switch (activeTab) {
      case 'skill':
        sorted.sort((a, b) => {
          if (b.skillBadgeScore !== a.skillBadgeScore) return b.skillBadgeScore - a.skillBadgeScore
          if (b.skillBadgeCount !== a.skillBadgeCount) return b.skillBadgeCount - a.skillBadgeCount
          return a.username.localeCompare(b.username)
        })
        break
      case 'pvm':
        sorted.sort((a, b) => {
          if (b.pvmBadgeScore !== a.pvmBadgeScore) return b.pvmBadgeScore - a.pvmBadgeScore
          if (b.pvmBadgeCount !== a.pvmBadgeCount) return b.pvmBadgeCount - a.pvmBadgeCount
          return a.username.localeCompare(b.username)
        })
        break
      case 'dxp':
        sorted.sort((a, b) => {
          if (b.dxpBadgeScore !== a.dxpBadgeScore) return b.dxpBadgeScore - a.dxpBadgeScore
          if (b.dxpBadgeCount !== a.dxpBadgeCount) return b.dxpBadgeCount - a.dxpBadgeCount
          return a.username.localeCompare(b.username)
        })
        break
      default: // overall
        sorted.sort((a, b) => {
          if (b.badgeScore !== a.badgeScore) return b.badgeScore - a.badgeScore
          const totalBadgesA = a.skillBadgeCount + a.pvmBadgeCount + a.dxpBadgeCount
          const totalBadgesB = b.skillBadgeCount + b.pvmBadgeCount + b.dxpBadgeCount
          if (totalBadgesB !== totalBadgesA) return totalBadgesB - totalBadgesA
          return a.username.localeCompare(b.username)
        })
    }
    
    return sorted
  }

  // Get badges for display based on active tab
  const getBadgesForTab = (member: MemberWithBadges) => {
    switch (activeTab) {
      case 'skill':
        return member.badges.filter(b => b.category?.toUpperCase() === 'SKILL')
      case 'pvm':
        return member.badges.filter(b => b.category?.toUpperCase() === 'PVM')
      case 'dxp':
        return member.badges.filter(b => b.category?.toUpperCase() === 'DXP')
      default:
        return member.badges.filter(b => 
          ['SKILL', 'PVM', 'DXP'].includes(b.category?.toUpperCase() || '')
        )
    }
  }

  // Get score for display based on active tab
  const getScoreForTab = (member: MemberWithBadges) => {
    switch (activeTab) {
      case 'skill':
        return member.skillBadgeScore
      case 'pvm':
        return member.pvmBadgeScore
      case 'dxp':
        return member.dxpBadgeScore
      default:
        return member.badgeScore
    }
  }

  // Get badge count for display based on active tab
  const getBadgeCountForTab = (member: MemberWithBadges) => {
    switch (activeTab) {
      case 'skill':
        return member.skillBadgeCount
      case 'pvm':
        return member.pvmBadgeCount
      case 'dxp':
        return member.dxpBadgeCount
      default:
        return member.skillBadgeCount + member.pvmBadgeCount + member.dxpBadgeCount
    }
  }

    const sortedMembers = getSortedMembers()
    const top3 = sortedMembers.slice(0, 3)

    if (loading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
          <Spinner size="lg" />
          <div className="text-white text-xl">Loading clan hiscores...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <GlobalProfileHeader />

      <div className="fantasy-container">
        {/* Clan Hiscores Banner Header */}
        <div className="fantasy-banner-wrapper">
          <div className="fantasy-banner-ribbon-left"></div>
          <div className="fantasy-banner-ribbon-right"></div>
          <div className="fantasy-banner fantasy-banner--competitions">
            <div className="fantasy-banner-inner">
              <h1 className="fantasy-banner-title">Clan Hiscores</h1>
            </div>
          </div>
        </div>

        <div className="fantasy-content">
          {/* Back Button */}
          <div className="mb-4 flex justify-start">
            <Button asChild className="bg-theme-button hover:bg-theme-button-hover text-white">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          {/* Tab Buttons - Same style as Competitions page */}
          <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg justify-center mb-6">
            <Button
              onClick={() => setActiveTab('overall')}
              variant="default"
              className={activeTab === 'overall' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Overall
            </Button>
            <Button
              onClick={() => setActiveTab('skill')}
              variant="default"
              className={activeTab === 'skill' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Skill
            </Button>
            <Button
              onClick={() => setActiveTab('pvm')}
              variant="default"
              className={activeTab === 'pvm' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <span className="mr-2">💀</span>
              PvM
            </Button>
            <Button
              onClick={() => setActiveTab('dxp')}
              variant="default"
              className={activeTab === 'dxp' ? 'bg-theme-button hover:bg-theme-button-hover' : 'bg-theme-button/60 hover:bg-theme-button/80'}
            >
              <span className="mr-2">2️⃣</span>
              DXP
            </Button>
          </div>

                    {/* Top 3 Display - Competition Reward Card Style */}
                    {top3.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* 1st Place - Gold Card */}
                        {top3[0] && (
                          <div 
                            className="fantasy-section overflow-hidden"
                            style={{ 
                              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                              border: '1px solid rgba(255, 215, 0, 0.3)',
                              borderRadius: 0
                            }}
                          >
                            <div className="p-4 border-b border-slate-700/50">
                              <div className="flex items-center justify-center">
                                <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-yellow-500/50">
                                  <AvatarImage
                                    src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(top3[0].username.replace(/\u00A0/g, ' '))}/chat.png`}
                                    alt={top3[0].username}
                                  />
                                  <AvatarFallback className="bg-yellow-600/30 text-yellow-400">
                                    <User className="w-8 h-8" />
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="text-center mt-3">
                                <Link 
                                  to={`/clan-member/${usernameToUrl(top3[0].username)}`}
                                  className="text-lg font-semibold hover:text-yellow-400 transition-colors text-white"
                                >
                                  {top3[0].username}
                                </Link>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="text-center mb-3">
                                <div className="text-3xl mb-1">🥇</div>
                                <div className="text-sm text-yellow-400 font-semibold">1st Place</div>
                              </div>
                              {/* Badge Display - Profile-style stacked layout */}
                              {getBadgesForTab(top3[0]).length > 0 ? (
                                <div className="flex flex-col gap-2 mt-3">
                                  {getBadgesForTab(top3[0]).map((badge) => (
                                    <div
                                      key={badge.id}
                                      className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white"
                                      style={{
                                        background: badge.gradientColors 
                                          ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                                          : badge.backgroundColor || '#6b7280'
                                      }}
                                    >
                                      {badge.imageUrl && (
                                        <img 
                                          src={badge.imageUrl}
                                          alt={badge.name}
                                          className="w-4 h-4 object-contain"
                                        />
                                      )}
                                      <span>{badge.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-sm mt-3">
                                  No badges yet
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2nd Place - Silver Card */}
                        {top3[1] && (
                          <div 
                            className="fantasy-section overflow-hidden"
                            style={{ 
                              background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                              border: '1px solid rgba(192, 192, 192, 0.3)',
                              borderRadius: 0
                            }}
                          >
                            <div className="p-4 border-b border-slate-700/50">
                              <div className="flex items-center justify-center">
                                <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-gray-400/50">
                                  <AvatarImage
                                    src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(top3[1].username.replace(/\u00A0/g, ' '))}/chat.png`}
                                    alt={top3[1].username}
                                  />
                                  <AvatarFallback className="bg-gray-500/30 text-gray-300">
                                    <User className="w-8 h-8" />
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="text-center mt-3">
                                <Link 
                                  to={`/clan-member/${usernameToUrl(top3[1].username)}`}
                                  className="text-lg font-semibold hover:text-gray-300 transition-colors text-white"
                                >
                                  {top3[1].username}
                                </Link>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="text-center mb-3">
                                <div className="text-3xl mb-1">🥈</div>
                                <div className="text-sm text-gray-300 font-semibold">2nd Place</div>
                              </div>
                              {/* Badge Display - Profile-style stacked layout */}
                              {getBadgesForTab(top3[1]).length > 0 ? (
                                <div className="flex flex-col gap-2 mt-3">
                                  {getBadgesForTab(top3[1]).map((badge) => (
                                    <div
                                      key={badge.id}
                                      className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white"
                                      style={{
                                        background: badge.gradientColors 
                                          ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                                          : badge.backgroundColor || '#6b7280'
                                      }}
                                    >
                                      {badge.imageUrl && (
                                        <img 
                                          src={badge.imageUrl}
                                          alt={badge.name}
                                          className="w-4 h-4 object-contain"
                                        />
                                      )}
                                      <span>{badge.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-sm mt-3">
                                  No badges yet
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3rd Place - Bronze Card */}
                        {top3[2] && (
                          <div 
                            className="fantasy-section overflow-hidden"
                            style={{ 
                              background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(30, 41, 59, 0.3) 100%)',
                              border: '1px solid rgba(205, 127, 50, 0.3)',
                              borderRadius: 0
                            }}
                          >
                            <div className="p-4 border-b border-slate-700/50">
                              <div className="flex items-center justify-center">
                                <Avatar className="w-16 h-16 flex-shrink-0 ring-2 ring-amber-600/50">
                                  <AvatarImage
                                    src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(top3[2].username.replace(/\u00A0/g, ' '))}/chat.png`}
                                    alt={top3[2].username}
                                  />
                                  <AvatarFallback className="bg-amber-600/30 text-amber-400">
                                    <User className="w-8 h-8" />
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="text-center mt-3">
                                <Link 
                                  to={`/clan-member/${usernameToUrl(top3[2].username)}`}
                                  className="text-lg font-semibold hover:text-amber-400 transition-colors text-white"
                                >
                                  {top3[2].username}
                                </Link>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="text-center mb-3">
                                <div className="text-3xl mb-1">🥉</div>
                                <div className="text-sm text-amber-400 font-semibold">3rd Place</div>
                              </div>
                              {/* Badge Display - Profile-style stacked layout */}
                              {getBadgesForTab(top3[2]).length > 0 ? (
                                <div className="flex flex-col gap-2 mt-3">
                                  {getBadgesForTab(top3[2]).map((badge) => (
                                    <div
                                      key={badge.id}
                                      className="px-3 py-1 text-sm font-semibold flex items-center justify-center space-x-2 rounded-md text-white"
                                      style={{
                                        background: badge.gradientColors 
                                          ? `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
                                          : badge.backgroundColor || '#6b7280'
                                      }}
                                    >
                                      {badge.imageUrl && (
                                        <img 
                                          src={badge.imageUrl}
                                          alt={badge.name}
                                          className="w-4 h-4 object-contain"
                                        />
                                      )}
                                      <span>{badge.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-sm mt-3">
                                  No badges yet
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

          {/* Full Leaderboard List */}
          <div className="fantasy-section">
            <div className="mb-4">
              <h3 className="text-white text-xl font-bold text-center" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>
                Leaderboard
              </h3>
              <div className="fantasy-divider" style={{ margin: '1rem 0' }}></div>
            </div>

            <div className="space-y-2">
              {sortedMembers.map((member, index) => {
                const badges = getBadgesForTab(member)
                const score = getScoreForTab(member)
                const badgeCount = getBadgeCountForTab(member)
                const rank = index + 1
                
                return (
                  <div
                    key={member.username}
                    className={`flex items-center justify-between p-3 transition-colors ${
                      rank === 1
                        ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-600/30' 
                        : rank === 2
                        ? 'bg-gradient-to-r from-gray-400/20 to-gray-600/20 border border-gray-400/30'
                        : rank === 3
                        ? 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border border-amber-600/30'
                        : 'bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold ${
                        rank === 1 ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/50' :
                        rank === 2 ? 'bg-gray-500/30 text-gray-300 border border-gray-400/50' :
                        rank === 3 ? 'bg-amber-600/30 text-amber-400 border border-amber-500/50' :
                        'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}>
                        #{rank}
                      </div>
                      
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage
                          src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(member.username.replace(/\u00A0/g, ' '))}/chat.png`}
                          alt={member.username}
                        />
                        <AvatarFallback className="bg-slate-700 text-slate-400">
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Username */}
                      <Link 
                        to={`/clan-member/${usernameToUrl(member.username)}`}
                        className="font-medium hover:text-theme-accent-light transition-colors text-white"
                      >
                        {member.username}
                      </Link>
                      
                      {/* Medal for top 3 */}
                      {rank <= 3 && (
                        <span className="text-lg">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Badge Icons (small, no styling) */}
                      <div className="flex items-center space-x-1 max-w-[200px] overflow-hidden">
                        {badges.slice(0, 8).map((badge) => (
                          <img
                            key={badge.id}
                            src={badge.imageUrl}
                            alt={badge.name}
                            title={badge.name}
                            className="w-5 h-5 object-contain"
                          />
                        ))}
                        {badges.length > 8 && (
                          <span className="text-xs text-slate-400">+{badges.length - 8}</span>
                        )}
                      </div>
                      
                      {/* Badge Count */}
                      <div className="text-right min-w-[60px]">
                        <p className="text-sm text-slate-400">Badges</p>
                        <p className="text-lg font-bold text-white">{badgeCount}</p>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right min-w-[60px]">
                        <p className="text-sm text-slate-400">Score</p>
                        <p className="text-lg font-bold text-green-400">{score}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {sortedMembers.length > 0 && (
              <div className="flex items-center justify-center px-4 py-3 mt-4 bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400">
                  Showing all {sortedMembers.length} clan members
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {sortedMembers.length === 0 && !loading && (
            <div className="fantasy-section">
              <div className="p-8 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No badge data found
                </h3>
                <p className="text-slate-400">
                  Clan members will appear here once they earn competition badges.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ClanHiscores
