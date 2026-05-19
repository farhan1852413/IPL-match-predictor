/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0B0F19',
          50: '#F3F4F6',
          100: '#E5E7EB',
          200: '#9CA3AF',
          300: '#4B5563',
          400: '#374151',
          500: '#1F2937',
          600: '#111827',
          700: '#0F172A',
          800: '#0B0F19',
          900: '#05070C',
        },
        neon: {
          blue: '#00F2FE',
          pink: '#F53803',
          purple: '#7F00FF',
          green: '#39FF14',
          cyan: '#00FFFF',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(0, 0, 0, 0.55)',
        'neon-blue': '0 0 15px rgba(0, 242, 254, 0.5)',
        'neon-purple': '0 0 15px rgba(127, 0, 255, 0.5)',
      }
    },
  },
  plugins: [],
}
