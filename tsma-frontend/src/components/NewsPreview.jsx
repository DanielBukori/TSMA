import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

// Placeholder inayoonekana kabla ya API kujibu, au endapo backend
// haijaunganishwa bado wakati wa maendeleo ya frontend pekee.
const FALLBACK_NEWS = [
  { id: 1, title: null, content: 'TSMA imeshiriki mkutano wa kimataifa wa usimamizi wa michezo.', images: [] },
  { id: 2, title: null, content: 'Usajili wa mkutano wa 2026 sasa umefunguliwa kwa wanachama wote.', images: [] },
  { id: 3, title: null, content: 'Tunapokea maombi ya uwasilishaji wa tafiti kwa mwaka huu.', images: [] },
]

export default function NewsPreview() {
  const { t } = useTranslation()
  const [items, setItems] = useState(FALLBACK_NEWS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    apiClient
      .get('/news/', { params: { limit: 3 } })
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) {
          setItems(results.slice(0, 3))
        }
      })
      .catch(() => {
        // Backend haipatikani (au bado haijaunganishwa) — tunabaki na fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="news" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
        <div>
          <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
            {t('news.eyebrow')}
          </div>
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
            {t('news.title')}
          </h2>
        </div>
        <Link
          to="/news"
          className="text-sm font-bold text-navy border-b-2 border-gold pb-0.5 self-start sm:self-auto"
        >
          {t('news.viewAll')} →
        </Link>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${loading ? 'opacity-60' : ''}`}>
        {items.map((item, idx) => (
          <article
            key={item.id}
            className="border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div
              className={`h-40 bg-gradient-to-br ${
                ['from-navy to-green-dark', 'from-terracotta to-navy', 'from-gold to-terracotta-dark'][idx % 3]
              }`}
              style={
                item.images?.[0]?.image
                  ? { backgroundImage: `url(${item.images[0].image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : undefined
              }
            />
            <div className="p-5">
              {item.title && (
                <h3 className="font-serif font-bold text-lg text-navy mb-2">{item.title}</h3>
              )}
              <p className="text-sm text-ink-muted line-clamp-3">{item.content}</p>
              <span className="inline-block mt-3 text-xs font-bold text-terracotta">
                {t('news.readMore')} →
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
