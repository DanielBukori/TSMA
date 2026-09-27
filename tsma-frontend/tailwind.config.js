/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // RANGI KUU #1 — msingi (backgrounds za giza, navbar, maandishi mazito)
        navy: {
          DEFAULT: '#0E2A4A',
          deep: '#081B31',
          light: '#1C3E63',
        },
        // RANGI KUU #2 — ACCENT PEKEE (vitufe, badges, highlights, stat
        // numbers). Kijani cha TFF/bendera ya Tanzania — tofauti kabisa
        // na navy+gold ya ASMA. "gold" na "green" (majina ya token
        // yaliyokuwepo kwenye component nyingi tayari — Navbar,
        // PageBanner, InfoBox, vitufe) zote mbili sasa zinaelekeza rangi
        // HII HII moja — hivyo hazionekani kama rangi mbili tofauti
        // popote kwenye tovuti, bila kuhitaji kugusa faili za component.
        gold: {
          DEFAULT: '#1EA34D',
          light: '#3DBF6E',
          dark: '#157A3A',
        },
        green: {
          DEFAULT: '#1EA34D',
          light: '#3DBF6E',
          dark: '#157A3A',
        },
        // "terracotta" pia ilikuwa ikitumika mahali pachache (mfano
        // tagline ndogo ya Navbar) — kuiacha ingeleta rangi ya 4.
        // Sasa inaelekeza navy-deep badala yake (bado ina utofauti wa
        // giza dhidi ya background nyeupe, lakini si hue mpya).
        terracotta: {
          DEFAULT: '#081B31',
          light: '#1C3E63',
          dark: '#050F1B',
        },
        // RANGI KUU #3 — neutral nyepesi (background za page, cards)
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
          'repeating-linear-gradient(115deg, rgba(30,163,77,0.07) 0px, rgba(30,163,77,0.07) 1px, transparent 1px, transparent 34px)',
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
