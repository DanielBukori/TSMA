import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Dkt. Amina Massawe',
    role: 'Mhadhiri, Chuo Kikuu cha Dodoma',
    roleEn: 'Lecturer, University of Dodoma',
    quote:
      'TSMA imenipa jukwaa la kuwasilisha tafiti zangu na kukutana na wataalamu wenzangu kutoka kote nchini.',
    quoteEn:
      'TSMA has given me a platform to present my research and connect with fellow professionals nationwide.',
  },
  {
    id: 2,
    name: 'James Mwakalinga',
    role: 'Mjasiriamali wa Michezo',
    roleEn: 'Sports Entrepreneur',
    quote: 'Kupitia TSMA, nimepata wateja na washirika wapya kwa biashara yangu ya vifaa vya michezo.',
    quoteEn: 'Through TSMA, I have gained new clients and partners for my sports equipment business.',
  },
  {
    id: 3,
    name: 'Grace Kileo',
    role: 'Mdhamini (Sponsor)',
    roleEn: 'Sponsor',
    quote: 'Uwazi na taaluma ya TSMA ndiyo iliyotuvutia kudhamini mkutano wao wa mwaka.',
    quoteEn: "TSMA's transparency and professionalism is what attracted us to sponsor their annual conference.",
  },
]

export default function Testimonials() {
  const { t, i18n } = useTranslation()
  const [index, setIndex] = useState(0)
  const isSw = i18n.language?.startsWith('sw')

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [])

  const active = TESTIMONIALS[index]

  return (
    <section className="bg-cream py-16 md:py-20">
      <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
        <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
          {t('testimonials.eyebrow')}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy mb-10">
          {t('testimonials.title')}
        </h2>

        <div className="relative min-h-[180px]">
          {TESTIMONIALS.map((item, i) => (
            <blockquote
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className="font-serif text-lg md:text-xl text-ink italic leading-relaxed">
                “{isSw ? item.quote : item.quoteEn}”
              </p>
              <footer className="mt-5">
                <div className="font-bold text-navy text-sm">{item.name}</div>
                <div className="text-ink-muted text-xs">{isSw ? item.role : item.roleEn}</div>
              </footer>
            </blockquote>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {TESTIMONIALS.map((item, i) => (
            <button
              key={item.id}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-7 bg-terracotta' : 'w-1.5 bg-navy/20'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
