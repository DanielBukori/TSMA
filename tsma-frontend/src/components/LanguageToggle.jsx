import { useTranslation } from 'react-i18next'

/**
 * Kitufe cha kubadilisha lugha — KIDUMU kwenye nav, kinachoonekana kila
 * wakati (kama tulivyokubaliana). Kubadilisha lugha kunasasisha maandishi
 * YOTE kwenye tovuti mara moja (i18next), hivyo hakuna mchanganyiko wa
 * lugha kwenye ukurasa mmoja.
 */
export default function LanguageToggle({ variant = 'light' }) {
  const { i18n } = useTranslation()

  const isSw = i18n.language?.startsWith('sw')

  const setLang = (lang) => {
    i18n.changeLanguage(lang)
  }

  const base = 'inline-flex rounded-full p-0.5 gap-0.5'
  const wrapClass =
    variant === 'dark'
      ? `${base} bg-white/10 border border-white/20`
      : `${base} bg-cream border border-cream-dark`

  const btnBase =
    'font-sans font-extrabold text-[11px] tracking-wide px-3 py-1.5 rounded-full transition-colors'

  const activeClass =
    variant === 'dark' ? 'bg-white text-navy' : 'bg-navy text-white'
  const inactiveClass =
    variant === 'dark' ? 'text-white/70 hover:text-white' : 'text-navy/55 hover:text-navy'

  return (
    <div className={wrapClass} role="group" aria-label="Chagua Lugha / Choose Language">
      <button
        type="button"
        onClick={() => setLang('sw')}
        className={`${btnBase} ${isSw ? activeClass : inactiveClass}`}
      >
        KISWAHILI
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`${btnBase} ${!isSw ? activeClass : inactiveClass}`}
      >
        ENGLISH
      </button>
    </div>
  )
}
