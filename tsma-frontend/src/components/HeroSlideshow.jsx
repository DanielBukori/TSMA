import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBackgroundImages } from '../context/BackgroundImagesContext.jsx'
import apiClient from '../api/client.js'

const SLIDE_DURATION = 6000

function formatDateRange(start, end, language) {
  if (!start) return ''
  const locale = language?.startsWith('sw') ? 'sw-TZ' : 'en-GB'
  const format = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return end && end !== start ? `${format(start)} – ${format(end)}` : format(start)
}

export default function HeroSlideshow() {
  const { t, i18n } = useTranslation()
  const { images } = useBackgroundImages()
  const [activeIndex, setActiveIndex] = useState(0)
  const [conference, setConference] = useState(null)
  const isSw = i18n.language?.startsWith('sw')

  useEffect(() => {
    let cancelled = false
    async function loadConference() {
      try {
        const response = await apiClient.get('/conferences/', { params: { status: 'upcoming', _nocache: Date.now() } })
        const list = response.data?.results ?? response.data
        if (!Array.isArray(list) || !list.length) return
        const details = await Promise.all(list.map(async (item) => {
          if (!item?.slug) return null
          try {
            const result = await apiClient.get(`/conferences/${item.slug}/`, { params: { _nocache: Date.now() } })
            return result.data
          } catch { return null }
        }))
        const active = details
          .filter((item) => item?.is_registration_still_open === true && item?.slug)
          .sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')))[0] || null
        if (!cancelled) setConference(active)
      } catch {
        if (!cancelled) setConference(null)
      }
    }
    loadConference()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (images.length < 2 || conference?.banner_image) return
    const interval = setInterval(() => setActiveIndex((prev) => (prev + 1) % images.length), SLIDE_DURATION)
    return () => clearInterval(interval)
  }, [images.length, conference?.banner_image])

  const conferenceLocation = [conference?.venue_name, conference?.city, conference?.country].filter(Boolean).join(', ')
  const conferenceDate = conference ? formatDateRange(conference.start_date, conference.end_date, i18n.language) : ''

  return (
    <section className="relative overflow-hidden bg-navy-deep text-white">
      <div className="absolute inset-0">
        {conference?.banner_image ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${conference.banner_image})` }} aria-hidden="true" />
        ) : images.length > 0 ? (
          images.map((img, index) => (
            <div key={img.id} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${index === activeIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${img.image})`, animation: index === activeIndex ? 'kenburns 6s ease-in-out forwards' : 'none' }} aria-hidden={index !== activeIndex} />
          ))
        ) : <div className="absolute inset-0 bg-track-lines" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071827]/55 via-[#071827]/65 to-[#071827]/90" />
      </div>

      {!conference?.banner_image && images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((img, index) => <button key={img.id} aria-label={`Slide ${index + 1}`} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/40'}`} />)}
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16 text-center">
        <span className="inline-block bg-gold-dark text-white text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6 animate-fade-in shadow-md">
          {conference ? (isSw ? 'USAJILI WA CONFERENCE UMEFUNGULIWA' : 'CONFERENCE REGISTRATION OPEN') : t('hero.badge')}
        </span>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-white animate-slide-up [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
          {conference ? conference.title : <>{t('hero.titleLine1')}<br /><span className="text-white">{t('hero.titleLine2')}</span></>}
        </h1>
        <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-gold" />
        <p className="mt-6 text-white/95 text-base md:text-lg max-w-2xl mx-auto [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] animate-slide-up [animation-delay:150ms]">
          {conference ? (conference.theme || conference.description || (isSw ? 'Jiunge nasi kwa mkutano ujao wa TSMA.' : 'Join us for the next TSMA conference.')) : t('hero.lede')}
        </p>

        {conference && (conferenceDate || conferenceLocation) && (
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/90">
            {conferenceDate && <span><strong className="text-gold">{isSw ? 'Tarehe:' : 'Date:'}</strong> {conferenceDate}</span>}
            {conferenceLocation && <span><strong className="text-gold">{isSw ? 'Mahali:' : 'Location:'}</strong> {conferenceLocation}</span>}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-slide-up [animation-delay:300ms]">
          {conference ? (
            <Link to={`/conferences/${conference.slug}`} className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md transition-colors">
              {isSw ? 'Angalia Conference na Jisajili' : 'View Conference & Register'} →
            </Link>
          ) : (
            <a href="#conferences" className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md transition-colors">{isSw ? 'Tazama Conferences' : 'Explore Conferences'} →</a>
          )}
          <a href="#about" className="border border-white/70 hover:bg-white/10 text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors">{isSw ? 'Kuhusu TSMA' : 'About TSMA'}</a>
        </div>
      </div>
      <style>{`@keyframes kenburns { 0% { transform: scale(1); } 100% { transform: scale(1.08); } }`}</style>
    </section>
  )
}
