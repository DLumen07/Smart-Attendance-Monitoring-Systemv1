/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2937',
        brand: '#0f766e',
        cream: '#fffaf0',
        sunset: '#f59e0b',
      },
    },
  },
  plugins: [],
}
