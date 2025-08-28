import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Trophy, Users, Swords, TrendingUp } from 'lucide-react'

interface ClanStats {
  members: string[]
  clan_name: string
}

const Home = () => {
  const [clanStats, setClanStats] = useState<ClanStats | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchClanStats()
  }, [])

  const fetchClanStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clan/members`)
      if (response.ok) {
        const data = await response.json()
        setClanStats(data)
      }
    } catch (error) {
      console.error('Error fetching clan stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to <span className="text-blue-400">⚡ Stormlight</span> Clan
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Your premier RuneScape clan community. Track your progress, compete with fellow members, 
          and climb the hiscores together.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : clanStats?.members.length || 0}
            </div>
            <p className="text-xs text-slate-400">Active clan members</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Competitions</CardTitle>
            <Swords className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3</div>
            <p className="text-xs text-slate-400">Active competitions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Clan Rank</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">#42</div>
            <p className="text-xs text-slate-400">Overall ranking</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total XP</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2.1B</div>
            <p className="text-xs text-slate-400">Combined clan XP</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Clan Members</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Browse our clan roster and member profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              Explore our clan member directory to see who's in Stormlight, their clan ranks, 
              total XP, and view detailed player profiles with RuneScape stats.
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link to="/members">View Members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Swords className="h-5 w-5 text-green-400" />
              <span>Competitions</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Join XP competitions and climb the leaderboards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              Participate in skill-based competitions, track your XP gains, and compete 
              with clan members for the top spots on our leaderboards.
            </p>
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link to="/competitions">View Competitions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-slate-400">
            Latest updates from clan members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-white font-medium">ClanLeader achieved 99 Slayer!</p>
                <p className="text-slate-400 text-sm">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <div>
                <p className="text-white font-medium">New competition: Woodcutting XP Week</p>
                <p className="text-slate-400 text-sm">1 day ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <div>
                <p className="text-white font-medium">SkillMaster gained 10M Cooking XP</p>
                <p className="text-slate-400 text-sm">3 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Home
