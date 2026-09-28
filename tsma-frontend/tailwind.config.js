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
        // Kijani kimeng'arishwa kidogo (kutoka #1EA34D) - kinabaki
        // "kijani cha TFF/bendera" lakini sasa kina mwanga zaidi kwa
        // ajili ya maandishi juu ya picha za hero (Home) ambazo
        // wakati mwingine ni nyepesi/zenye rangi nyingi.
        gold: {
          DEFAULT: '#24B056',
          light: '#4FCB79',
          dark: '#1B8A42',
        },
        green: {
          DEFAULT: '#24B056',
          light: '#4FCB79',
          dark: '#1B8A42',
        },
        terracotta: {
          DEFAULT: '#081B31',
          light: '#1C3E63',
          dark: '#050F1B',
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
          'repeating-linear-gradient(115deg, rgba(36,176,86,0.07) 0px, rgba(36,176,86,0.07) 1px, transparent 1px, transparent 34px)',
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
