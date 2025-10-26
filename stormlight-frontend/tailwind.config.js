/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			slate: {
  				900: 'var(--color-slate-900)',
  				800: 'var(--color-slate-800)',
  				700: 'var(--color-slate-700)',
  				600: 'var(--color-slate-600)',
  				500: 'var(--color-slate-500)',
  				400: 'var(--color-slate-400)',
  				300: 'var(--color-slate-300)',
  				200: 'var(--color-slate-200)',
  				100: 'var(--color-slate-100)'
  			},
  			blue: {
  				500: 'var(--color-primary)',
  				400: 'var(--color-accent)',
  				300: 'var(--color-accent-light)'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			theme: {
  				primary: 'var(--color-primary)',
  				secondary: 'var(--color-secondary)',
  				accent: 'var(--color-accent)',
  				'accent-hover': 'var(--color-accent-hover)',
  				'accent-light': 'var(--color-accent-light)',
  				button: 'var(--color-button)',
  				'button-hover': 'var(--color-button-hover)',
  				'card-bg': 'var(--color-card-bg)',
  				'card-border': 'var(--color-card-border)'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [import("tailwindcss-animate")],
}

