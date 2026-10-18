import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import ConferenceMemories from '../components/ConferenceMemories.jsx'

const FALLBACK = {
  upcoming: [
    {
      id: 1,
      slug: 'tsma-conference-2026',
      title: 'TSMA Flagship Conference 2026',
      venue_name: 'Julius Nyerere International Convention Centre',
      city: 'Dar es Salaam',
      country: 'Tanzania',
      start_date: '2026-11-12',
      end_date: '2026-11-13',
      theme: 'Building a Self-Financing Sports Economy',
      description:
        'Mkutano mkuu wa mwaka wa TSMA — wataalamu, wanachama, wadhamini na wawekezaji wa sekta ya michezo kutoka kote nchini.',
    },
  ],
  past: [
    {
      id: 2,
      slug: 'tsma-conference-2025',
      title: 'TSMA National Symposium 2025',
      venue_name: 'Mlimani City Conference Centre',
      city: 'Dar es Salaam',
      start_date: '2025-10-05',
      end_date: '2025-10-06',
    },
  ],
}

export default function Conferences() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [upcoming, setUpcoming] = useState(FALLBACK.upcoming)
  const [past, setPast] = useState(FALLBACK.past)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      apiClient.get('/conferences/', { params: { status: 'upcoming' } }),
      apiClient.get('/conferences/', { params: { status: 'past' } }),
    ]).then(([upRes, pastRes]) => {
      if (cancelled) return
      if (upRes.status === 'fulfilled') {
        const results = upRes.value.data?.results || upRes.value.data
        if (Array.isArray(results) && results.length > 0) setUpcoming(results)
      }
      if (pastRes.status === 'fulfilled') {
        const results = pastRes.value.data?.results || pastRes.value.data
        if (Array.isArray(results)) setPast(results)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const featured = upcoming[0]
  const otherUpcoming = upcoming.slice(1)

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="conferences"
          isSw={isSw}
          fallback={{
            badge_sw: 'MIKUTANO', badge_en: 'CONFERENCES',
            title_sw: 'Mikutano ya TSMA', title_en: 'TSMA Conferences',
          }}
        />
      </PageBanner>

      <ConferenceMemories />

      {/* ============ FEATURED: mkutano wa mwaka huu, JUU SANA ============ */}
      {featured && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 -mt-8 relative z-10">
          <Link
            to={`/conferences/${featured.slug}`}
            className="block bg-surface rounded-2xl shadow-2xl overflow-hidden border border-black/5 hover:shadow-[0_30px_60px_-20px_rgba(14,42,74,0.4)] transition-shadow"
          >
            <div className="bg-gradient-to-br from-navy-deep via-navy to-green-dark text-white p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-track-lines opacity-40" />
              <div className="relative z-10">
                <span className="inline-block bg-gold text-navy-deep text-[11px] font-extrabold px-3 py-1.5 rounded-full mb-4 animate-fade-in">
                  ⭐ {isSw ? 'MKUTANO WA MWAKA HUU' : "THIS YEAR'S FLAGSHIP"}
                </span>
                <h2 className="font-serif font-bold text-2xl md:text-4xl leading-tight max-w-2xl">
                  {featured.title}
                </h2>
                {featured.theme && (
                  <p className="text-gold text-sm md:text-base mt-2 italic">"{featured.theme}"</p>
                )}
                <p className="text-white/75 text-sm md:text-base mt-4 max-w-xl">
                  {featured.description}
                </p>

                <div className="flex flex-wrap gap-6 mt-7 text-sm">
                  <div>
                    <div className="text-white/50 text-[11px] uppercase tracking-wide">
                      {isSw ? 'Tarehe' : 'Date'}
                    </div>
                    <div className="font-serif font-bold text-gold text-base mt-1">
                      {formatRange(featured.start_date, featured.end_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50 text-[11px] uppercase tracking-wide">
                      {isSw ? 'Eneo' : 'Location'}
                    </div>
                    <div className="font-serif font-bold text-gold text-base mt-1">
                      {featured.venue_name}, {featured.city}
                    </div>
                  </div>
                </div>

                <div className="inline-block mt-8 bg-gold text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md">
                  {isSw ? 'Angalia Ajenda na Jisajili →' : 'View Agenda & Register →'}
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ============ OTHER UPCOMING ============ */}
      {otherUpcoming.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 py-14">
          <h2 className="font-serif font-bold text-xl text-navy mb-6">
            {isSw ? 'Mikutano Mingine Ijayo' : 'Other Upcoming Conferences'}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {otherUpcoming.map((c) => (
              <ConferenceCard key={c.id} conference={c} isSw={isSw} />
            ))}
          </div>
        </section>
      )}

      {/* ============ PAST CONFERENCES ============ */}
      <section className="bg-cream py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <h2 className="font-serif font-bold text-xl text-navy mb-6">
            {isSw ? 'Historia ya Mikutano' : 'Conference History'}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {past.map((c) => (
              <ConferenceCard key={c.id} conference={c} isSw={isSw} isPast />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function ConferenceCard({ conference, isSw, isPast }) {
  return (
    <Link
      to={`/conferences/${conference.slug}`}
      className="block bg-surface border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div
        className={`h-32 bg-gradient-to-br ${
          isPast ? 'from-ink-muted to-navy' : 'from-navy to-green-dark'
        }`}
      />
      <div className="p-5">
        <h3 className="font-serif font-bold text-navy text-base">{conference.title}</h3>
        <p className="text-xs text-ink-muted mt-1.5">
          {conference.venue_name}, {conference.city}
        </p>
        <p className="text-xs font-bold text-terracotta mt-2">
          {formatRange(conference.start_date, conference.end_date)}
        </p>
        {isPast && (
          <span className="inline-block mt-3 bg-black/5 text-ink-muted text-[10px] font-bold px-2.5 py-1 rounded-full">
            {isSw ? 'IMEPITA' : 'PAST'}
          </span>
        )}
      </div>
    </Link>
  )
}

function formatRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString(undefined, opts)}`
}
