import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast, Toaster } from 'sonner'
import '../styles/fantasy-container.css'
import AnimatedHeader from '../components/AnimatedHeader'

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
    <>
      {/* Animated hero banner - same as login page */}
      <AnimatedHeader />
      
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4 -mt-32">
        {/* Unified outer container with fantasy styling */}
        <div className="fantasy-container w-full max-w-md">
          {/* Blue header ribbon with "Account Linking" */}
          <div className="fantasy-banner-wrapper">
            <div className="fantasy-banner">
              <div className="fantasy-banner-inner">
                <h1 className="fantasy-banner-title">Account Linking</h1>
              </div>
            </div>
          </div>

          {/* Inner panel content with proper spacing */}
          <div className="fantasy-content">
            <div className="fantasy-section">
              <div className="text-center mb-6">
                <p className="text-slate-300 mb-1">
                  Link Your RuneScape Account
                </p>
                <p className="text-slate-300 text-sm">
                  Connect your Discord account to your RuneScape clan member profile
                </p>
              </div>

              <div className="space-y-4 mb-6">
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Linking Account...</span>
                  </div>
                ) : (
                  <span>Link Account</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default LinkAccount
