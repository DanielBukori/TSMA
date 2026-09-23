import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const FALLBACK_PUBLICATIONS = [
  { id: 1, slug: 'sports-economy-tz-2026', title: "The State of Tanzania's Sports Economy 2026", authors: 'Dkt. Amina Massawe', publication_year: 2026, category: { name: 'Uchumi wa Michezo' }, access_type: 'free', price: null, currency: 'TZS', cover_image: null },
  { id: 2, slug: 'youth-leadership-sports', title: 'Youth Leadership in Sports Management', authors: 'James Mwakalinga', publication_year: 2025, category: { name: 'Uongozi wa Michezo' }, access_type: 'member_only', price: null, currency: 'TZS', cover_image: null },
  { id: 3, slug: 'sports-marketing-playbook', title: 'The Sports Marketing Playbook', authors: 'Grace Kileo', publication_year: 2025, category: { name: 'Uchumi wa Michezo' }, access_type: 'paid', price: '25000', currency: 'TZS', cover_image: null },
]

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Uchumi wa Michezo', slug: 'uchumi-wa-michezo' },
  { id: 2, name: 'Uongozi wa Michezo', slug: 'uongozi-wa-michezo' },
  { id: 3, name: 'Sayansi ya Michezo', slug: 'sayansi-ya-michezo' },
]

export default function Publications() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [publications, setPublications] = useState(FALLBACK_PUBLICATIONS)
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [year, setYear] = useState('')
  const [accessType, setAccessType] = useState('')

  useEffect(() => {
    apiClient
      .get('/publications/categories/')
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
    if (year) params.year = year
    if (accessType) params.access_type = accessType

    apiClient
      .get('/publications/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results)) setPublications(results)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [query, category, year, accessType])

  return (
    <>
      <section className="bg-navy-deep bg-track-lines text-white text-center py-16 md:py-20">
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
          {isSw ? 'MAKTABA' : 'LIBRARY'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Machapisho ya Kitaaluma' : 'Academic Publications'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Bure, za wanachama, au za kununua — tafiti na ripoti za sekta ya michezo.'
            : 'Free, member-only, or purchasable — research and reports from the sports sector.'}
        </p>
        <Link
          to="/publications/submit-abstract"
          className="inline-block mt-7 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md transition-colors"
        >
          {isSw ? 'Wasilisha Utafiti →' : 'Submit Research →'}
        </Link>
      </section>

      {/* ============ SEARCH & FILTERS ============ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 -mt-6 relative z-10">
        <div className="bg-white border border-black/10 rounded-xl shadow-lg p-4 md:p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isSw ? '🔍 Tafuta...' : '🔍 Search...'}
            className="md:col-span-2 border border-black/15 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-black/15 rounded-md px-4 py-2.5 text-sm">
            <option value="">{isSw ? 'Kategoria Zote' : 'All Categories'}</option>
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
        {publications.length === 0 ? (
          <p className="text-center text-ink-muted text-sm py-12">
            {isSw ? 'Hakuna machapisho yaliyopatikana.' : 'No publications found.'}
          </p>
        ) : (
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
      className="group block rounded-xl overflow-hidden border border-black/10 hover:shadow-xl transition-shadow bg-white"
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
