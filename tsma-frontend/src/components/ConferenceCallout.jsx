import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNextConference } from '../context/NextConferenceContext.jsx'

function formatDateRange(start, end, language) {
  if (!start) return ''
  const locale = language?.startsWith('sw') ? 'sw-TZ' : 'en-GB'
  const format = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start)
}

/**
 * Banner ya mkutano unaofuata kwenye Home. Data yote inatoka
 * /api/conferences/ (status=upcoming); ikiwa hakuna mkutano uliochapishwa,
 * sehemu hii haionekani kabisa — hakuna tarehe au kichwa kilichoandikwa hapa.
 */
export default function ConferenceCallout() {
  const { t, i18n } = useTranslation()
  const { conference } = useNextConference()

  if (!conference) return null

  const registrationOpen = conference.is_registration_still_open === true
  const location = [conference.venue_name, conference.city, conference.country]
    .filter(Boolean)
    .join(', ')

  return (
    <section id="conference" className="bg-navy-deep bg-track-lines text-white py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
        <div className="text-gold font-extrabold text-xs tracking-widest mb-2">
          {t(registrationOpen ? 'conference.registrationOpen' : 'conference.upcoming')}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-4xl">{conference.title}</h2>
        {conference.theme && (
          <p className="text-gold/90 mt-3 max-w-2xl mx-auto">{conference.theme}</p>
        )}
        {conference.description && (
          <p className="text-white/75 mt-5 max-w-xl mx-auto leading-relaxed">
            {conference.description}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-8 mt-8 text-sm">
          <div>
            <div className="text-white/50 text-xs uppercase tracking-wide">
              {t('conference.date')}
            </div>
            <div className="font-serif font-bold text-gold text-lg mt-1">
              {formatDateRange(conference.start_date, conference.end_date, i18n.language)}
            </div>
          </div>
          {location && (
            <div>
              <div className="text-white/50 text-xs uppercase tracking-wide">
                {t('conference.location')}
              </div>
              <div className="font-serif font-bold text-gold text-lg mt-1">{location}</div>
            </div>
          )}
        </div>

        <Link
          to={`/conferences/${conference.slug}`}
          className="inline-block mt-9 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-9 py-4 rounded-md transition-colors"
        >
          {t(registrationOpen ? 'conference.register' : 'conference.viewDetails')} →
        </Link>
      </div>
    </section>
  )
}
