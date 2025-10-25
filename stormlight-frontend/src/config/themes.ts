export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    slate800: string
    slate700: string
    slate600: string
    slate500: string
    slate400: string
    slate300: string
    accent: string
    accentHover: string
    accentLight: string
    button: string
    buttonHover: string
    cardBg: string
    cardBorder: string
  }
  gradient: string
}

export const themes: Record<string, Theme> = {
  blue: {
    id: 'blue',
    name: 'Sapphire',
    colors: {
      primary: '#1e3a8a',
      secondary: '#3b82f6',
      slate800: '#1e293b',
      slate700: '#334155',
      slate600: '#475569',
      slate500: '#64748b',
      slate400: '#94a3b8',
      slate300: '#cbd5e1',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      accentLight: '#60a5fa',
      button: '#2563eb',
      buttonHover: '#1d4ed8',
      cardBg: 'rgba(30, 41, 59, 0.5)',
      cardBorder: '#334155'
    },
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      primary: '#7f1d1d',
      secondary: '#dc2626',
      slate800: '#1e293b',
      slate700: '#450a0a',
      slate600: '#7f1d1d',
      slate500: '#991b1b',
      slate400: '#b91c1c',
      slate300: '#dc2626',
      accent: '#dc2626',
      accentHover: '#b91c1c',
      accentLight: '#ef4444',
      button: '#dc2626',
      buttonHover: '#b91c1c',
      cardBg: 'rgba(127, 29, 29, 0.3)',
      cardBorder: '#7f1d1d'
    },
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #fbbf24 100%)'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#064e3b',
      secondary: '#10b981',
      slate800: '#1e293b',
      slate700: '#064e3b',
      slate600: '#047857',
      slate500: '#059669',
      slate400: '#10b981',
      slate300: '#34d399',
      accent: '#10b981',
      accentHover: '#059669',
      accentLight: '#34d399',
      button: '#10b981',
      buttonHover: '#059669',
      cardBg: 'rgba(6, 78, 59, 0.3)',
      cardBorder: '#047857'
    },
    gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      slate800: '#0f172a',
      slate700: '#1e293b',
      slate600: '#334155',
      slate500: '#475569',
      slate400: '#64748b',
      slate300: '#94a3b8',
      accent: '#64748b',
      accentHover: '#475569',
      accentLight: '#94a3b8',
      button: '#475569',
      buttonHover: '#334155',
      cardBg: 'rgba(15, 23, 42, 0.5)',
      cardBorder: '#334155'
    },
    gradient: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)'
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst',
    colors: {
      primary: '#581c87',
      secondary: '#a855f7',
      slate800: '#1e293b',
      slate700: '#581c87',
      slate600: '#6b21a8',
      slate500: '#7e22ce',
      slate400: '#9333ea',
      slate300: '#a855f7',
      accent: '#a855f7',
      accentHover: '#9333ea',
      accentLight: '#c084fc',
      button: '#9333ea',
      buttonHover: '#7e22ce',
      cardBg: 'rgba(88, 28, 135, 0.3)',
      cardBorder: '#6b21a8'
    },
    gradient: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#c2410c',
      secondary: '#fb923c',
      slate800: '#1e293b',
      slate700: '#7c2d12',
      slate600: '#9a3412',
      slate500: '#c2410c',
      slate400: '#ea580c',
      slate300: '#f97316',
      accent: '#f97316',
      accentHover: '#ea580c',
      accentLight: '#fb923c',
      button: '#ea580c',
      buttonHover: '#c2410c',
      cardBg: 'rgba(194, 65, 12, 0.3)',
      cardBorder: '#9a3412'
    },
    gradient: 'linear-gradient(135deg, #c2410c 0%, #fbbf24 100%)'
  }
}

export const defaultTheme = 'blue'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-secondary', theme.colors.secondary)
  root.style.setProperty('--color-slate-800', theme.colors.slate800)
  root.style.setProperty('--color-slate-700', theme.colors.slate700)
  root.style.setProperty('--color-slate-600', theme.colors.slate600)
  root.style.setProperty('--color-slate-500', theme.colors.slate500)
  root.style.setProperty('--color-slate-400', theme.colors.slate400)
  root.style.setProperty('--color-slate-300', theme.colors.slate300)
  root.style.setProperty('--color-accent', theme.colors.accent)
  root.style.setProperty('--color-accent-hover', theme.colors.accentHover)
  root.style.setProperty('--color-accent-light', theme.colors.accentLight)
  root.style.setProperty('--color-button', theme.colors.button)
  root.style.setProperty('--color-button-hover', theme.colors.buttonHover)
  root.style.setProperty('--color-card-bg', theme.colors.cardBg)
  root.style.setProperty('--color-card-border', theme.colors.cardBorder)
  root.style.setProperty('--gradient', theme.gradient)
}
