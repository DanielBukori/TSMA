import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import Icon from '../components/Icon.jsx'

export default function Gallery() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [albums, setAlbums] = useState([])
  const [state, setState] = useState('loading')
  const [year, setYear] = useState('')

  useEffect(() => {
    let cancelled = false
    const params = {}
    if (year) params.year = year

    setState('loading')
    apiClient
      .get('/gallery/', { params })
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setAlbums(Array.isArray(results) ? results : [])
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [year])

  const years = [...new Set(albums.map((a) => a.event_year))].sort((a, b) => b - a)

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="gallery"
          isSw={isSw}
          fallback={{
            badge_sw: 'PICHA', badge_en: 'GALLERY',
            title_sw: 'Kumbukumbu za Picha', title_en: 'Photo Gallery',
            subtitle_sw: 'Matukio, mikutano na shughuli za TSMA kwa miaka.',
            subtitle_en: "TSMA's events, conferences, and activities over the years.",
          }}
        />
      </PageBanner>

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

        {state === 'error' && (
          <EmptyState
            isSw={isSw}
            sw="Hakuna picha za kuonyesha kwa sasa."
            en="No photos to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
            tone="error"
          />
        )}

        {state === 'ready' && albums.length === 0 && (
          <EmptyState
            isSw={isSw}
            sw={year ? `Hakuna picha za ${year} bado.` : 'TSMA bado haijaweka picha za matukio.'}
            en={year ? `No photos for ${year} yet.` : 'TSMA has not published event photos yet.'}
            hintSw="Picha za mikutano na matukio huongezwa na mhariri wa tovuti."
            hintEn="Photos of conferences and events are added by the site editor."
          />
        )}

        {state === 'ready' && albums.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} isSw={isSw} />
            ))}
          </div>
        )}
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
      className="group block rounded-xl overflow-hidden border border-black/10 hover:shadow-xl transition-shadow bg-surface"
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
            <Icon name="image" className="w-10 h-10 text-white/60" strokeWidth={1.4} />
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
