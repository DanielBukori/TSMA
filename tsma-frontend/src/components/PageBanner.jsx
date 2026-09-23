import { useEffect, useState } from 'react'
import { useBackgroundImages } from '../context/BackgroundImagesContext.jsx'

const SLIDE_DURATION = 6000 // ms

/**
 * "Banner" ya juu ya ukurasa (Board, Management, Careers, Directory,
 * n.k.) — inatumia picha ZILE ZILE za background alizopakia Admin
 * (SiteBackgroundImage), ikizunguka kwa "crossfade" polepole. Kama
 * Admin hajapakia picha yoyote bado, inabaki rangi ya navy (haivunjiki).
 *
 * Matumizi: <PageBanner>{...badge/title/subtitle content...}</PageBanner>
 */
export default function PageBanner({ children, className = '' }) {
  const { images } = useBackgroundImages()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length)
    }, SLIDE_DURATION)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <section className={`relative overflow-hidden bg-navy-deep text-white text-center py-16 md:py-20 ${className}`}>
      {images.length > 0 && (
        <div className="absolute inset-0">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${
                index === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url(${img.image})` }}
              aria-hidden={index !== activeIndex}
            />
          ))}
          <div className="absolute inset-0 bg-navy-deep/60" />
        </div>
      )}
      {images.length === 0 && <div className="absolute inset-0 bg-track-lines" />}

      <div className="relative z-10">{children}</div>
    </section>
  )
}
