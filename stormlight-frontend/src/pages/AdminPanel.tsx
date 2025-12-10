import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Home, Award, Trophy, ArrowBigUp, UsersRound } from 'lucide-react'
import { AdminHomeTab } from '../components/admin/AdminHomeTab'
import { BadgeManagementTab } from '../components/admin/BadgeManagementTab'
import { CompetitionManagementTab } from '../components/admin/CompetitionManagementTab'
import { RankTrackingTab } from '../components/admin/RankTrackingTab'
import { MemberLogTab } from '../components/admin/MemberLogTab'
import GlobalProfileHeader from '../components/profile/GlobalProfileHeader'
import '../styles/fantasy-container.css'

const AdminPanel = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('home')

  // Permission check
  if (!user?.clanRank || !['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <GlobalProfileHeader />

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-slate-700/50 border border-slate-600 mb-4 rounded-none">
                <TabsTrigger value="home" className="flex items-center space-x-2 rounded-none data-[state=active]:bg-slate-600 data-[state=active]:rounded-none">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </TabsTrigger>
                <TabsTrigger value="badges" className="flex items-center space-x-2 rounded-none data-[state=active]:bg-slate-600 data-[state=active]:rounded-none">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Badges</span>
                </TabsTrigger>
                <TabsTrigger value="competitions" className="flex items-center space-x-2 rounded-none data-[state=active]:bg-slate-600 data-[state=active]:rounded-none">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Competitions</span>
                </TabsTrigger>
                <TabsTrigger value="ranks" className="flex items-center space-x-2 rounded-none data-[state=active]:bg-slate-600 data-[state=active]:rounded-none">
                  <ArrowBigUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Ranks</span>
                </TabsTrigger>
                <TabsTrigger value="memberlog" className="flex items-center space-x-2 rounded-none data-[state=active]:bg-slate-600 data-[state=active]:rounded-none">
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
    </>
  )
}

export default AdminPanel
