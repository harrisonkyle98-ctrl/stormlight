import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, User, Users, Trophy, Key, LogOut } from 'lucide-react'
import { Tooltip } from './ui/tooltip'
import './RibbonNav.css'

interface NavItem {
  path?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  adminOnly?: boolean
}

const RibbonNav = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: Home },
    { 
      path: user?.username ? `/clan-member/${user.username.replace(/\s/g, '-')}` : undefined, 
      label: 'Profile', 
      icon: User 
    },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/competitions', label: 'Competitions', icon: Trophy },
    { path: '/admin', label: 'Admin', icon: Key, adminOnly: true },
    { label: 'Logout', icon: LogOut, onClick: logout },
  ]

  const isActive = (path?: string) => path && location.pathname === path

  // Filter out admin item if user is not an admin
  const visibleItems = navItems.filter(item => {
    if (item.adminOnly) {
      return user?.clanRank && ['Owner', 'Deputy Owner', 'Overseer'].includes(user.clanRank)
    }
    return true
  })

  return (
    <nav className="ribbon-nav-container" aria-label="Main navigation">
      <div className="ribbon-nav-bar">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isCurrentActive = isActive(item.path)
          
          const ribbonContent = (
            <div 
              className={`nav-ribbon ${isCurrentActive ? 'nav-ribbon--active' : ''}`}
              role="menuitem"
              aria-current={isCurrentActive ? 'page' : undefined}
            >
              <div className="nav-ribbon-inner">
                <Icon className="nav-ribbon-icon" />
              </div>
            </div>
          )

          if (item.onClick) {
            return (
              <Tooltip key={item.label} content={item.label} placement="bottom">
                <button
                  onClick={item.onClick}
                  className="nav-ribbon-link"
                  aria-label={item.label}
                >
                  {ribbonContent}
                </button>
              </Tooltip>
            )
          }

          if (item.path) {
            return (
              <Tooltip key={item.label} content={item.label} placement="bottom">
                <Link
                  to={item.path}
                  className="nav-ribbon-link"
                  aria-label={item.label}
                >
                  {ribbonContent}
                </Link>
              </Tooltip>
            )
          }

          return null
        })}
      </div>
    </nav>
  )
}

export default RibbonNav
