import { useTheme } from '../contexts/ThemeContext'
import './AnimatedHeader.css'

interface HeaderThemeConfig {
  gradient: string
  textGlow: string
  particleColor: string
}

const headerThemes: Record<string, HeaderThemeConfig> = {
  blue: {
    gradient: 'linear-gradient(120deg, rgba(30,100,200,0.25), rgba(90,150,255,0.35), rgba(20,60,160,0.25))',
    textGlow: '0 0 12px rgba(90,150,255,0.8), 0 0 24px rgba(59,130,246,0.4)',
    particleColor: 'rgba(147,197,253,0.6)'
  },
  crimson: {
    gradient: 'linear-gradient(120deg, rgba(180,40,40,0.25), rgba(255,120,60,0.35), rgba(120,20,20,0.25))',
    textGlow: '0 0 12px rgba(239,68,68,0.8), 0 0 24px rgba(220,38,38,0.4)',
    particleColor: 'rgba(252,165,165,0.6)'
  },
  emerald: {
    gradient: 'linear-gradient(120deg, rgba(6,78,59,0.25), rgba(16,185,129,0.35), rgba(4,120,87,0.25))',
    textGlow: '0 0 12px rgba(52,211,153,0.8), 0 0 24px rgba(16,185,129,0.4)',
    particleColor: 'rgba(167,243,208,0.6)'
  },
  amethyst: {
    gradient: 'linear-gradient(120deg, rgba(88,28,135,0.25), rgba(168,85,247,0.35), rgba(107,33,168,0.25))',
    textGlow: '0 0 12px rgba(192,132,252,0.8), 0 0 24px rgba(168,85,247,0.4)',
    particleColor: 'rgba(233,213,255,0.6)'
  },
  sunset: {
    gradient: 'linear-gradient(120deg, rgba(251,191,36,0.25), rgba(234,88,12,0.35), rgba(194,65,12,0.25))',
    textGlow: '0 0 12px rgba(251,146,60,0.8), 0 0 24px rgba(249,115,22,0.4)',
    particleColor: 'rgba(254,215,170,0.6)'
  },
  obsidian: {
    gradient: 'linear-gradient(120deg, rgba(100,116,139,0.15), rgba(148,163,184,0.25), rgba(71,85,105,0.15))',
    textGlow: '0 0 12px rgba(148,163,184,0.6), 0 0 24px rgba(100,116,139,0.3)',
    particleColor: 'rgba(203,213,225,0.4)'
  }
}

const AnimatedHeader = () => {
  const { theme } = useTheme()
  const themeConfig = headerThemes[theme] || headerThemes.blue

  return (
    <div 
      className="animated-header"
      style={{
        '--header-shimmer-gradient': themeConfig.gradient,
        '--header-text-glow': themeConfig.textGlow,
        '--header-particle-color': themeConfig.particleColor,
      } as React.CSSProperties}
    >
      <div className="animated-header-shimmer"></div>
      <div className="animated-header-particles"></div>
      <h1 className="animated-header-title">STORMLIGHT</h1>
    </div>
  )
}

export default AnimatedHeader
