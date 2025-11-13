import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu'
import { Home, Users, Trophy, LogOut, Key } from 'lucide-react'
import './AnimatedNavbar.css'

const AnimatedNavbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="animated-navbar">
      {/* SVG Curved Background */}
      <svg 
        className="nav-bg-svg" 
        viewBox="0 0 1200 80" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="navGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'var(--navbar-bg)', stopOpacity: 0.95 }} />
            <stop offset="50%" style={{ stopColor: 'var(--navbar-bg)', stopOpacity: 0.98 }} />
            <stop offset="100%" style={{ stopColor: 'var(--navbar-bg)', stopOpacity: 0.95 }} />
          </linearGradient>
        </defs>
        
        <path
          d="M 0 68 H 520 Q 560 78 600 80 Q 640 78 680 68 H 1200 V 0 H 0 Z"
          fill="url(#navGradient)"
          stroke="var(--navbar-border)"
          strokeWidth="1"
        />
      </svg>

      {/* Animated gradient sheen */}
      <div className="nav-sheen" />

      <div className="nav-container">
        <div className="nav-grid">
          {/* Left Navigation Section */}
          <div className="nav-section nav-left">
            <Link to="/" className="nav-brand">
              <div className="text-2xl">⚡</div>
              <span className="nav-brand-text">Stormlight</span>
            </Link>
            
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'nav-link-active' : ''}`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/members"
              className={`nav-link hidden md:flex ${isActive('/members') ? 'nav-link-active' : ''}`}
            >
              <Users className="w-4 h-4" />
              <span>Members</span>
            </Link>
          </div>

          {/* Center Circle (Avatar Dropdown) */}
          <div className="nav-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="center-circle">
                  <Avatar className="avatar-inner">
                    <AvatarImage 
                      src={
                        user?.isLinked && user?.username
                          ? `http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username.replace(/\u00A0/g, ' '))}/chat.png`
                          : user?.avatar 
                            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                            : undefined
                      } 
                      alt={user?.username} 
                    />
                    <AvatarFallback className="bg-theme-button text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="center">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-white">{user?.username}</p>
                    <p className="w-[200px] truncate text-sm text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
                {user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank) && (
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/admin" 
                      className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="md:hidden">
                  <Link 
                    to="/members" 
                    className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>Members</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={logout}
                  className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Navigation Section */}
          <div className="nav-section nav-right">
            <Link
              to="/competitions"
              className={`nav-link ${isActive('/competitions') ? 'nav-link-active' : ''}`}
            >
              <Trophy className="w-4 h-4" />
              <span>Competitions</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default AnimatedNavbar
