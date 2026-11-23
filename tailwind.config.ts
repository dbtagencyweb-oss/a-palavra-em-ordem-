import type { Config } from 'tailwindcss'

// Tokens from docs/02-design-som-midia.md
export default {
  content: ['./index.html', './lp/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F5EFE3', 2: '#EDE4D3' },
        card: '#FFFCF6',
        // ink-3 darkened from #8A8D98 for AA contrast (Sprint 5 review).
        ink: { DEFAULT: '#1E2230', 2: '#4A4F5E', 3: '#6A6D75' },
        // `*-ink`: text shades of the accents that pass AA on paper/card (4.5:1).
        ember: { DEFAULT: '#C4572E', soft: '#F3DCCF', ink: '#A34826', button: '#C0552D' },
        gold: { DEFAULT: '#B8893A', soft: '#F1E3C4', ink: '#8A672B' },
        olive: { DEFAULT: '#5D6B3B', soft: '#E1E6D2' },
        line: '#E2D8C5',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '18px', btn: '14px' },
      boxShadow: {
        card: '0 1px 0 rgba(30,34,48,.04), 0 8px 24px -12px rgba(30,34,48,.18)',
        pill: '0 2px 0 #E2D8C5',
      },
    },
  },
  plugins: [],
} satisfies Config
