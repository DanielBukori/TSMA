import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function News() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [state, setState] = useState('loading')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    apiClient
      .get('/news/categories/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (Array.isArray(results)) setCategories(results)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (query) params.q = query
    if (category) params.category = category

    setState('loading')
    apiClient
      .get('/news/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setPosts(Array.isArray(results) ? results : [])
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [query, category])

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="news"
          isSw={isSw}
          fallback={{
            badge_sw: 'HABARI', badge_en: 'NEWS',
            title_sw: 'Habari na Matukio', title_en: 'News & Updates',
          }}
        />
      </PageBanner>

      <section className="max-w-2xl mx-auto px-5 md:px-8 -mt-6 relative z-10">
        <div className="bg-white border border-black/10 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isSw ? 'Tafuta habari...' : 'Search news...'}
            className="flex-1 border border-black/15 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-black/15 rounded-md px-4 py-2.5 text-sm"
          >
            <option value="">{isSw ? 'Kategoria Zote' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ============ FEED ============ */}
      <section className="max-w-2xl mx-auto px-5 md:px-8 py-12 space-y-6">
        {state === 'loading' && (
          <LoadingState count={4} className="space-y-6" itemClassName="h-44 rounded-xl bg-black/[.06]" />
        )}

        {state === 'error' && (
          <EmptyState
            isSw={isSw}
            sw="Hakuna habari za kuonyesha kwa sasa."
            en="No news to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
            tone="error"
          />
        )}

        {state === 'ready' && posts.length === 0 && (query || category) && (
          <EmptyState
            isSw={isSw}
            sw="Hakuna habari za kuonyesha kwa utafutaji huo."
            en="No results for this search."
            hintSw="Jaribu neno jingine au ondoa kategoria iliyochaguliwa."
            hintEn="Try a different word or clear the selected category."
          />
        )}

        {state === 'ready' && posts.length === 0 && !query && !category && (
          <EmptyState
            isSw={isSw}
            sw="TSMA bado haijachapisha habari."
            en="TSMA has not published any news yet."
            hintSw="Habari na matangazo huongezwa na mhariri wa tovuti."
            hintEn="News and announcements are added by the site editor."
          />
        )}

        {state === 'ready' && posts.length > 0 && posts.map((post) => <PostCard key={post.id} post={post} isSw={isSw} />)}
      </section>
    </>
  )
}

function PostCard({ post, isSw }) {
  return (
    <article data-reveal className="bg-white border border-black/10 rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      {/* Header: kama post ya Instagram/YouTube — mwandishi + tarehe */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy to-green flex items-center justify-center text-white font-serif font-bold text-xs shrink-0">
          T
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-navy truncate">{post.author_name || 'TSMA'}</div>
          <div className="text-[11px] text-ink-muted">
            {new Date(post.published_at).toLocaleDateString(undefined, {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </div>
        </div>
        {post.category?.name && (
          <span className="bg-cream text-terracotta text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
            {post.category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.title && (
          <h2 className="font-serif font-bold text-navy text-base mb-1.5">{post.title}</h2>
        )}
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* Images (carousel kama post ina picha kadhaa) */}
      {post.images?.length > 0 && <ImageCarousel images={post.images} />}
    </article>
  )
}

function ImageCarousel({ images }) {
  const safeImages = (Array.isArray(images) ? images : []).filter((item) => item?.image)
  const [index, setIndex] = useState(0)
  const hasMultiple = safeImages.length > 1

  useEffect(() => {
    setIndex(0)
  }, [safeImages.length])

  useEffect(() => {
    if (!hasMultiple) return undefined
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % safeImages.length), 5000)
    return () => window.clearInterval(timer)
  }, [hasMultiple, safeImages.length])

  if (!safeImages.length) return null
  const activeIndex = index % safeImages.length

  return (
    <div className="relative bg-black">
      <div className="aspect-square overflow-hidden">
        <img
          src={safeImages[activeIndex].image}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      {hasMultiple && (
        <>
          <button
            onClick={() => setIndex((i) => (i === 0 ? safeImages.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => (i === safeImages.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'w-5 bg-gold' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
          <span className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {activeIndex + 1}/{safeImages.length}
          </span>
        </>
      )}
    </div>
  )
}
