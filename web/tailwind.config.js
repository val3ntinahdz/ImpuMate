/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   'var(--color-primary)',
        accent:    'var(--color-accent)',
        secondary: 'var(--color-ink)',
        bg:        'var(--color-bg)',
        surface:   'var(--color-surface)',
        border:    'var(--color-border)',
        ink:       'var(--color-ink)',
        text: {
          primary: 'var(--color-text-primary)',
          muted:   'var(--color-text-muted)',
        },
        status: {
          error:   '#E74C3C',
          warning: '#E67E22',
          success: '#27AE60',
          info:    '#3498DB',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
