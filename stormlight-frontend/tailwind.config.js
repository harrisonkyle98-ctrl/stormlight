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
  				'card-border': 'var(--color-card-border)',
  				'slate-800': 'var(--color-slate-800)',
  				'slate-700': 'var(--color-slate-700)',
  				'slate-600': 'var(--color-slate-600)',
  				'slate-500': 'var(--color-slate-500)',
  				'slate-400': 'var(--color-slate-400)',
  				'slate-300': 'var(--color-slate-300)'
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

