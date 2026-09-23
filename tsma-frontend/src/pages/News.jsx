import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const FALLBACK_POSTS = [
  {
    id: 1,
    title: '',
    content: 'TSMA imeshiriki mkutano wa kimataifa wa usimamizi wa michezo wiki hii — asante kwa kila aliyehudhuria!',
    images: [],
    author_name: 'TSMA Team',
    published_at: '2026-09-01T10:00:00Z',
    views_count: 214,
    category: { name: 'Matukio' },
  },
  {
    id: 2,
    title: 'Usajili wa Mkutano wa 2026',
    content: 'Usajili wa mkutano mkuu wa mwaka huu sasa umefunguliwa rasmi kwa wanachama wote. Nafasi ni chache — jiunge leo!',
    images: [],
    author_name: 'TSMA Team',
    published_at: '2026-08-28T09:00:00Z',
    views_count: 512,
    category: { name: 'Matangazo' },
  },
]

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Matukio', slug: 'matukio' },
  { id: 2, name: 'Matangazo', slug: 'matangazo' },
]

export default function News() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [posts, setPosts] = useState(FALLBACK_POSTS)
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    apiClient
      .get('/news/categories/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (Array.isArray(results) && results.length > 0) setCategories(results)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (query) params.q = query
    if (category) params.category = category

    apiClient
      .get('/news/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results)) setPosts(results)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [query, category])

  return (
    <>
      <section className="bg-navy-deep bg-track-lines text-white text-center py-14 md:py-16">
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-5">
          {isSw ? 'HABARI' : 'NEWS'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Habari na Matukio' : 'News & Updates'}
        </h1>
      </section>

      <section className="max-w-2xl mx-auto px-5 md:px-8 -mt-6 relative z-10">
        <div className="bg-white border border-black/10 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isSw ? '🔍 Tafuta habari...' : '🔍 Search news...'}
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
        {posts.length === 0 ? (
          <p className="text-center text-ink-muted text-sm py-12">
            {isSw ? 'Hakuna habari zilizopatikana.' : 'No news found.'}
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} isSw={isSw} />)
        )}
      </section>
    </>
  )
}

function PostCard({ post, isSw }) {
  return (
    <article className="bg-white border border-black/10 rounded-xl overflow-hidden">
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

      {/* Footer: views */}
      <div className="px-4 py-3 border-t border-black/5 flex items-center gap-4 text-[11px] text-ink-muted">
        <span>👁 {post.views_count?.toLocaleString() || 0} {isSw ? 'walioona' : 'views'}</span>
      </div>
    </article>
  )
}

function ImageCarousel({ images }) {
  const [index, setIndex] = useState(0)
  const hasMultiple = images.length > 1

  return (
    <div className="relative bg-black">
      <div className="aspect-square overflow-hidden">
        <img
          src={images[index].image}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {hasMultiple && (
        <>
          <button
            onClick={() => setIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center text-sm"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-gold' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
          <span className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  )
}
