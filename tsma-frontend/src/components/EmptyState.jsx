import Icon from './Icon.jsx'

/**
 * Hali halisi ya "hakuna data" — siyo data ya kujanga.
 *
 * Ukurasa unaorudisha orodha tupu (au API imeshindwa) unaonyesha ujumbe
 * mfupi wa kweli badala ya rekodi zilizoundwa: mtumiaji anajua tofauti
 * kati ya "TSMA bado haijaweka kitu" na "muunganisho umeshindwa".
 */
export default function EmptyState({ isSw, sw, en, hintSw, hintEn, tone = 'empty', className = '' }) {
  const isError = tone === 'error'
  const title = isSw ? sw : en
  const hint = isSw ? hintSw : hintEn

  return (
    <div
      className={`border border-dashed ${
        isError ? 'border-terracotta/50 bg-terracotta/5 text-terracotta-dark' : 'border-navy/25 bg-white/60 text-navy'
      } rounded-xl px-6 py-10 text-center ${className}`}
      role="status"
    >
      <Icon name={isError ? 'alert' : 'image'} className="w-6 h-6 mb-3 opacity-70" />
      <p className="font-serif font-bold text-base md:text-lg">{title}</p>
      {hint && <p className="text-sm text-ink/70 mt-2 max-w-prose mx-auto">{hint}</p>}
    </div>
  )
}
