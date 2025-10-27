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

export const themes: Record<string, Theme> = {
  blue: {
    id: 'blue',
    name: 'Sapphire',
    colors: {
      primary: '#1e3a8a',
      secondary: '#3b82f6',
      
      slate900: '#0f172a',
      slate800: '#1e293b',
      slate700: '#334155',
      slate600: '#475569',
      slate500: '#64748b',
      slate400: '#94a3b8',
      slate300: '#cbd5e1',
      slate200: '#e2e8f0',
      slate100: '#f1f5f9',
      
      accent: '#3b82f6',
      accentHover: '#2563eb',
      accentLight: '#60a5fa',
      accentDark: '#1e40af',
      
      button: '#2563eb',
      buttonHover: '#1d4ed8',
      buttonActive: '#1e40af',
      
      cardBg: 'rgba(30, 41, 59, 0.8)',
      cardBgHover: 'rgba(30, 41, 59, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textAccent: '#60a5fa',
      
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      
      border: '#334155',
      borderLight: '#475569',
      borderDark: '#1e293b',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    pageBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      primary: '#7f1d1d',
      secondary: '#dc2626',
      
      slate900: '#1c0a0a',
      slate800: '#2d1212',
      slate700: '#450a0a',
      slate600: '#7f1d1d',
      slate500: '#991b1b',
      slate400: '#b91c1c',
      slate300: '#dc2626',
      slate200: '#ef4444',
      slate100: '#fca5a5',
      
      accent: '#dc2626',
      accentHover: '#b91c1c',
      accentLight: '#ef4444',
      accentDark: '#991b1b',
      
      button: '#dc2626',
      buttonHover: '#b91c1c',
      buttonActive: '#991b1b',
      
      cardBg: 'rgba(30, 41, 59, 0.8)',
      cardBgHover: 'rgba(30, 41, 59, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#fef2f2',
      textSecondary: '#fecaca',
      textMuted: '#fca5a5',
      textAccent: '#ef4444',
      
      bgPrimary: '#1c0a0a',
      bgSecondary: '#2d1212',
      bgTertiary: '#450a0a',
      
      border: '#7f1d1d',
      borderLight: '#991b1b',
      borderDark: '#450a0a',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #fbbf24 100%)',
    pageBg: 'linear-gradient(180deg, #2d1212 0%, #1c0a0a 100%)'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#064e3b',
      secondary: '#10b981',
      
      slate900: '#0a1f1a',
      slate800: '#0f2e26',
      slate700: '#064e3b',
      slate600: '#047857',
      slate500: '#059669',
      slate400: '#10b981',
      slate300: '#34d399',
      slate200: '#6ee7b7',
      slate100: '#a7f3d0',
      
      accent: '#10b981',
      accentHover: '#059669',
      accentLight: '#34d399',
      accentDark: '#047857',
      
      button: '#10b981',
      buttonHover: '#059669',
      buttonActive: '#047857',
      
      cardBg: 'rgba(30, 41, 59, 0.8)',
      cardBgHover: 'rgba(30, 41, 59, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#ecfdf5',
      textSecondary: '#d1fae5',
      textMuted: '#a7f3d0',
      textAccent: '#34d399',
      
      bgPrimary: '#0a1f1a',
      bgSecondary: '#0f2e26',
      bgTertiary: '#064e3b',
      
      border: '#047857',
      borderLight: '#059669',
      borderDark: '#064e3b',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    pageBg: 'linear-gradient(180deg, #0f2e26 0%, #0a1f1a 100%)'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      
      slate900: '#020617',
      slate800: '#0f172a',
      slate700: '#1e293b',
      slate600: '#334155',
      slate500: '#475569',
      slate400: '#64748b',
      slate300: '#94a3b8',
      slate200: '#cbd5e1',
      slate100: '#e2e8f0',
      
      accent: '#64748b',
      accentHover: '#475569',
      accentLight: '#94a3b8',
      accentDark: '#334155',
      
      button: '#475569',
      buttonHover: '#334155',
      buttonActive: '#1e293b',
      
      cardBg: 'rgba(15, 23, 42, 0.8)',
      cardBgHover: 'rgba(15, 23, 42, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#f1f5f9',
      textSecondary: '#e2e8f0',
      textMuted: '#cbd5e1',
      textAccent: '#94a3b8',
      
      bgPrimary: '#020617',
      bgSecondary: '#0f172a',
      bgTertiary: '#1e293b',
      
      border: '#334155',
      borderLight: '#475569',
      borderDark: '#1e293b',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
    pageBg: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)'
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst',
    colors: {
      primary: '#581c87',
      secondary: '#a855f7',
      
      slate900: '#1e0a33',
      slate800: '#2e1e47',
      slate700: '#581c87',
      slate600: '#6b21a8',
      slate500: '#7e22ce',
      slate400: '#9333ea',
      slate300: '#a855f7',
      slate200: '#c084fc',
      slate100: '#e9d5ff',
      
      accent: '#a855f7',
      accentHover: '#9333ea',
      accentLight: '#c084fc',
      accentDark: '#7e22ce',
      
      button: '#9333ea',
      buttonHover: '#7e22ce',
      buttonActive: '#6b21a8',
      
      cardBg: 'rgba(30, 41, 59, 0.8)',
      cardBgHover: 'rgba(30, 41, 59, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#faf5ff',
      textSecondary: '#f3e8ff',
      textMuted: '#e9d5ff',
      textAccent: '#c084fc',
      
      bgPrimary: '#1e0a33',
      bgSecondary: '#2e1e47',
      bgTertiary: '#581c87',
      
      border: '#6b21a8',
      borderLight: '#7e22ce',
      borderDark: '#581c87',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
    pageBg: 'linear-gradient(180deg, #2e1e47 0%, #1e0a33 100%)'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#c2410c',
      secondary: '#fb923c',
      
      slate900: '#1f0f06',
      slate800: '#3a1c0d',
      slate700: '#7c2d12',
      slate600: '#9a3412',
      slate500: '#c2410c',
      slate400: '#ea580c',
      slate300: '#f97316',
      slate200: '#fb923c',
      slate100: '#fed7aa',
      
      accent: '#f97316',
      accentHover: '#ea580c',
      accentLight: '#fb923c',
      accentDark: '#c2410c',
      
      button: '#ea580c',
      buttonHover: '#c2410c',
      buttonActive: '#9a3412',
      
      cardBg: 'rgba(30, 41, 59, 0.8)',
      cardBgHover: 'rgba(30, 41, 59, 0.95)',
      cardBorder: 'rgba(51, 65, 85, 0.6)',
      cardBorderHover: '#475569',
      
      textPrimary: '#ffedd5',
      textSecondary: '#fed7aa',
      textMuted: '#fdba74',
      textAccent: '#fb923c',
      
      bgPrimary: '#1f0f06',
      bgSecondary: '#3a1c0d',
      bgTertiary: '#7c2d12',
      
      border: '#9a3412',
      borderLight: '#c2410c',
      borderDark: '#7c2d12',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    gradient: 'linear-gradient(135deg, #c2410c 0%, #fbbf24 100%)',
    pageBg: 'linear-gradient(180deg, #3a1c0d 0%, #1f0f06 100%)'
  }
}

export const defaultTheme = 'blue'

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
  }
  return '0 0 0'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  document.body.setAttribute('data-theme', theme.id)
  
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-secondary', theme.colors.secondary)
  
  root.style.setProperty('--color-slate-900', theme.colors.slate900)
  root.style.setProperty('--color-slate-800', theme.colors.slate800)
  root.style.setProperty('--color-slate-700', theme.colors.slate700)
  root.style.setProperty('--color-slate-600', theme.colors.slate600)
  root.style.setProperty('--color-slate-500', theme.colors.slate500)
  root.style.setProperty('--color-slate-400', theme.colors.slate400)
  root.style.setProperty('--color-slate-300', theme.colors.slate300)
  root.style.setProperty('--color-slate-200', theme.colors.slate200)
  root.style.setProperty('--color-slate-100', theme.colors.slate100)
  
  root.style.setProperty('--color-slate-900-rgb', hexToRgb(theme.colors.slate900))
  root.style.setProperty('--color-slate-800-rgb', hexToRgb(theme.colors.slate800))
  root.style.setProperty('--color-slate-700-rgb', hexToRgb(theme.colors.slate700))
  root.style.setProperty('--color-slate-600-rgb', hexToRgb(theme.colors.slate600))
  root.style.setProperty('--color-slate-500-rgb', hexToRgb(theme.colors.slate500))
  root.style.setProperty('--color-slate-400-rgb', hexToRgb(theme.colors.slate400))
  root.style.setProperty('--color-slate-300-rgb', hexToRgb(theme.colors.slate300))
  root.style.setProperty('--color-slate-200-rgb', hexToRgb(theme.colors.slate200))
  root.style.setProperty('--color-slate-100-rgb', hexToRgb(theme.colors.slate100))
  
  root.style.setProperty('--color-accent', theme.colors.accent)
  root.style.setProperty('--color-accent-hover', theme.colors.accentHover)
  root.style.setProperty('--color-accent-light', theme.colors.accentLight)
  root.style.setProperty('--color-accent-dark', theme.colors.accentDark)
  
  root.style.setProperty('--color-button', theme.colors.button)
  root.style.setProperty('--color-button-hover', theme.colors.buttonHover)
  root.style.setProperty('--color-button-active', theme.colors.buttonActive)
  
  root.style.setProperty('--color-card-bg', theme.colors.cardBg)
  root.style.setProperty('--color-card-bg-hover', theme.colors.cardBgHover)
  root.style.setProperty('--color-card-border', theme.colors.cardBorder)
  root.style.setProperty('--color-card-border-hover', theme.colors.cardBorderHover)
  
  root.style.setProperty('--color-text-primary', theme.colors.textPrimary)
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--color-text-muted', theme.colors.textMuted)
  root.style.setProperty('--color-text-accent', theme.colors.textAccent)
  
  root.style.setProperty('--color-bg-primary', theme.colors.bgPrimary)
  root.style.setProperty('--color-bg-secondary', theme.colors.bgSecondary)
  root.style.setProperty('--color-bg-tertiary', theme.colors.bgTertiary)
  
  root.style.setProperty('--color-border', theme.colors.border)
  root.style.setProperty('--color-border-light', theme.colors.borderLight)
  root.style.setProperty('--color-border-dark', theme.colors.borderDark)
  
  root.style.setProperty('--color-success', theme.colors.success)
  root.style.setProperty('--color-warning', theme.colors.warning)
  root.style.setProperty('--color-error', theme.colors.error)
  
  root.style.setProperty('--gradient', theme.gradient)
  root.style.setProperty('--page-bg', theme.pageBg)
}
