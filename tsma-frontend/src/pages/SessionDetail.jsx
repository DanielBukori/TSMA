import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function SessionDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    apiClient
      .get(`/teaching/sessions/${slug}/`)
      .then((res) => setSession(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, isAuthenticated])

  async function handleMarkComplete() {
    setCompleting(true)
    try {
      await apiClient.post(`/teaching/sessions/${slug}/complete/`)
      setSession((prev) => ({ ...prev, is_attended: true }))
    } catch {
      // no-op
    } finally {
      setCompleting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="text-sm text-ink-muted mb-4">
          {isSw ? 'Ingia kuweza kufikia kikao hiki.' : 'Sign in to access this session.'}
        </p>
        <Link to="/login" className="inline-block bg-gold text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md">
          {isSw ? 'Ingia →' : 'Sign In →'}
        </Link>
      </div>
    )
  }

  if (loading) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</div>
  if (!session) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Kikao hakikupatikana.' : 'Session not found.'}</div>

  return (
    <section className="max-w-2xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <span className="inline-block bg-cream text-terracotta text-[11px] font-bold px-3 py-1.5 rounded-full mb-4">
        {session.session_type === 'live' ? `🔴 ${isSw ? 'MOJA KWA MOJA' : 'LIVE'}` : `▶️ ${isSw ? 'IMEREKODIWA' : 'RECORDED'}`}
      </span>
      <h1 className="font-serif font-bold text-2xl md:text-3xl text-navy">{session.title}</h1>
      {session.instructor_name && (
        <p className="text-sm text-terracotta font-semibold mt-2">{session.instructor_name}</p>
      )}
      {session.description && <p className="text-sm text-ink-muted mt-4 leading-relaxed">{session.description}</p>}

      <div className="mt-8">
        {session.session_type === 'live' ? (
          session.meeting_link ? (
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-navy hover:bg-navy-light text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors"
            >
              🎥 {isSw ? 'Jiunge na Kikao (Zoom/Meet)' : 'Join Session (Zoom/Meet)'}
            </a>
          ) : (
            <p className="text-sm text-ink-muted">
              {isSw ? 'Link ya kikao itaongezwa hivi karibuni.' : 'Meeting link will be added soon.'}
            </p>
          )
        ) : session.recording_url ? (
          <a
            href={session.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-navy hover:bg-navy-light text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors"
          >
            ▶️ {isSw ? 'Tazama Rekodi' : 'Watch Recording'}
          </a>
        ) : session.recording_file ? (
          <video controls className="w-full rounded-xl">
            <source src={session.recording_file} />
          </video>
        ) : (
          <p className="text-sm text-ink-muted">{isSw ? 'Rekodi bado haijapatikana.' : 'Recording not available yet.'}</p>
        )}
      </div>

      <div className="mt-8">
        {session.is_attended ? (
          <span className="inline-flex items-center gap-2 text-green font-bold text-sm">
            ✅ {isSw ? 'Umeshakamilisha kikao hiki' : "You've completed this session"}
          </span>
        ) : (
          <button
            onClick={handleMarkComplete}
            disabled={completing}
            className="border border-navy text-navy font-bold text-sm px-6 py-3 rounded-md hover:bg-navy hover:text-white transition-colors disabled:opacity-60"
          >
            {completing
              ? isSw ? 'Inaweka...' : 'Marking...'
              : isSw ? '✓ Weka Nimekamilisha' : '✓ Mark as Complete'}
          </button>
        )}
      </div>
    </section>
  )
}
