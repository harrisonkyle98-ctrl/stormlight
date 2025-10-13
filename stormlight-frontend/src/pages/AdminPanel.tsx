import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent } from '../components/ui/card'
import { Settings, LayoutDashboard, Award, Trophy, BarChart3, UsersRound } from 'lucide-react'
import { AdminHomeTab } from '../components/admin/AdminHomeTab'
import { BadgeManagementTab } from '../components/admin/BadgeManagementTab'
import { CompetitionManagementTab } from '../components/admin/CompetitionManagementTab'
import { RankTrackingTab } from '../components/admin/RankTrackingTab'
import { MemberLogTab } from '../components/admin/MemberLogTab'

const AdminPanel = () => {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('home')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user?.clanRank || !['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
          <p className="text-slate-300">Manage clan settings and operations</p>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-slate-700">
              <TabsTrigger value="home" className="flex items-center space-x-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>Home</span>
              </TabsTrigger>
              <TabsTrigger value="badges" className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>Badges</span>
              </TabsTrigger>
              <TabsTrigger value="competitions" className="flex items-center space-x-2">
                <Trophy className="w-4 h-4" />
                <span>Competitions</span>
              </TabsTrigger>
              <TabsTrigger value="ranks" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Rank Tracking</span>
              </TabsTrigger>
              <TabsTrigger value="memberlog" className="flex items-center space-x-2">
                <UsersRound className="w-4 h-4" />
                <span>Member Log</span>
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
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPanel
