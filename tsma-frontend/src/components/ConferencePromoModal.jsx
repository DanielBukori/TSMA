import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const SESSION_KEY = 'tsma_conf_promo_dismissed'
const SHOW_DELAY_MS = 3500

/**
 * Popup ya kusukuma usajili wa mkutano wa karibuni — inaonekana kwenye
 * KURASA ZOTE za tovuti (imewekwa ndani ya Layout.jsx), MARA MOJA tu kwa
 * kila session (sessionStorage) ili isimkasirishe mtumiaji kwa kumrudia
 * kila akibofya ukurasa mpya.
 */
export default function ConferencePromoModal() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [conference, setConference] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    let cancelled = false
    apiClient
      .get('/conferences/', { params: { status: 'upcoming' } })
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) {
          setConference(results[0])
          const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
          return () => clearTimeout(timer)
        }
      })
      .catch(() => {
        // Hakuna mkutano ujao au backend haipatikani — usionyeshe popup
      })

    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(SESSION_KEY, '1')
  }

  if (!conference || !visible) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-5" onClick={dismiss}>
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Funga"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-navy text-sm"
        >
          ✕
        </button>

        <div className="bg-navy-deep bg-track-lines text-white text-center py-8 px-6">
          <span className="inline-block bg-gold text-navy-deep text-[10px] font-extrabold px-3 py-1.5 rounded-full mb-3">
            {isSw ? '🔥 USAJILI UMEFUNGULIWA' : '🔥 REGISTRATION OPEN'}
          </span>
          <h3 className="font-serif font-bold text-xl leading-tight">{conference.title}</h3>
          <p className="text-white/70 text-xs mt-2">
            {conference.venue_name}, {conference.city} · {new Date(conference.start_date).toLocaleDateString()}
          </p>
        </div>

        <div className="p-6 text-center">
          <p className="text-sm text-ink-muted mb-5">
            {isSw
              ? 'Nafasi ni chache — jisajili sasa kabla ya mwisho wa muda.'
              : 'Limited spots available — register now before it closes.'}
          </p>
          <Link
            to={`/conferences/${conference.slug}`}
            onClick={dismiss}
            className="block bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors"
          >
            {isSw ? 'Jisajili Sasa →' : 'Register Now →'}
          </Link>
          <button
            onClick={dismiss}
            className="mt-3 text-xs text-ink-muted hover:text-ink font-semibold"
          >
            {isSw ? 'Baadaye' : 'Maybe later'}
          </button>
        </div>
      </div>
    </div>
  )
}
