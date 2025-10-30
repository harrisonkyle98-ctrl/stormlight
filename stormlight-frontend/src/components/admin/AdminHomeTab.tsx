import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Activity, AlertCircle, CheckCircle, Clock, UserPlus } from 'lucide-react'
import { Spinner } from '../ui/spinner'

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
  const [accountLinkRequests, setAccountLinkRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const [logsResponse, healthResponse, linkRequestsResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/health`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/account-link-requests`, {
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

      if (linkRequestsResponse.ok) {
        const linkData = await linkRequestsResponse.json()
        setAccountLinkRequests(linkData.requests || [])
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkDiscord = async (username: string) => {
    if (!confirm(`Are you sure you want to unlink the Discord account from ${username}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      console.log('[UNLINK] Username:', username)
      
      const response = await fetch(`${API_URL}/api/admin/members/${encodeURIComponent(username)}/unlink-discord`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Discord account unlinked successfully!')
        await fetchAdminData()
      } else {
        const error = await response.json()
        console.error('[UNLINK] Error response:', error)
        alert(`Error unlinking Discord account: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[UNLINK] Exception:', error)
      alert(`Error unlinking Discord account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      console.log('[APPROVE] Request ID:', requestId)
      console.log('[APPROVE] Token:', token ? 'Present' : 'Missing')
      
      const response = await fetch(`${API_URL}/api/admin/account-link-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('[APPROVE] Response status:', response.status)
      console.log('[APPROVE] Response ok:', response.ok)

      if (response.ok) {
        await fetchAdminData()
        alert('Account link request approved successfully!')
      } else {
        const error = await response.json()
        console.error('[APPROVE] Error response:', error)
        
        if (error.detail && error.detail.includes('already linked to')) {
          const match = error.detail.match(/already linked to '([^']+)'/)
          if (match && match[1]) {
            const linkedUsername = match[1]
            const shouldUnlink = confirm(
              `${error.detail}\n\nWould you like to unlink the Discord account from "${linkedUsername}" now?`
            )
            if (shouldUnlink) {
              await handleUnlinkDiscord(linkedUsername)
            }
          } else {
            alert(`Error approving account link request: ${error.detail}`)
          }
        } else {
          alert(`Error approving account link request: ${error.detail || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('[APPROVE] Exception:', error)
      alert(`Error approving account link request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      console.log('[REJECT] Request ID:', requestId)
      console.log('[REJECT] Token:', token ? 'Present' : 'Missing')
      
      const response = await fetch(`${API_URL}/api/admin/account-link-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('[REJECT] Response status:', response.status)
      console.log('[REJECT] Response ok:', response.ok)

      if (response.ok) {
        await fetchAdminData()
        alert('Account link request rejected successfully!')
      } else {
        const error = await response.json()
        console.error('[REJECT] Error response:', error)
        alert(`Error rejecting account link request: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[REJECT] Exception:', error)
      alert(`Error rejecting account link request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUnlinkRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to unlink these accounts? This will remove their link but not delete any accounts.')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      console.log('[UNLINK_REQUEST] Request ID:', requestId)
      
      const response = await fetch(`${API_URL}/api/admin/account-link-requests/${requestId}/unlink`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Accounts unlinked successfully!')
        await fetchAdminData()
      } else {
        const error = await response.json()
        console.error('[UNLINK_REQUEST] Error response:', error)
        alert(`Error unlinking accounts: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[UNLINK_REQUEST] Exception:', error)
      alert(`Error unlinking accounts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'UNLINKED':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Spinner size="md" />
        <div className="text-center text-slate-400">Loading admin data...</div>
      </div>
    )
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
                <Clock className="w-4 h-4 text-theme-accent-light" />
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

      {/* Account Link Requests */}
      <Card className="bg-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-theme-accent-light" />
            <span>Account Link Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {accountLinkRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No account link requests</p>
            ) : (
              accountLinkRequests.map((request) => (
                <div key={request.id} className="p-4 bg-slate-600/30 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{request.primaryUsername}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-white font-medium">{request.alternateUsername}</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Requested {new Date(request.requestedAt).toLocaleString()}
                      </p>
                      {request.status === 'APPROVED' && request.reviewedBy && (
                        <p className="text-xs text-green-400">
                          Approved by {request.reviewedBy}
                        </p>
                      )}
                      {request.status === 'REJECTED' && request.reviewedBy && (
                        <p className="text-xs text-red-400">
                          Rejected by {request.reviewedBy}
                        </p>
                      )}
                      {request.status === 'UNLINKED' && request.reviewedBy && (
                        <p className="text-xs text-slate-400">
                          Unlinked by {request.reviewedBy}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(request.status)}`}>
                      {request.status}
                    </Badge>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        size="sm"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectRequest(request.id)}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1"
                        size="sm"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {request.status === 'APPROVED' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUnlinkRequest(request.id)}
                        className="bg-slate-600 hover:bg-slate-700 text-white w-full"
                        size="sm"
                      >
                        Unlink
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
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
