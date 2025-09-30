import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface AdminLog {
  id: number
  username: string
  action: string
  details?: string
  timestamp: string
}

interface SiteHealth {
  snapshot_status: string
  scheduler_status: string
  failed_members: string[]
  total_members: number
}

export const AdminHomeTab = () => {
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([])
  const [siteHealth, setSiteHealth] = useState<SiteHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const [logsResponse, healthResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/health`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setAdminLogs(logsData.logs || [])
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setSiteHealth(healthData)
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading admin data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Site Health */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Site Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">Snapshots</span>
              </div>
              <p className="text-white font-medium">{siteHealth?.snapshot_status || 'Unknown'}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-400">Scheduler</span>
              </div>
              <p className="text-white font-medium">{siteHealth?.scheduler_status || 'Unknown'}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-400">Failed</span>
              </div>
              <p className="text-white font-medium">{siteHealth?.failed_members?.length || 0}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-400">Total Members</span>
              </div>
              <p className="text-white font-medium">{siteHealth?.total_members || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Logs */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {adminLogs.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No admin actions recorded</p>
            ) : (
              adminLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-600/30 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{log.username}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    {log.details && (
                      <p className="text-sm text-slate-400 mt-1">{log.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
