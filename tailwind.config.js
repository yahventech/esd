/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A1628',
          50: '#0d1c33',
          100: '#0f1f3a',
          200: '#132848',
          300: '#1a3560',
          400: '#234880',
        },
        emerald: {
          DEFAULT: '#00A86B',
          50: '#e6faf2',
          100: '#b3f0d9',
          200: '#66e0b3',
          300: '#1ad18d',
          400: '#00c17a',
          500: '#00A86B',
          600: '#008f5b',
          700: '#00764b',
        },
        gold: {
          DEFAULT: '#FFD700',
          50: '#fff9d9',
          100: '#fff0a3',
          200: '#ffe766',
          300: '#ffde2e',
          400: '#FFD700',
          500: '#d4b300',
          600: '#a88f00',
        },
        charcoal: {
          DEFAULT: '#1C1C1E',
          50: '#232325',
          100: '#2c2c2e',
          200: '#3a3a3c',
          300: '#48484a',
        },
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        body: ['"Source Sans 3"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-live': 'pulse-live 1.5s ease-in-out infinite',
        'ticker': 'ticker-scroll 28s linear infinite',
        'fade-in': 'fade-in-up 0.7s ease-out forwards',
        'slide-right': 'slide-right 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.4)' },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in-up': {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-right': {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,215,0,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(255,215,0,0.25)' },
        },
      },
    },
  },
  plugins: [],
};
