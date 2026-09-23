import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function AboutSummary() {
  const { t } = useTranslation()

  return (
    <section id="about" className="bg-cream py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
          {t('about.eyebrow')}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
          {t('about.title')}
        </h2>
        <div className="lane-divider mx-auto my-5" />
        <p className="text-ink leading-relaxed">{t('about.p1')}</p>
        <p className="text-ink leading-relaxed mt-4">{t('about.p2')}</p>

        <Link
          to="/about"
          className="inline-block mt-8 border-b-2 border-terracotta text-navy font-bold text-sm pb-1 hover:text-terracotta transition-colors"
        >
          {t('about.cta')} →
        </Link>
      </div>
    </section>
  )
}
