const lbcTeal = { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#2dd4bf', 400: '#14b8a6', 500: '#0f766e', 600: '#0f766e', 700: '#115e59', 800: '#134e4a', 900: '#042f2e', 950: '#021a19' };
const lbcCyan = { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#22d3ee', 400: '#06b6d4', 500: '#0e7490', 600: '#0e7490', 700: '#155e75', 800: '#164e63', 900: '#083344', 950: '#04222c' };
const lbcTealThemed = { ...lbcTeal, 300: 'rgb(var(--lbc-teal-300) / <alpha-value>)', 400: 'rgb(var(--lbc-teal-400) / <alpha-value>)' };
const lbcCyanThemed = { ...lbcCyan, 300: 'rgb(var(--lbc-cyan-300) / <alpha-value>)', 400: 'rgb(var(--lbc-cyan-400) / <alpha-value>)' };

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        // LBC logo palette remap: legacy decorative pink/fuchsia → teal and
        // purple/violet/indigo → cyan. Steps 400+ are one-to-two shades darker
        // than stock so white text on 500/600 and text on light surfaces keep
        // ≥ 4.5:1. Red/rose/amber/green/blue (semantic) are untouched.
        // 300/400 are theme-aware (bright on dark, deep teal on light) because
        // they are used as text/rings on both themes. Indigo is only used on
        // always-dark admin surfaces, so it keeps the static cyan scale.
        pink: lbcTealThemed, fuchsia: lbcTealThemed,
        purple: lbcCyanThemed, violet: lbcCyanThemed, indigo: lbcCyan,
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
        }
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
