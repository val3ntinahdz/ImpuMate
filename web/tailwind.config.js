/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#1A6B4A',
        accent:    '#27AE60',
        secondary: '#2C3E50',
        surface: {
          m1:    '#EAF4F0',
          m2:    '#FFF3E0',
          m3:    '#E8EAF6',
          gray:  '#F5F5F5',
          input: '#F8FBF9',
        },
        text: {
          primary:   '#2C3E50',
          secondary: '#7F8C8D',
        },
        status: {
          error:   '#E74C3C',
          warning: '#E67E22',
          success: '#27AE60',
          info:    '#3498DB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
