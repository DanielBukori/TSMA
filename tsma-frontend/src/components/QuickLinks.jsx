import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SINGLE_PAGE } from '../config/layout.js'

const LINK_CONFIG = [
  { key: 'about', to: '/about', accent: 'bg-navy' },
  { key: 'membership', to: '/members', accent: 'bg-green' },
  { key: 'conferences', to: '/conferences', accent: 'bg-terracotta' },
  { key: 'publications', to: '/publications', accent: 'bg-gold' },
]

export default function QuickLinks() {
  const { t } = useTranslation()

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
      <div className="text-center mb-12">
        <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
          {t('quickLinks.eyebrow')}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
          {t('quickLinks.title')}
        </h2>
        <div className="lane-divider mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {LINK_CONFIG.map(({ key, to, accent }) => (
          <Link
            key={key}
            to={SINGLE_PAGE ? `/#${key === 'membership' ? 'members' : key}` : to}
            className="group border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className={`h-1.5 ${accent}`} />
            <div className="p-6">
              <h3 className="font-serif font-bold text-lg text-navy mb-1.5 group-hover:text-terracotta transition-colors">
                {t(`quickLinks.${key}.title`)}
              </h3>
              <p className="text-sm text-ink-muted">{t(`quickLinks.${key}.desc`)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
