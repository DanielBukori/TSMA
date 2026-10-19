import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

export default function GalleryAlbumDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get(`/gallery/${slug}/`)
      .then((res) => {
        if (!cancelled) setAlbum(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    function handleKey(e) {
      if (lightboxIndex === null || !album) return
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % album.images.filter((item) => item.image && !item.video).length)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + album.images.filter((item) => item.image && !item.video).length) % album.images.filter((item) => item.image && !item.video).length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, album])

  if (loading) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</div>
  if (!album) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Albamu haikupatikana.' : 'Album not found.'}</div>

  return (
    <>
      <section className="bg-navy-deep bg-track-lines text-white text-center py-14 md:py-16 px-5">
        <Link to="/gallery" className="inline-block text-gold text-xs font-bold mb-4">
          ← {isSw ? 'Rudi kwenye Picha' : 'Back to Gallery'}
        </Link>
        <h1 className="font-serif font-bold text-2xl md:text-4xl">{album.title}</h1>
        <p className="text-white/70 text-sm mt-2">
          {album.event_year} · {album.images?.length || 0} {isSw ? 'media' : 'items'}
        </p>
        {album.description && (
          <p className="text-white/75 text-sm max-w-xl mx-auto mt-4">{album.description}</p>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {album.images?.map((img, index) => (
            <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-cream">
              {img.video ? (
                <video src={img.video} controls preload="metadata" aria-label={img.caption || 'Video ya kumbukumbu'} className="w-full h-full object-cover" />
              ) : (
                <button onClick={() => setLightboxIndex(index)} className="w-full h-full hover:opacity-90 transition-opacity" aria-label={img.caption || 'Angalia picha'}>
                  <img src={img.image} alt={img.caption || ''} className="w-full h-full object-cover" />
                </button>
              )}
              {img.caption && <p className="text-xs p-1 truncate">{img.caption}</p>}
            </div>
          ))}
        </div>
      </section>

      {lightboxIndex !== null && album.images?.filter((item) => item.image && !item.video).length > 0 && (
        <Lightbox
          images={album.images.filter((item) => item.image && !item.video)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex((i) => (i + 1) % album.images.filter((item) => item.image && !item.video).length)}
          onPrev={() => setLightboxIndex((i) => (i - 1 + album.images.filter((item) => item.image && !item.video).length) % album.images.filter((item) => item.image && !item.video).length)}
        />
      )}
    </>
  )
}

function Lightbox({ images, index, onClose, onNext, onPrev }) {
  const image = images[index]

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Funga"
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-lg"
      >
        ✕
      </button>

      <span className="absolute top-6 left-6 text-white/60 text-xs font-bold">
        {index + 1} / {images.length}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
        aria-label="Previous"
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl"
      >
        ‹
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        aria-label="Next"
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl"
      >
        ›
      </button>

      <img
        src={image.image}
        alt={image.caption || ''}
        className="max-w-[92vw] max-h-[80vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {image.caption && (
        <p className="text-white/70 text-sm mt-4 max-w-xl text-center px-5">{image.caption}</p>
      )}
    </div>
  )
}
