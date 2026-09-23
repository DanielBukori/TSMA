import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ConferenceCallout() {
  const { t } = useTranslation()

  return (
    <section id="conference" className="bg-navy-deep bg-track-lines text-white py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
        <div className="text-gold font-extrabold text-xs tracking-widest mb-2">
          {t('conference.eyebrow')}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-4xl">{t('conference.title')}</h2>
        <p className="text-white/75 mt-5 max-w-xl mx-auto leading-relaxed">
          {t('conference.desc')}
        </p>

        <div className="flex flex-wrap justify-center gap-8 mt-8 text-sm">
          <div>
            <div className="text-white/50 text-xs uppercase tracking-wide">
              {t('conference.date')}
            </div>
            <div className="font-serif font-bold text-gold text-lg mt-1">12-13 Nov 2026</div>
          </div>
          <div>
            <div className="text-white/50 text-xs uppercase tracking-wide">
              {t('conference.location')}
            </div>
            <div className="font-serif font-bold text-gold text-lg mt-1">Dar es Salaam</div>
          </div>
        </div>

        <Link
          to="/conferences"
          className="inline-block mt-9 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-9 py-4 rounded-md transition-colors"
        >
          {t('conference.cta')} →
        </Link>
      </div>
    </section>
  )
}
