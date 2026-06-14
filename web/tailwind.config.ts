import type { Config } from 'tailwindcss';

/**
 * Design tokens are the spec's §6 palette and type pairing. Drive everything from here.
 * Warm night sky: deep indigo-plum base (never pure black), luminous accents.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          deep: '#0B0A1F', // base background
          panel: '#16142E', // cards, overlays
        },
        starlight: '#F5F3FF', // primary warm-white text
        muted: '#9B96C4', // lavender-grey secondary text
        glow: {
          gold: '#FFD08A', // a person's claimed star + primary accent
        },
        aurora: {
          teal: '#6FE3C4', // connection lines, secondary accent
          violet: '#B58CFF', // gradient partner for lines + ambient nebula
        },
      },
      fontFamily: {
        // Display: Fraunces (heirloom + modern). Body: Hanken Grotesk (humanist).
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'star-gold': '0 0 12px 2px rgba(255, 208, 138, 0.7), 0 0 28px 6px rgba(255, 208, 138, 0.35)',
        'star-dim': '0 0 6px 1px rgba(155, 150, 196, 0.4)',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        twinkle: 'twinkle 4s ease-in-out infinite',
        'rise-in': 'rise-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
