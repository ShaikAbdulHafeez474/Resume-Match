/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        page:   '#f0f2f8',
        white:  '#ffffff',
        soft:   '#f7f8fc',
        indigo: '#6366f1',
        purple: '#8b5cf6',
        pink:   '#ec4899',
        orange: '#f97316',
        yellow: '#eab308',
        green:  '#22c55e',
        blue:   '#3b82f6',
        red:    '#ef4444',
      },
    }
  },
  plugins: []
}
