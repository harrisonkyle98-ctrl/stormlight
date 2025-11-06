import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu'
import { Home, Users, Trophy, LogOut, Settings, Key } from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { theme } = useTheme()
  const isObsidian = theme === 'obsidian'
  
  const navbarStyle: React.CSSProperties = isObsidian
    ? {}
    : {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderColor: 'rgba(51, 65, 85, 0.6)',
      }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/competitions', label: 'Competitions', icon: Trophy },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav 
      className={`backdrop-blur-sm border-b sticky top-0 z-50 ${
        isObsidian ? 'bg-slate-800/80 border-slate-700' : 'navbar-hardlock'
      }`}
      style={isObsidian ? undefined : navbarStyle}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl">⚡</div>
              <span className="text-xl font-bold text-white">Stormlight</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(path)
                      ? 'bg-theme-button text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8 bg-theme-button">
                    <AvatarImage 
                      src={
                        user?.isLinked && user?.username
                          ? `http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(user.username.replace(/\u00A0/g, ' '))}/chat.png`
                          : user?.avatar 
                            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                            : undefined
                      } 
                      alt={user?.username} 
                      className="relative z-10"
                    />
                    <AvatarFallback className="bg-theme-button text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
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
        </div>

        {/* Mobile menu */}
        <div className="md:hidden pb-4">
          <div className="flex flex-wrap gap-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'bg-theme-button text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
