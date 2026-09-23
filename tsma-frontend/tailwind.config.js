/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0E2A4A',
          deep: '#081B31',
          light: '#1C3E63',
        },
        gold: {
          DEFAULT: '#D9922E',
          light: '#F0B75E',
          dark: '#B87620',
        },
        green: {
          DEFAULT: '#157A52',
          light: '#1F9A6B',
          dark: '#0F5E3F',
        },
        terracotta: {
          DEFAULT: '#C1541F',
          light: '#DA6E38',
          dark: '#9C4218',
        },
        cream: {
          DEFAULT: '#F3EFE4',
          dark: '#E6DDC9',
        },
        ink: {
          DEFAULT: '#1B211D',
          muted: '#6B7178',
        },
      },
      fontFamily: {
        serif: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'track-lines':
          'repeating-linear-gradient(115deg, rgba(217,146,46,0.06) 0px, rgba(217,146,46,0.06) 1px, transparent 1px, transparent 34px)',
      },
      animation: {
        'fade-in': 'fadeIn 1.2s ease forwards',
        'slide-up': 'slideUp 0.8s ease forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
