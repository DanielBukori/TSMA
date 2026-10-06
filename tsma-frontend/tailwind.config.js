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
        // ACCENT KUU imerudi kuwa DHAHABU (kama mteja alivyoomba) — LAKINI
        // si ile hex ya awali (#D9922E, amber ya kawaida) iliyofanana na
        // ASMA. Hii ni "antique gold" — mwelekeo zaidi wa njano-bronze,
        // si machungwa-amber — bado inasomeka kama "gold" lakini si
        // nakala ya moja kwa moja. Kila kitu kinachotumia bg-gold/
        // text-gold (vitufe, badges, Navbar, InfoBox) kinapata hii
        // kiotomatiki, faili hili moja tu.
        gold: {
          DEFAULT: '#C9A227',
          light: '#DFC15C',
          dark: '#9C7D1C',
        },
        // Kijani kimerudi kuwa rangi yake halisi (halitegemei gold tena) -
        // kwa matumizi machache, ya makusudi: stripe ya rangi za bendera
        // kwenye Footer, na sehemu nyinginezo za "michezo ya taifa".
        green: {
          DEFAULT: '#1EA34D',
          light: '#3DBF6E',
          dark: '#157A3A',
        },
        // Terracotta pia imerudi kuwa rangi yake halisi (haielekezi navy
        // tena) - inatumika kidogo (tagline ya Navbar, n.k.)
        terracotta: {
          DEFAULT: '#C1541F',
          light: '#DA6E38',
          dark: '#9C4218',
        },
        cream: {
          DEFAULT: '#F2E6D5',
          dark: '#E8D4B9',
        },
        surface: '#FFF5E8',
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
          'repeating-linear-gradient(115deg, rgba(201,162,39,0.07) 0px, rgba(201,162,39,0.07) 1px, transparent 1px, transparent 34px)',
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
