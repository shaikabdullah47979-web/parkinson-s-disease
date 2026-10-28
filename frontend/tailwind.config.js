/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#d9e2ee',
          200: '#b4c6dc',
          300: '#84a2c4',
          400: '#567caa',
          500: '#385f90',
          600: '#274b77',
          700: '#173B64', // Secondary navy
          800: '#0F2D5B', // Primary navy
          900: '#0A1E3D',
          950: '#061327'
        },
        clinical: {
          teal: '#14B8A6',
          darkTeal: '#0F766E',
          cyan: '#00C5FF',
          sky: '#0EA5E9',
          sidebar: '#F0F8FF',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          surface: '#F1F5F9',
          text: '#172B4D',
          muted: '#64748B',
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C',
          info: '#1D4ED8'
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'glow-cyan': '0 6px 18px -2px rgba(14, 165, 233, 0.35)',
        'glow-pill': '0 4px 12px 0 rgba(6, 182, 212, 0.30)'
      }
    },
  },
  plugins: [],
}
