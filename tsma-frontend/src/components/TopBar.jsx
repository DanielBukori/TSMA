import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNextConference } from '../context/NextConferenceContext.jsx'

function formatRange(start, end, locale) {
  const s = new Date(start)
  if (Number.isNaN(s.getTime())) return ''
  const e = end ? new Date(end) : null
  const month = (d) => d.toLocaleDateString(locale, { month: 'long' })

  if (!e || Number.isNaN(e.getTime()) || e.getTime() === s.getTime()) {
    return `${s.getDate()} ${month(s)} ${s.getFullYear()}`
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${month(s)} ${s.getFullYear()}`
  }
  return `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`
}

/**
 * Bendi ya juu: mkutano ujao wa karibuni (NextConferenceContext). Hakuna
 * mkutano = bendi haionekani; tarehe hazija mahali pengine.
 */
export default function TopBar() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { conference } = useNextConference()

  if (!conference) return null

  const locale = isSw ? 'sw-TZ' : 'en-GB'
  const when = formatRange(conference.start_date, conference.end_date, locale)
  const where = [conference.city].filter(Boolean).join(', ')
  const registrationOpen = conference.is_registration_still_open === true

  return (
    <div className="bg-navy text-white text-center text-[13px] font-bold py-2.5 px-4">
      {conference.title}
      {where && ` — ${where}`}
      {when && `, ${when}`}
      <Link
        to={`/conferences/${conference.slug}`}
        className="inline-block ml-3 bg-gold-dark hover:bg-gold text-white text-xs font-extrabold px-3 py-1 rounded-full transition-colors"
      >
        {t(registrationOpen ? 'topbar.eventCta' : 'topbar.eventDetails')} →
      </Link>
    </div>
  )
}
