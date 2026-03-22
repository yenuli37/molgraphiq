/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#03131b',
          900: '#061E29',
          800: '#0d2230',
          700: '#537D96',   // steel blue
          500: '#44A194',   // jade teal
          400: '#EC8F8D',   // salmon coral
        },
        navy: {
          950: '#03131b',
          900: '#061E29',
          800: '#0d2230',
          700: '#537D96',
          600: '#537D96',
        },
        teal: {
          400: '#44A194',
          500: '#3a8c80',
          600: '#537D96',
        },
        glass: 'rgba(83, 125, 150, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
