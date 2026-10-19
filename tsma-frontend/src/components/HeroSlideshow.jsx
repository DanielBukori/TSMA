import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionLink from './SectionLink.jsx'
import { useTranslation } from 'react-i18next'
import StatCounter from './StatCounter.jsx'
import { useBackgroundImages } from '../context/BackgroundImagesContext.jsx'

const SLIDE_DURATION = 6000 // ms

export default function HeroSlideshow() {
  const { t } = useTranslation()
  const { images } = useBackgroundImages()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length)
    }, SLIDE_DURATION)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <section className="relative overflow-hidden bg-navy-deep text-white">
      {/* Slideshow layer - picha halisi za TSMA (Admin -> Picha za Background) */}
      <div className="absolute inset-0">
        {images.length > 0 ? (
          images.map((img, index) => (
            <div
              key={img.id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${
                index === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${img.image})`,
                animation: index === activeIndex ? 'kenburns 6s ease-in-out forwards' : 'none',
              }}
              aria-hidden={index !== activeIndex}
            />
          ))
        ) : (
          // Hakuna picha bado (Admin hajapakia) - fallback ya rangi, haivunjiki
          <div className="absolute inset-0 bg-track-lines" />
        )}
        {/* Kivuli cha brown (kahawa) juu ya picha - chepesi juu (picha inabaki
            angavu), kizito chini ambapo maneno na vitufe viko. Ni matibabu ya
            picha tu, si rangi ya nne ya brand. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3B2314]/35 via-[#3B2314]/50 to-[#2A180C]/80" />
      </div>

      {/* Slide indicator dots */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((img, index) => (
            <button
              key={img.id}
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-8 bg-gold' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16 text-center">
        <span className="inline-block bg-gold-dark text-white text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6 animate-fade-in shadow-md">
          {t('hero.badge')}
        </span>

        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-white animate-slide-up [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]">
          {t('hero.titleLine1')}
          <br />
          <span className="text-white">{t('hero.titleLine2')}</span>
        </h1>

        {/* Mstari mfupi wa kijani chini ya headline (kijani kwenye kitu
            chenye rangi imara, si kama rangi ya maneno juu ya picha) */}
        <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-gold" />

        <p className="mt-6 text-white/95 text-base md:text-lg max-w-xl mx-auto [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] animate-slide-up [animation-delay:150ms] opacity-0 [animation-fill-mode:forwards]">
          {t('hero.lede')}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-slide-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
          <SectionLink
            section="conferences"
            className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md transition-colors"
          >
            {t('hero.ctaPrimary')} →
          </SectionLink>
          <Link
            to="/publications/submit-abstract"
            className="border border-white/70 hover:bg-white/10 text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors"
          >
            {t('hero.ctaSecondary')}
          </Link>
        </div>

        {/* Stat counters (count-up animation on scroll into view) */}
        <div className="mt-14 inline-flex flex-wrap justify-center gap-8 md:gap-16 bg-black/25 backdrop-blur-sm rounded-2xl px-6 md:px-10 py-6">
          <StatCounter numberClass="text-white" value={50} suffix="+" label={t('stats.members')} />
          <StatCounter numberClass="text-white" value={18} label={t('stats.regions')} />
          <StatCounter numberClass="text-white" value={2} prefix="TZS " suffix="M" label={t('stats.award')} />
          <StatCounter numberClass="text-white" value={2026} label={t('stats.nextConference')} noCount />
        </div>
      </div>

      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
      `}</style>
    </section>
  )
}
