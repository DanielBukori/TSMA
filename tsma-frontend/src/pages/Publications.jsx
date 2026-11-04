import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function Publications() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [publications, setPublications] = useState([])
  const [categories, setCategories] = useState([])
  const [state, setState] = useState('loading')
  const [categoryState, setCategoryState] = useState('loading')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [year, setYear] = useState('')
  const [accessType, setAccessType] = useState('')

  useEffect(() => {
    let cancelled = false
    setCategoryState('loading')
    apiClient
      .get('/publications/categories/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setCategories(Array.isArray(results) ? results : [])
        setCategoryState('ready')
      })
      .catch(() => {
        if (!cancelled) setCategoryState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (query) params.q = query
    if (category) params.category = category
    if (year) params.year = year
    if (accessType) params.access_type = accessType

    setState('loading')
    apiClient
      .get('/publications/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setPublications(Array.isArray(results) ? results : [])
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [query, category, year, accessType])

  const hasFilters = Boolean(query || category || year || accessType)

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="publications"
          isSw={isSw}
          fallback={{
            badge_sw: 'MAKTABA', badge_en: 'LIBRARY',
            title_sw: 'Machapisho ya Kitaaluma', title_en: 'Academic Publications',
            subtitle_sw: 'Bure, za wanachama, au za kununua — tafiti na ripoti za sekta ya michezo.',
            subtitle_en: 'Free, member-only, or purchasable — research and reports from the sports sector.',
            cta_text_sw: 'Wasilisha Utafiti →', cta_text_en: 'Submit Research →',
            cta_url: '/publications/submit-abstract',
          }}
        />
      </PageBanner>

      {/* ============ SEARCH & FILTERS ============ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 -mt-6 relative z-10">
        <div className="bg-surface border border-black/10 rounded-xl shadow-lg p-4 md:p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isSw ? 'Tafuta...' : 'Search...'}
            className="md:col-span-2 border border-black/15 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-black/15 rounded-md px-4 py-2.5 text-sm">
            <option value="">{isSw ? 'Kategoria Zote' : 'All Categories'}</option>
            {categoryState === 'error' && (
              <option disabled value="_unavailable">
                {isSw ? 'Kategoria hazipatikani sasa' : 'Categories unavailable right now'}
              </option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="border border-black/15 rounded-md px-4 py-2.5 text-sm">
            <option value="">{isSw ? 'Miaka Yote' : 'All Years'}</option>
            {[2026, 2025, 2024, 2023].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={accessType} onChange={(e) => setAccessType(e.target.value)} className="border border-black/15 rounded-md px-4 py-2.5 text-sm">
            <option value="">{isSw ? 'Aina Zote' : 'All Types'}</option>
            <option value="free">{isSw ? 'Bure' : 'Free'}</option>
            <option value="member_only">{isSw ? 'Wanachama' : 'Members'}</option>
            <option value="paid">{isSw ? 'Kununua' : 'Paid'}</option>
          </select>
        </div>
      </section>

      {/* ============ GRID ============ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        {state === 'loading' && (
          <LoadingState className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" itemClassName="h-56 rounded-xl bg-black/[.06]" />
        )}

        {state === 'error' && (
          <EmptyState
            isSw={isSw}
            tone="error"
            sw="Hakuna machapisho ya kuonyesha kwa sasa."
            en="No publications to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
          />
        )}

        {state === 'ready' && publications.length === 0 && (
          <EmptyState
            isSw={isSw}
            sw={hasFilters ? 'Hakuna machapisho yanayolingana na utafutaji wako.' : 'TSMA bado haijawechapisha kitu.'}
            en={hasFilters ? 'No publications match your search.' : 'TSMA has not published anything yet.'}
            hintSw={hasFilters ? 'Jaribu kupunguza vichujio au kutafuta neno lingine.' : 'Machapisho mapya huongezwa na mhariri wa tovuti.'}
            hintEn={hasFilters ? 'Try removing some filters or searching for a different term.' : 'New publications are added by the site editor.'}
          />
        )}

        {state === 'ready' && publications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {publications.map((pub) => (
              <PublicationCard key={pub.id} pub={pub} isSw={isSw} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function AccessBadge({ pub, isSw }) {
  if (pub.access_type === 'paid') {
    return (
      <span className="absolute top-2 right-2 bg-gold text-navy-deep text-[9px] font-extrabold px-2 py-1 rounded">
        {Number(pub.price).toLocaleString()} {pub.currency}
      </span>
    )
  }
  if (pub.access_type === 'member_only') {
    return (
      <span className="absolute top-2 right-2 bg-terracotta text-white text-[9px] font-extrabold px-2 py-1 rounded">
        {isSw ? 'WANACHAMA' : 'MEMBERS'}
      </span>
    )
  }
  return (
    <span className="absolute top-2 right-2 bg-green text-white text-[9px] font-extrabold px-2 py-1 rounded">
      {isSw ? 'BURE' : 'FREE'}
    </span>
  )
}

function PublicationCard({ pub, isSw }) {
  return (
    <Link
      to={`/publications/${pub.slug}`}
      className="group block rounded-xl overflow-hidden border border-black/10 hover:shadow-xl transition-shadow bg-surface"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-navy to-green-dark relative overflow-hidden">
        {pub.cover_image ? (
          <img
            src={pub.cover_image}
            alt={pub.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 text-center">
            <span className="text-white/90 font-serif font-bold text-sm leading-snug line-clamp-4">
              {pub.title}
            </span>
          </div>
        )}
        {pub.category?.name && (
          <span className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-[9px] font-bold px-2 py-1 rounded">
            {pub.category.name}
          </span>
        )}
        <AccessBadge pub={pub} isSw={isSw} />
      </div>
      <div className="p-3.5">
        <h3 className="font-serif font-bold text-navy text-sm leading-tight line-clamp-2">
          {pub.title}
        </h3>
        <p className="text-[11px] text-ink-muted mt-1.5">{pub.authors}</p>
        <p className="text-[11px] font-bold text-terracotta mt-1">{pub.publication_year}</p>
      </div>
    </Link>
  )
}
