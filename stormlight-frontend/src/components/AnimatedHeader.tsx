import { useTheme } from '../contexts/ThemeContext'
import './AnimatedHeader.css'

interface HeaderThemeConfig {
  textGlow: string
  mistColor: string
  mistSoft: string
}

const headerThemes: Record<string, HeaderThemeConfig> = {
  blue: {
    textGlow: '0 0 12px rgba(90,150,255,0.8), 0 0 24px rgba(59,130,246,0.4)',
    mistColor: 'rgba(59,130,246,0.30)',
    mistSoft: 'rgba(59,130,246,0.15)'
  },
  crimson: {
    textGlow: '0 0 12px rgba(239,68,68,0.8), 0 0 24px rgba(220,38,38,0.4)',
    mistColor: 'rgba(220,38,38,0.30)',
    mistSoft: 'rgba(220,38,38,0.15)'
  },
  emerald: {
    textGlow: '0 0 12px rgba(52,211,153,0.8), 0 0 24px rgba(16,185,129,0.4)',
    mistColor: 'rgba(16,185,129,0.30)',
    mistSoft: 'rgba(16,185,129,0.15)'
  },
  amethyst: {
    textGlow: '0 0 12px rgba(192,132,252,0.8), 0 0 24px rgba(168,85,247,0.4)',
    mistColor: 'rgba(168,85,247,0.30)',
    mistSoft: 'rgba(168,85,247,0.15)'
  },
  sunset: {
    textGlow: '0 0 12px rgba(251,146,60,0.8), 0 0 24px rgba(249,115,22,0.4)',
    mistColor: 'rgba(249,115,22,0.30)',
    mistSoft: 'rgba(249,115,22,0.15)'
  },
  obsidian: {
    textGlow: '0 0 12px rgba(148,163,184,0.6), 0 0 24px rgba(100,116,139,0.3)',
    mistColor: 'rgba(148,163,184,0.25)',
    mistSoft: 'rgba(148,163,184,0.12)'
  }
}

const AnimatedHeader = () => {
  const { theme } = useTheme()
  const themeConfig = headerThemes[theme] || headerThemes.blue

  return (
    <div 
      className="animated-header"
      style={{
        '--header-text-glow': themeConfig.textGlow,
        '--header-mist-color': themeConfig.mistColor,
        '--header-mist-soft': themeConfig.mistSoft,
      } as React.CSSProperties}
    >
      {/* Cloud animation layers from CodePen */}
      <div className="clouds">
        <div className="clouds-1"></div>
        <div className="clouds-2"></div>
        <div className="clouds-3"></div>
      </div>
      <h1 className="animated-header-title">STORMLIGHT</h1>
    </div>
  )
}

export default AnimatedHeader
