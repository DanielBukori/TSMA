import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const FALLBACK_ALBUMS = [
  { id: 1, slug: 'tsma-conference-2025', title: 'TSMA National Symposium 2025', cover_image: null, event_year: 2025, image_count: 24 },
  { id: 2, slug: 'board-meeting-jan-2026', title: 'Mkutano wa Bodi - Januari 2026', cover_image: null, event_year: 2026, image_count: 12 },
  { id: 3, slug: 'tsma-offices', title: 'Ofisi za TSMA', cover_image: null, event_year: 2026, image_count: 8 },
]

export default function Gallery() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [albums, setAlbums] = useState(FALLBACK_ALBUMS)
  const [year, setYear] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (year) params.year = year

    apiClient
      .get('/gallery/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results)) setAlbums(results)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [year])

  const years = [...new Set(albums.map((a) => a.event_year))].sort((a, b) => b - a)

  return (
    <>
      <section className="bg-navy-deep bg-track-lines text-white text-center py-16 md:py-20">
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
          {isSw ? 'PICHA' : 'GALLERY'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Kumbukumbu za Picha' : 'Photo Gallery'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Matukio, mikutano na shughuli za TSMA kwa miaka.'
            : "TSMA's events, conferences, and activities over the years."}
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12">
        {years.length > 1 && (
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            <YearPill active={year === ''} onClick={() => setYear('')}>
              {isSw ? 'Miaka Yote' : 'All Years'}
            </YearPill>
            {years.map((y) => (
              <YearPill key={y} active={String(year) === String(y)} onClick={() => setYear(y)}>
                {y}
              </YearPill>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} isSw={isSw} />
          ))}
        </div>
      </section>
    </>
  )
}

function YearPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors ${
        active ? 'bg-navy text-white border-navy' : 'border-black/15 text-ink hover:border-navy/40'
      }`}
    >
      {children}
    </button>
  )
}

function AlbumCard({ album, isSw }) {
  return (
    <Link
      to={`/gallery/${album.slug}`}
      className="group block rounded-xl overflow-hidden border border-black/10 hover:shadow-xl transition-shadow bg-white"
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-navy to-green-dark relative overflow-hidden">
        {album.cover_image ? (
          <img
            src={album.cover_image}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/70 text-4xl">🖼️</span>
          </div>
        )}
        <span className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
          {album.image_count} {isSw ? 'picha' : 'photos'}
        </span>
        <span className="absolute bottom-2.5 left-2.5 bg-gold text-navy-deep text-[10px] font-extrabold px-2.5 py-1 rounded-full">
          {album.event_year}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-serif font-bold text-navy text-sm leading-tight">{album.title}</h3>
      </div>
    </Link>
  )
}
