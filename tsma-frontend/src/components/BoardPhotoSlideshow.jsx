import { useEffect, useState } from 'react'

/** Rotating photo hero built from real board-member records; hidden for 0–1 photos. */
export default function BoardPhotoSlideshow({ members = [], isSw }) {
  const slides = members.filter((member) => member?.photo)
  const [active, setActive] = useState(0)

  useEffect(() => setActive(0), [slides.length])
  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500)
    return () => window.clearInterval(timer)
  }, [slides.length])

  if (slides.length < 2) return null
  const current = slides[active % slides.length]
  return (
    <section data-reveal className="relative mx-auto mt-8 max-w-6xl overflow-hidden rounded-2xl bg-navy-deep text-white shadow-xl">
      <div className="relative h-64 sm:h-80 md:h-[28rem]">
        {slides.map((member, index) => (
          <img key={member.id} src={member.photo} alt={member.full_name || 'TSMA board member'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={index !== active} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold">{isSw ? 'UONGOZI WA TSMA' : 'TSMA LEADERSHIP'}</p>
          <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">{current.full_name}</h2>
          <p className="mt-1 text-sm text-white/85">{current.position}</p>
        </div>
        <div className="absolute bottom-6 right-5 flex gap-2 sm:bottom-8 sm:right-8" aria-label={isSw ? 'Chagua picha' : 'Choose slide'}>
          {slides.map((member, index) => (
            <button key={member.id} type="button" onClick={() => setActive(index)}
              aria-label={`${isSw ? 'Picha' : 'Slide'} ${index + 1}`} aria-pressed={active === index}
              className={`h-2.5 rounded-full transition-all ${active === index ? 'w-7 bg-gold' : 'w-2.5 bg-white/70 hover:bg-white'}`} />
          ))}
        </div>
        <button type="button" onClick={() => setActive((active - 1 + slides.length) % slides.length)}
          aria-label={isSw ? 'Picha iliyopita' : 'Previous photo'}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-2xl text-white transition hover:bg-black/70">‹</button>
        <button type="button" onClick={() => setActive((active + 1) % slides.length)}
          aria-label={isSw ? 'Picha inayofuata' : 'Next photo'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-2xl text-white transition hover:bg-black/70">›</button>
      </div>
    </section>
  )
}
