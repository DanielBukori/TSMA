import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { useNextConference } from '../context/NextConferenceContext.jsx'

const SESSION_KEY = 'tsma_conf_promo_dismissed'
const SHOW_DELAY_MS = 3500

/**
 * Popup ya mkutano ujao — inaonekana kwenye kurasa zote (Layout.jsx) mara
 * moja tu kwa session. Maandishi yote yanatoka kwenye rekodi ya mkutano;
 * hali ya usajili hutokana na API, si dhana yetu.
 */
export default function ConferencePromoModal() {
  const { t, i18n } = useTranslation()
  const { conference } = useNextConference()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!conference || sessionStorage.getItem(SESSION_KEY)) return undefined
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [conference])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(SESSION_KEY, '1')
  }

  if (!conference || !visible) return null

  const registrationOpen = conference.is_registration_still_open === true
  const locale = i18n.language?.startsWith('sw') ? 'sw-TZ' : 'en-GB'
  const when = new Date(`${conference.start_date}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const where = [conference.venue_name, conference.city].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-5" onClick={dismiss}>
      <div
        className="relative bg-surface rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label={t('common.close')}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface/95 flex items-center justify-center text-navy text-sm"
        >
          <Icon name="close" className="w-5 h-5" />
        </button>

        <div className="bg-navy-deep bg-track-lines text-white text-center py-8 px-6">
          <span className="inline-block bg-gold text-navy-deep text-[10px] font-extrabold px-3 py-1.5 rounded-full mb-3">
            {t(registrationOpen ? 'conference.registrationOpen' : 'conference.upcoming')}
          </span>
          <h3 className="font-serif font-bold text-xl leading-tight">{conference.title}</h3>
          <p className="text-white/70 text-xs mt-2">
            {[where, when].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="p-6 text-center">
          <p className="text-sm text-ink-muted mb-5">
            {t(registrationOpen ? 'promo.registerBlurb' : 'promo.detailsBlurb')}
          </p>
          <Link
            to={`/conferences/${conference.slug}`}
            onClick={dismiss}
            className="block bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors"
          >
            {t(registrationOpen ? 'conference.register' : 'conference.viewDetails')} →
          </Link>
          <button
            onClick={dismiss}
            className="mt-3 text-xs text-ink-muted hover:text-ink font-semibold"
          >
            {t('promo.later')}
          </button>
        </div>
      </div>
    </div>
  )
}
