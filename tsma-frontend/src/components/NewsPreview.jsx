import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import EmptyState from './EmptyState.jsx'
import LoadingState from './LoadingState.jsx'

export default function NewsPreview() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false

    setState('loading')
    apiClient
      .get('/news/', { params: { limit: 3 } })
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setItems(Array.isArray(results) ? results.slice(0, 3) : [])
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
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

      {state === 'error' && (
        <EmptyState
          isSw={isSw}
          tone="error"
          sw="Hakuna habari za kuonyesha kwa sasa."
          en="No news to show right now."
          hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
          hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
        />
      )}

      {state === 'ready' && items.length === 0 && (
        <EmptyState
          isSw={isSw}
          sw="TSMA bado haijaweka habari."
          en="TSMA has not published any news yet."
          hintSw="Habari mpya za TSMA huongezwa na mhariri wa tovuti."
          hintEn="News updates are added by the site editor."
        />
      )}

      {state === 'ready' && items.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      )}
    </section>
  )
}
