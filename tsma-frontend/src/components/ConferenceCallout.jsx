import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

function formatDateRange(start, end, language) {
  if (!start) return ''
  const locale = language?.startsWith('sw') ? 'sw-TZ' : 'en-GB'
  const format = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start)
}

export default function ConferenceCallout() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [conference, setConference] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadOpenConference() {
      try {
        const response = await apiClient.get('/conferences/', {
          params: { status: 'upcoming', _nocache: Date.now() },
        })
        const data = response.data?.results ?? response.data
        if (!Array.isArray(data) || !data.length) {
          if (!cancelled) setConference(null)
          return
        }

        // List endpoint does not expose the live registration flag, so verify each
        // candidate against its detail endpoint before showing it on the homepage.
        const details = await Promise.all(data.map(async (item) => {
          try {
            const detailResponse = await apiClient.get(`/conferences/${item.slug}/`, {
              params: { _nocache: Date.now() },
            })
            return detailResponse.data
          } catch {
            return null
          }
        }))
        const openConference = details
          .filter((item) => item?.is_registration_still_open === true && item?.slug)
          .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0] || null

        if (!cancelled) setConference(openConference)
      } catch {
        if (!cancelled) setConference(null)
      }
    }

    loadOpenConference()
    return () => { cancelled = true }
  }, [])

  // Do not display stale, hard-coded dates or a closed/past conference.
  if (!conference) return null

  const location = [conference.venue_name, conference.city, conference.country]
    .filter(Boolean)
    .join(', ')

  return (
    <section id="conference" className="bg-navy-deep bg-track-lines text-white py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
        <div className="text-gold font-extrabold text-xs tracking-widest mb-2">
          {isSw ? 'USAJILI UMEFUNGULIWA' : 'REGISTRATION OPEN'}
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
              {isSw ? 'Tarehe' : 'Date'}
            </div>
            <div className="font-serif font-bold text-gold text-lg mt-1">
              {formatDateRange(conference.start_date, conference.end_date, i18n.language)}
            </div>
          </div>
          {location && (
            <div>
              <div className="text-white/50 text-xs uppercase tracking-wide">
                {isSw ? 'Mahali' : 'Location'}
              </div>
              <div className="font-serif font-bold text-gold text-lg mt-1">{location}</div>
            </div>
          )}
        </div>

        <Link
          to={`/conferences/${conference.slug}`}
          className="inline-block mt-9 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-9 py-4 rounded-md transition-colors"
        >
          {isSw ? 'Jisajili Sasa' : (t('conference.cta') || 'Register Now')} →
        </Link>
      </div>
    </section>
  )
}
