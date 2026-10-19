import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

/**
 * Bendi ya juu (moja tu, navy). Maudhui yanatoka kwenye mkutano UJAO wa
 * karibuni zaidi uliopo Admin (Conferences, status = upcoming) - Admin
 * anapopost conference mpya au kubadilisha jina/tarehe/mahali, bendi
 * inabadilika yenyewe bila kugusa code. Hakuna mkutano ujao (au backend
 * haipatikani) = bendi haionekani kabisa (haionyeshi tarehe za zamani).
 *
 * Bendi ya chungwa ya juu kabisa ("Registration ... limited spots")
 * imeondolewa. Funguo za topbar.notice/topbar.event kwenye en.json/sw.json
 * hazitumiki tena hapa (unaweza kuziacha au kuzifuta).
 */
function formatRange(start, end, locale) {
  const s = new Date(start)
  if (Number.isNaN(s.getTime())) return ''
  const e = end ? new Date(end) : null
  const month = (d) => d.toLocaleDateString(locale, { month: 'long' })

  if (!e || Number.isNaN(e.getTime()) || e.getTime() === s.getTime()) {
    return `${s.getDate()} ${month(s)} ${s.getFullYear()}`
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${month(s)} ${s.getFullYear()}`
  }
  return `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`
}

export default function TopBar() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [conference, setConference] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/conferences/', { params: { status: 'upcoming' } })
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled || !Array.isArray(results) || results.length === 0) return
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const sorted = [...results]
          .filter((item) => item.start_date && !Number.isNaN(new Date(item.start_date).getTime()))
          .filter((item) => new Date(item.start_date) >= today)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        setConference(sorted[0] || null)
      })
      .catch(() => {
        // Kimya - bendi haionekani
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!conference) return null

  const locale = isSw ? 'sw-TZ' : 'en-GB'
  const when = formatRange(conference.start_date, conference.end_date, locale)
  const where = [conference.city].filter(Boolean).join(', ')

  return (
    <div className="bg-navy text-white text-center text-[13px] font-bold py-2.5 px-4">
      <span className="mr-1.5" aria-hidden="true">🏆</span>
      {conference.title}
      {where && ` — ${where}`}
      {when && `, ${when}`}
      <Link
        to={`/conferences/${conference.slug}`}
        className="inline-block ml-3 bg-gold-dark hover:bg-gold text-white text-xs font-extrabold px-3 py-1 rounded-full transition-colors"
      >
        {t('topbar.eventCta')} →
      </Link>
    </div>
  )
}
