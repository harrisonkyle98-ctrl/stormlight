import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast, Toaster } from 'sonner'

const LinkAccount = () => {
  const { linkAccount } = useAuth()
  const navigate = useNavigate()
  const [customUsername, setCustomUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLinkAccount = async () => {
    if (!customUsername) {
      toast.error('Please enter a RuneScape username')
      return
    }

    setLoading(true)
    try {
      const result = await linkAccount(customUsername)
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
    <div className="min-h-screen flex items-center justify-center p-6">
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
              <Label className="text-white">Enter your RuneScape username:</Label>
              <Input
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="Your RuneScape username"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleLinkAccount}
            disabled={loading || !customUsername}
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
