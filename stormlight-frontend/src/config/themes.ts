// Ribbon Color System - Only affects the profile ribbon color
// This replaces the old site-wide theme system

export interface RibbonColor {
  id: string
  name: string
  top: string      // Lightest shade
  middle: string   // Mid shade
  bottom: string   // Darkest shade
  gradient: string // For the color picker preview
}

export const ribbonColors: Record<string, RibbonColor> = {
  gold: {
    id: 'gold',
    name: 'Gold',
    top: '#D4AF37',
    middle: '#C9A227',
    bottom: '#A88728',
    gradient: 'linear-gradient(135deg, #D4AF37 0%, #A88728 100%)'
  },
  blue: {
    id: 'blue',
    name: 'Sapphire Blue',
    top: '#3b66d1',
    middle: '#3156b5',
    bottom: '#29479c',
    gradient: 'linear-gradient(135deg, #3b66d1 0%, #29479c 100%)'
  },
  green: {
    id: 'green',
    name: 'Emerald Green',
    top: '#28a34d',
    middle: '#228542',
    bottom: '#1a6332',
    gradient: 'linear-gradient(135deg, #28a34d 0%, #1a6332 100%)'
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Purple',
    top: '#6d28d9',
    middle: '#5b21b6',
    bottom: '#4c1d95',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)'
  },
  red: {
    id: 'red',
    name: 'Crimson Red',
    top: '#dc2626',
    middle: '#b91c1c',
    bottom: '#991b1b',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
  }
}

export const defaultRibbonColor = 'gold'

export function applyRibbonColor(color: RibbonColor) {
  const root = document.documentElement
  
  // Set CSS variables for the profile ribbon
  root.style.setProperty('--profile-ribbon-top', color.top)
  root.style.setProperty('--profile-ribbon-middle', color.middle)
  root.style.setProperty('--profile-ribbon-bottom', color.bottom)
  
  // Store the ribbon color ID for reference
  root.setAttribute('data-ribbon-color', color.id)
}

// Legacy exports for backward compatibility during transition
// The themes object now maps to ribbon colors
export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    slate900: string
    slate800: string
    slate700: string
    slate600: string
    slate500: string
    slate400: string
    slate300: string
    slate200: string
    slate100: string
    accent: string
    accentHover: string
    accentLight: string
    accentDark: string
    button: string
    buttonHover: string
    buttonActive: string
    cardBg: string
    cardBgHover: string
    cardBorder: string
    cardBorderHover: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    textAccent: string
    bgPrimary: string
    bgSecondary: string
    bgTertiary: string
    border: string
    borderLight: string
    borderDark: string
    success: string
    warning: string
    error: string
  }
  gradient: string
  pageBg: string
}

// Standard colors used across all ribbon colors (site appearance stays constant)
const standardColors = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  button: '#2563eb',
  buttonHover: '#1d4ed8',
  buttonActive: '#1e40af',
  cardBg: 'rgba(30, 41, 59, 0.8)',
  cardBgHover: 'rgba(30, 41, 59, 0.95)',
  cardBorder: 'rgba(51, 65, 85, 0.6)',
  cardBorderHover: 'rgba(51, 65, 85, 0.8)',
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  border: '#334155',
  borderLight: '#475569',
  borderDark: '#1e293b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
}

// Legacy themes object - maps to ribbon colors for backward compatibility
export const themes: Record<string, Theme> = {
  gold: {
    id: 'gold',
    name: 'Gold',
    colors: {
      primary: '#D4AF37',
      secondary: '#C9A227',
      ...standardColors,
      accent: '#D4AF37',
      accentHover: '#C9A227',
      accentLight: '#E5C158',
      accentDark: '#A88728',
      textAccent: '#D4AF37'
    },
    gradient: 'linear-gradient(135deg, #D4AF37 0%, #A88728 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  blue: {
    id: 'blue',
    name: 'Sapphire Blue',
    colors: {
      primary: '#3b66d1',
      secondary: '#3156b5',
      ...standardColors,
      accent: '#3b82f6',
      accentHover: '#2563eb',
      accentLight: '#60a5fa',
      accentDark: '#1e40af',
      textAccent: '#60a5fa'
    },
    gradient: 'linear-gradient(135deg, #3b66d1 0%, #29479c 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  green: {
    id: 'green',
    name: 'Emerald Green',
    colors: {
      primary: '#28a34d',
      secondary: '#228542',
      ...standardColors,
      accent: '#10b981',
      accentHover: '#059669',
      accentLight: '#34d399',
      accentDark: '#047857',
      textAccent: '#34d399'
    },
    gradient: 'linear-gradient(135deg, #28a34d 0%, #1a6332 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Purple',
    colors: {
      primary: '#6d28d9',
      secondary: '#5b21b6',
      ...standardColors,
      accent: '#a855f7',
      accentHover: '#9333ea',
      accentLight: '#c084fc',
      accentDark: '#7e22ce',
      textAccent: '#c084fc'
    },
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  red: {
    id: 'red',
    name: 'Crimson Red',
    colors: {
      primary: '#dc2626',
      secondary: '#b91c1c',
      ...standardColors,
      accent: '#ef4444',
      accentHover: '#dc2626',
      accentLight: '#f87171',
      accentDark: '#b91c1c',
      textAccent: '#f87171'
    },
    gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  }
}

export const defaultTheme = 'gold'

// Legacy applyTheme function - now only applies ribbon color
export function applyTheme(theme: Theme) {
  const ribbonColor = ribbonColors[theme.id]
  if (ribbonColor) {
    applyRibbonColor(ribbonColor)
  }
}
