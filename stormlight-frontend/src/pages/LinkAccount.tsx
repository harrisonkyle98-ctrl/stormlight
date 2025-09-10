import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast, Toaster } from 'sonner'

interface ClanMember {
  username: string
  displayName?: string
  clanRank: string
}

const LinkAccount = () => {
  const { linkAccount } = useAuth()
  const navigate = useNavigate()
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([])
  const [selectedUsername, setSelectedUsername] = useState('')
  const [customUsername, setCustomUsername] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchClanMembers()
  }, [])

  const fetchClanMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clan/members?limit=500`)
      const data = await response.json()
      setClanMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching clan members:', error)
      toast.error('Failed to load clan members')
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleLinkAccount = async () => {
    const username = useCustom ? customUsername : selectedUsername
    if (!username) {
      toast.error('Please select or enter a RuneScape username')
      return
    }

    setLoading(true)
    try {
      const result = await linkAccount(username)
      if (result?.status === 'already-linked') {
        toast.info('RuneScape account already linked; continuing...')
      } else {
        toast.success('Account linked successfully!')
      }
      navigate('/')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to link account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Link Your RuneScape Account
          </CardTitle>
          <CardDescription className="text-slate-300">
            Connect your Discord account to your RuneScape clan member profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Select your RuneScape account:</Label>
              {loadingMembers ? (
                <div className="text-slate-300">Loading clan members...</div>
              ) : (
                <Select value={selectedUsername} onValueChange={setSelectedUsername} disabled={useCustom}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Choose from clan members" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {clanMembers.map((member) => (
                      <SelectItem key={member.username} value={member.username} className="text-white">
                        {member.displayName || member.username} ({member.clanRank})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="text-center text-slate-400">or</div>

            <div className="space-y-2">
              <Label className="text-white">Enter username manually:</Label>
              <Input
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                onFocus={() => setUseCustom(true)}
                placeholder="Your RuneScape username"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleLinkAccount}
            disabled={loading || (!selectedUsername && !customUsername)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Linking Account...' : 'Link Account'}
          </Button>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}

export default LinkAccount
