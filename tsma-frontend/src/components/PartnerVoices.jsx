import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPartnerVoices } from '../api/partners.js'

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * "What our partners say" — maneno ya washirika. Sehemu hii huchapishwa tu
 * ikiwa Admin/Editor amechapisha angalau neno moja (is_published); hapo
 * chini kuna data ya kupanga mara zote.
 */
export default function PartnerVoices() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [voices, setVoices] = useState([])

  useEffect(() => {
    let active = true
    fetchPartnerVoices()
      .then((res) => {
        const results = res.data?.results || res.data
        if (active && Array.isArray(results)) setVoices(results)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (voices.length === 0) return null

  return (
    <section id="partner-voices" className="py-16 md:py-20 bg-slate-50 border-t border-black/5">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy text-center">
          {t('voices.title')}
        </h2>
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {voices.map((voice) => (
            <figure
              key={voice.id}
              className="bg-white rounded-2xl border border-black/5 p-6 flex flex-col shadow-sm"
            >
              <blockquote className="text-[15px] leading-relaxed text-slate-700 flex-1">
                {isSw ? voice.quote_sw : voice.quote_en}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {voice.photo ? (
                  <img
                    src={voice.photo}
                    alt={voice.speaker_name}
                    loading="lazy"
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-11 h-11 rounded-full bg-navy text-gold flex items-center justify-center font-bold text-sm"
                  >
                    {initials(voice.speaker_name)}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-navy text-sm truncate">{voice.speaker_name}</div>
                  {(voice.speaker_title || voice.partner_name) && (
                    <div className="text-xs text-slate-500 truncate">
                      {[voice.speaker_title, voice.partner_name].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
