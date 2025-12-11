import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Spinner } from './components/ui/spinner'
import AnimatedHeader from './components/AnimatedHeader'
import Home from './pages/Home'
import Hiscores from './pages/Hiscores'
import ClanHiscores from './pages/ClanHiscores'
import Members from './pages/Members'
import PlayerProfile from './pages/PlayerProfile'
import Competitions from './pages/Competitions'
import CompetitionDetail from './pages/CompetitionDetail'
import Login from './pages/Login'
import LinkAccount from './pages/LinkAccount'
import AdminPanel from './pages/AdminPanel'
import Terms from './pages/Terms'
import Footer from './components/Footer'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProfileGainsProvider } from './contexts/ProfileGainsContext'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (user.requiresLinking && !user.isLinked) {
    return <LinkAccount />
  }

    return (
      <div>
        {/* AnimatedHeader rendered at app level, outside main, for proper fixed positioning */}
        <AnimatedHeader />
        <main className="w-full px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/hiscores" element={<Hiscores />} />
                        <Route path="/clan-hiscores" element={<ClanHiscores />} />
                        <Route path="/members" element={<Members />} />
            <Route path="/clan-member/:username" element={<PlayerProfile />} />
            <Route path="/competitions" element={<Competitions />} />
            <Route path="/competitions/:id" element={<CompetitionDetail />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
        </div>
          </main>
          <Footer />
          <Toaster />
        </div>
  )
}

function AppWithTheme() {
  const { user, loading } = useAuth()
  
  return (
    <ThemeProvider user={user} loading={loading}>
      <ProfileGainsProvider>
        <Router>
          <AppContent />
        </Router>
      </ProfileGainsProvider>
    </ThemeProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppWithTheme />
    </AuthProvider>
  )
}

export default App
