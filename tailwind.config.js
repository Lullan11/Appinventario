// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './views/**/*.html',
  ],
  safelist: [
    'border-principal',
    'text-principal',
    'focus:ring-principal',
    'hover:bg-principal',
    'hover:text-principal',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E1E2D',
        secondary: '#1B1B28',
        accent: '#00E096',
        lightGray: '#F5F5F5',
        principal: '#0FBFBF',
        muted: '#6C7293',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
