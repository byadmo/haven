/** @type {import('tailwindcss').Config} */
module.exports = {
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
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
  			// Brand-accent palette, scoped per sub-app. `:root` resolves the vars to
  			// emerald (Education + shared surfaces); the `.finance-accent` subtree
  			// re-maps them to indigo (Finance). Every emerald-* utility reads these
  			// channel vars, so opacity / hover / gradient variants recolor
  			// automatically per sub-app without editing each file.
  			emerald: {
  				DEFAULT: 'rgb(var(--e-500) / <alpha-value>)',
  				200: 'rgb(var(--e-200) / <alpha-value>)',
  				300: 'rgb(var(--e-300) / <alpha-value>)',
  				400: 'rgb(var(--e-400) / <alpha-value>)',
  				500: 'rgb(var(--e-500) / <alpha-value>)',
  				600: 'rgb(var(--e-600) / <alpha-value>)'
  			}
  			},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		// Standardized motion physics tokens (consumed by `ease-enter`,
  		// `ease-exit`, `ease-state` Tailwind utilities, mapped below to the
  		// cubic-bezier curves in the design spec).
  		//   enter: ease-out — elements that need to appear (modals, dropdowns, cards).
  		//   exit:  ease-in  — elements that need to disappear (close animations).
  		//   state: ease-in-out — toggle / hover / color state transitions.
  		// Hard cap: 300ms for any UI animation. Primitives default to 150ms.
  		transitionTimingFunction: {
  			DEFAULT: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  			enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  			exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
  			state: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
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
  			},
  			// GPU-only keyframes for enter/exit content. Animate transform +
  			// opacity only — never layout-affecting properties (width/height/top).
  			'enter-fade-up': {
  				from: { opacity: '0', transform: 'translateY(6px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			'enter-fade': {
  				from: { opacity: '0' },
  				to: { opacity: '1' }
  			},
  			'exit-fade': {
  				from: { opacity: '1' },
  				to: { opacity: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s cubic-bezier(0, 0, 0.2, 1)',
  			'accordion-up': 'accordion-up 0.2s cubic-bezier(0.4, 0, 1, 1)',
  			'enter-fade-up': 'enter-fade-up 200ms cubic-bezier(0, 0, 0.2, 1)',
  			'enter-fade': 'enter-fade 200ms cubic-bezier(0, 0, 0.2, 1)',
  			'exit-fade': 'exit-fade 150ms cubic-bezier(0.4, 0, 1, 1)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
