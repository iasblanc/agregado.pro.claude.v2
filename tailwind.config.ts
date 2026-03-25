import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Cores AllYouCan Design System ───────────────────────────
      colors: {
        'ag-bg':         '#F5F2EC',
        'ag-surface':    '#EDE9E0',
        'ag-primary':    '#1A1915',
        'ag-secondary':  '#5C5850',
        'ag-muted':      '#9C988E',
        'ag-accent':     '#2D2B26',
        'ag-cta':        '#1A1915',
        'ag-cta-text':   '#F5F2EC',
        'ag-border':     '#D8D3C8',
        // Status
        'ag-success':    '#2A6B3A',
        'ag-warning':    '#9A6B00',
        'ag-danger':     '#9A2B2B',
        // Status bg
        'ag-success-bg': '#EDF5EE',
        'ag-warning-bg': '#FDF7E8',
        'ag-danger-bg':  '#FDEDED',
      },

      // ─── Tipografia AllYouCan ─────────────────────────────────────
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['Courier New', 'monospace'],
      },

      fontSize: {
        'display-xl': ['64px', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'display-lg': ['44px', { lineHeight: '1.10', letterSpacing: '-0.015em' }],
        'display-md': ['28px', { lineHeight: '1.20', letterSpacing: '-0.01em' }],
        'display-sm': ['20px', { lineHeight: '1.30' }],
        'overline':   ['11px', { lineHeight: '1.5',  letterSpacing: '0.18em' }],
        'caption':    ['12px', { lineHeight: '1.5' }],
        'body-sm':    ['13px', { lineHeight: '1.6' }],
        'body':       ['15px', { lineHeight: '1.6' }],
        'body-lg':    ['18px', { lineHeight: '1.7' }],
      },

      // ─── Espaçamento AllYouCan ────────────────────────────────────
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '40px',
        '2xl': '64px',
        '3xl': '96px',
        '4xl': '128px',
      },

      // ─── Border Radius ────────────────────────────────────────────
      borderRadius: {
        'sm':   '4px',
        'md':   '8px',
        'lg':   '16px',
        'xl':   '24px',
        'pill': '100px',
      },

      // ─── Sombras ──────────────────────────────────────────────────
      boxShadow: {
        'sm': '0 1px 3px rgba(26,25,21,0.08)',
        'md': '0 4px 16px rgba(26,25,21,0.10)',
        'lg': '0 12px 40px rgba(26,25,21,0.12)',
      },

      // ─── Breakpoints (mobile-first) ───────────────────────────────
      screens: {
        'xs': '375px',  // Smartphones pequenos
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config
