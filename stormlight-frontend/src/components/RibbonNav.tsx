import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Trophy } from 'lucide-react'
import { Tooltip } from './ui/tooltip'
import './RibbonNav.css'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'blue' | 'magenta' | 'green'
}

const RibbonNav = () => {
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/', label: 'Home', icon: Home, variant: 'blue' },
    { path: '/members', label: 'Members', icon: Users, variant: 'magenta' },
    { path: '/competitions', label: 'Competitions', icon: Trophy, variant: 'green' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="ribbon-nav-container" aria-label="Main navigation">
      <div className="ribbon-nav-bar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isCurrentActive = isActive(item.path)
          
          return (
            <Tooltip key={item.label} content={item.label} placement="bottom" className="nav-tooltip">
              <Link
                to={item.path}
                className="nav-ribbon-link"
                aria-label={item.label}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className={`nav-ribbon nav-ribbon--${item.variant} ${isCurrentActive ? 'nav-ribbon--active' : ''}`}
                  role="menuitem"
                  aria-current={isCurrentActive ? 'page' : undefined}
                >
                  <div className="nav-ribbon-body">
                    <div className="nav-ribbon-inner">
                      <Icon className="nav-ribbon-icon" />
                    </div>
                  </div>
                </div>
              </Link>
            </Tooltip>
          )
        })}
      </div>
    </nav>
  )
}

export default RibbonNav
