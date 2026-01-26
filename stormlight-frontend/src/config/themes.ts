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
  silver: {
    id: 'silver',
    name: 'Silver',
    top: '#c0c0c0',
    middle: '#a8a8a8',
    bottom: '#8a8a8a',
    gradient: 'linear-gradient(135deg, #c0c0c0 0%, #8a8a8a 100%)'
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    top: '#bfa44b',      // desaturated 17%
    middle: '#b4973b',   // desaturated 17%
    bottom: '#967e39',   // desaturated 17%
    gradient: 'linear-gradient(135deg, #bfa44b 0%, #967e39 100%)'
  },
  sandstone: {
    id: 'sandstone',
    name: 'Tangerine',
    top: '#d98c4a',
    middle: '#c47a3d',
    bottom: '#a66530',
    gradient: 'linear-gradient(135deg, #d98c4a 0%, #a66530 100%)'
  },
  red: {
    id: 'red',
    name: 'Crimson',
    top: '#bc4545',      // further desaturated
    middle: '#9d3737',   // further desaturated
    bottom: '#823131',   // further desaturated
    gradient: 'linear-gradient(135deg, #bc4545 0%, #823131 100%)'
  },
  cherry: {
    id: 'cherry',
    name: 'Cherry',
    top: '#d44d5c',
    middle: '#b8404d',
    bottom: '#9a3540',
    gradient: 'linear-gradient(135deg, #d44d5c 0%, #9a3540 100%)'
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    top: '#9b7bb8',
    middle: '#8668a3',
    bottom: '#6f5588',
    gradient: 'linear-gradient(135deg, #9b7bb8 0%, #6f5588 100%)'
  },
  purple: {
    id: 'purple',
    name: 'Amethyst',
    top: '#7347b9',      // further desaturated
    middle: '#613b9b',   // further desaturated
    bottom: '#50337e',   // further desaturated
    gradient: 'linear-gradient(135deg, #7347b9 0%, #50337e 100%)'
  },
  blue: {
    id: 'blue',
    name: 'Sapphire',
    top: '#4f6ebc',      // desaturated 17%
    middle: '#445ea1',   // desaturated 17%
    bottom: '#394f8b',   // desaturated 17%
    gradient: 'linear-gradient(135deg, #4f6ebc 0%, #394f8b 100%)'
  },
  pine: {
    id: 'pine',
    name: 'Pine',
    top: '#3d8a7a',
    middle: '#337566',
    bottom: '#2a6054',
    gradient: 'linear-gradient(135deg, #3d8a7a 0%, #2a6054 100%)'
  },
  green: {
    id: 'green',
    name: 'Emerald',
    top: '#329951',      // desaturated 17%
    middle: '#2a7d45',   // desaturated 17%
    bottom: '#205d34',   // desaturated 17%
    gradient: 'linear-gradient(135deg, #329951 0%, #205d34 100%)'
  }
}

// Ordered array for UI selectors - exact order: Silver, Gold, Tangerine, Crimson, Cherry, Lavender, Amethyst, Sapphire, Pine, Emerald
export const ribbonColorOrder = ['silver', 'gold', 'sandstone', 'red', 'cherry', 'lavender', 'purple', 'blue', 'pine', 'green']

// Get ribbon colors in the correct order for UI display
export function getOrderedRibbonColors(): RibbonColor[] {
  return ribbonColorOrder.map(id => ribbonColors[id])
}

export const defaultRibbonColor = 'purple'

export function applyRibbonColor(color: RibbonColor) {
  const root = document.documentElement
  
  // Set CSS variables for the profile ribbon
  root.style.setProperty('--profile-ribbon-top', color.top)
  root.style.setProperty('--profile-ribbon-middle', color.middle)
  root.style.setProperty('--profile-ribbon-bottom', color.bottom)
  
  // Store the ribbon color ID for reference
  root.setAttribute('data-ribbon-color', color.id)
}

// Apply page ribbon color - controls all page header ribbons (including Admin)
export function applyPageRibbonColor(color: RibbonColor | null) {
  const root = document.documentElement
  
  if (color) {
    // Set CSS variables for the page ribbon (overrides all page headers)
    root.style.setProperty('--page-ribbon-top', color.top)
    root.style.setProperty('--page-ribbon-middle', color.middle)
    root.style.setProperty('--page-ribbon-bottom', color.bottom)
    root.setAttribute('data-page-ribbon-color', color.id)
  } else {
    // Remove page ribbon override - revert to default behavior
    root.style.removeProperty('--page-ribbon-top')
    root.style.removeProperty('--page-ribbon-middle')
    root.style.removeProperty('--page-ribbon-bottom')
    root.removeAttribute('data-page-ribbon-color')
  }
}

// Default page ribbon color (null means use default behavior - Sapphire sitewide, Amethyst for Admin)
export const defaultPageRibbonColor: string | null = null

// Apply navigation ribbon color - controls the ribbon-style navigation elements
export function applyNavRibbonColor(color: RibbonColor | null) {
  const root = document.documentElement
  
  if (color) {
    // Set CSS variables for the navigation ribbon (overrides nav ribbon colors)
    root.style.setProperty('--nav-ribbon-top', color.top)
    root.style.setProperty('--nav-ribbon-middle', color.middle)
    root.style.setProperty('--nav-ribbon-bottom', color.bottom)
    root.setAttribute('data-nav-ribbon-color', color.id)
  } else {
    // Remove nav ribbon override - revert to default behavior
    root.style.removeProperty('--nav-ribbon-top')
    root.style.removeProperty('--nav-ribbon-middle')
    root.style.removeProperty('--nav-ribbon-bottom')
    root.removeAttribute('data-nav-ribbon-color')
  }
}

// Default nav ribbon color (null means use default behavior)
export const defaultNavRibbonColor: string | null = null

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
// All colors desaturated 17%, magenta also darkened 11%
export const themes: Record<string, Theme> = {
  gold: {
    id: 'gold',
    name: 'Gold',
    colors: {
      primary: '#bfa44b',      // desaturated 17%
      secondary: '#b4973b',    // desaturated 17%
      ...standardColors,
      accent: '#bfa44b',
      accentHover: '#b4973b',
      accentLight: '#d4bc6a',
      accentDark: '#967e39',
      textAccent: '#bfa44b'
    },
    gradient: 'linear-gradient(135deg, #bfa44b 0%, #967e39 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  blue: {
    id: 'blue',
    name: 'Sapphire Blue',
    colors: {
      primary: '#4f6ebc',      // desaturated 17%
      secondary: '#445ea1',    // desaturated 17%
      ...standardColors,
      accent: '#5a7ac7',
      accentHover: '#4f6ebc',
      accentLight: '#7a94d4',
      accentDark: '#394f8b',
      textAccent: '#7a94d4'
    },
    gradient: 'linear-gradient(135deg, #4f6ebc 0%, #394f8b 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  green: {
    id: 'green',
    name: 'Emerald Green',
    colors: {
      primary: '#329951',      // desaturated 17%
      secondary: '#2a7d45',    // desaturated 17%
      ...standardColors,
      accent: '#3aa85a',
      accentHover: '#329951',
      accentLight: '#4db96a',
      accentDark: '#205d34',
      textAccent: '#4db96a'
    },
    gradient: 'linear-gradient(135deg, #329951 0%, #205d34 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Purple',
    colors: {
      primary: '#7347b9',      // further desaturated
      secondary: '#613b9b',    // further desaturated
      ...standardColors,
      accent: '#8558c4',
      accentHover: '#7347b9',
      accentLight: '#9a70d0',
      accentDark: '#50337e',
      textAccent: '#9a70d0'
    },
    gradient: 'linear-gradient(135deg, #7347b9 0%, #50337e 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  },
  red: {
    id: 'red',
    name: 'Crimson Red',
    colors: {
      primary: '#bc4545',      // further desaturated
      secondary: '#9d3737',    // further desaturated
      ...standardColors,
      accent: '#c95858',
      accentHover: '#bc4545',
      accentLight: '#d66b6b',
      accentDark: '#823131',
      textAccent: '#d66b6b'
    },
    gradient: 'linear-gradient(135deg, #bc4545 0%, #823131 100%)',
    pageBg: 'linear-gradient(180deg, #252d41 0%, #21283a 100%)'
  }
}

export const defaultTheme = 'purple'

// Legacy applyTheme function - now only applies ribbon color
export function applyTheme(theme: Theme) {
  const ribbonColor = ribbonColors[theme.id]
  if (ribbonColor) {
    applyRibbonColor(ribbonColor)
  }
}
