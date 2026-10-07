import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

// Mtiririko: JIUNGE (live) au TAZAMA (rekodi) -> mfumo unarekodi ushiriki -> quiz inafunguka
// -> ukifaulu unapata cheti. Hakuna kitufe cha "najimarkia nimekamilisha".
export default function SessionDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null) // { code, message }
  const [joining, setJoining] = useState(false)
  const [joinMsg, setJoinMsg] = useState('')
  const [zoomInfo, setZoomInfo] = useState(null)
  const watchRecorded = useRef(false)

  const load = useCallback(() => {
    return apiClient
      .get(`/teaching/sessions/${slug}/`)
      .then((res) => {
        setSession(res.data)
        setLoadError(null)
      })
      .catch((err) => {
        const data = err.response?.data
        setLoadError({
          code: data?.code,
          message: (Array.isArray(data?.detail) ? data.detail[0] : data?.detail) || '',
        })
      })
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    load().finally(() => setLoading(false))
  }, [load, isAuthenticated])

  // Kubofya Jiunge / Tazama: tunafungua tab MOJA KWA MOJA (kuzuia popup blocker ya simu)
  // kisha tunaielekeza baada ya seva kurekodi ushiriki.
  async function handleJoin() {
    const tab = window.open('', '_blank')
    setJoining(true)
    setJoinMsg('')
    try {
      const res = await apiClient.post(`/teaching/sessions/${slug}/join/`)
      if (res.data.meeting_id || res.data.meeting_password) {
        setZoomInfo({ id: res.data.meeting_id, password: res.data.meeting_password })
      }
      if (res.data.url) {
        if (tab) tab.location.href = res.data.url
        else window.location.href = res.data.url
      } else if (tab) {
        tab.close()
      }
      await load() // sasisha hali ya ushiriki na quiz zilizofunguka
    } catch (err) {
      if (tab) tab.close()
      const data = err.response?.data
      setJoinMsg(
        (Array.isArray(data?.detail) ? data.detail[0] : data?.detail) ||
          (isSw ? 'Imeshindikana. Jaribu tena.' : 'Something went wrong. Try again.'),
      )
    } finally {
      setJoining(false)
    }
  }

  // Rekodi ya faili inayochezwa ndani ya ukurasa: kubofya Play ndiko kunakohesabiwa kama kutazama
  async function handlePlay() {
    if (watchRecorded.current || session?.is_attended) return
    watchRecorded.current = true
    try {
      await apiClient.post(`/teaching/sessions/${slug}/join/`)
      await load()
    } catch {
      watchRecorded.current = false
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

  if (loadError?.code === 'membership_required') {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-sm text-ink mb-5">
          {loadError.message ||
            (isSw
              ? 'Teaching Excellence ni kwa wanachama waliolipia tu.'
              : 'Teaching Excellence is for paid members only.')}
        </p>
        <Link to="/members" className="inline-block bg-gold text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md">
          {isSw ? 'Jiunge / Fanya Upya Uanachama →' : 'Join / Renew Membership →'}
        </Link>
      </div>
    )
  }

  if (!session) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Kikao hakikupatikana.' : 'Session not found.'}</div>

  const isLive = session.session_type === 'live'
  const opensAt = session.join_opens_at
    ? new Date(session.join_opens_at).toLocaleString(isSw ? 'sw-TZ' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const joinLabel = isLive
    ? `🎥 ${isSw ? 'Jiunge na Kikao (Zoom/Meet)' : 'Join Session (Zoom/Meet)'}`
    : `▶️ ${isSw ? 'Tazama Rekodi' : 'Watch Recording'}`

  return (
    <section className="max-w-2xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <span className="inline-block bg-cream text-terracotta text-[11px] font-bold px-3 py-1.5 rounded-full mb-4">
        {isLive ? `🔴 ${isSw ? 'MOJA KWA MOJA' : 'LIVE'}` : `▶️ ${isSw ? 'IMEREKODIWA' : 'RECORDED'}`}
      </span>
      <h1 className="font-serif font-bold text-2xl md:text-3xl text-navy">{session.title}</h1>
      {session.instructor_name && <p className="text-sm text-terracotta font-semibold mt-2">{session.instructor_name}</p>}
      {session.description && <p className="text-sm text-ink-muted mt-4 leading-relaxed">{session.description}</p>}

      {session.can_access_media === false ? (
        <div className="mt-6 bg-gold/10 border border-gold/30 rounded-xl p-4 text-sm text-ink">
          {isSw
            ? 'Kikao hiki ni cha kozi. Jiunge na kozi husika kwanza ili ushiriki na kufanya quiz.'
            : 'This session belongs to a course. Enroll in that course first to take part and unlock the quiz.'}
          <Link to="/teaching" className="block mt-2 font-bold text-navy border-b-2 border-gold w-fit">
            {isSw ? 'Nenda kwenye Kozi →' : 'Go to Courses →'}
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          {session.recording_file && !isLive ? (
            <video controls className="w-full rounded-xl" onPlay={handlePlay}>
              <source src={session.recording_file} />
            </video>
          ) : !session.has_content ? (
            <p className="text-sm text-ink-muted">
              {isLive
                ? isSw ? 'Link ya kikao itaongezwa hivi karibuni.' : 'Meeting link will be added soon.'
                : isSw ? 'Rekodi bado haijapatikana.' : 'Recording not available yet.'}
            </p>
          ) : session.join_available ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="bg-navy hover:bg-navy-light text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors disabled:opacity-60"
            >
              {joining ? (isSw ? 'Inafungua...' : 'Opening...') : joinLabel}
            </button>
          ) : (
            <p className="text-sm text-ink-muted bg-cream rounded-lg px-4 py-3">
              {isSw
                ? `Kikao hakijaanza. Kitufe cha kujiunga kitafunguka dakika 15 kabla${opensAt ? ` (kuanzia ${opensAt})` : ''}.`
                : `The session has not started. Joining opens 15 minutes before${opensAt ? ` (from ${opensAt})` : ''}.`}
            </p>
          )}

          {joinMsg && (
            <p className="mt-3 text-sm text-terracotta bg-terracotta/10 border border-terracotta/30 rounded-lg px-4 py-3">{joinMsg}</p>
          )}

          {zoomInfo && (
            <p className="mt-3 text-xs text-ink-muted">
              {zoomInfo.id && <span>Meeting ID: <b>{zoomInfo.id}</b> </span>}
              {zoomInfo.password && <span>· Password: <b>{zoomInfo.password}</b></span>}
            </p>
          )}

          <div className="mt-6">
            {session.is_attended ? (
              <span className="inline-flex items-center gap-2 text-green font-bold text-sm">
                ✅ {isLive
                  ? isSw ? 'Umeshiriki kikao hiki' : "You've joined this session"
                  : isSw ? 'Umeshatazama kikao hiki' : "You've watched this session"}
              </span>
            ) : (
              <p className="text-xs text-ink-muted">
                {isLive
                  ? isSw ? 'Bonyeza "Jiunge" ili ushiriki wako urekodiwe - ndipo quiz inafunguka.' : 'Press "Join" so your attendance is recorded - that unlocks the quiz.'
                  : isSw ? 'Bonyeza "Tazama" ili ushiriki wako urekodiwe - ndipo quiz inafunguka.' : 'Press "Watch" so your participation is recorded - that unlocks the quiz.'}
              </p>
            )}
          </div>
        </div>
      )}

      {session.quizzes?.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif font-bold text-lg text-navy mb-4">
            {isSw ? 'Quiz ya Kikao (pata cheti ukifaulu)' : 'Session Quiz (earn a certificate when you pass)'}
          </h2>
          <div className="space-y-3">
            {session.quizzes.map((quiz) =>
              quiz.is_unlocked ? (
                <Link
                  key={quiz.id}
                  to={`/teaching/quiz/${quiz.id}`}
                  className="flex items-center justify-between gap-4 bg-gold/10 border border-gold/30 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-navy truncate">
                      {quiz.passed ? '✅' : '📝'} {quiz.title}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {quiz.total_questions} {isSw ? 'maswali' : 'questions'} · {isSw ? 'kufaulu' : 'pass'} {quiz.passing_score_percent}%
                    </p>
                  </div>
                  <span className="text-xs font-bold text-navy shrink-0">
                    {quiz.passed ? (isSw ? 'Rudia →' : 'Retake →') : isSw ? 'Anza →' : 'Start →'}
                  </span>
                </Link>
              ) : (
                <div key={quiz.id} className="bg-cream border border-black/10 rounded-xl p-4 text-sm text-ink-muted">
                  🔒 {quiz.title} —{' '}
                  {isSw
                    ? isLive ? 'jiunge na kikao kwanza ili kufungua quiz hii.' : 'tazama rekodi kwanza ili kufungua quiz hii.'
                    : isLive ? 'join the session first to unlock this quiz.' : 'watch the recording first to unlock this quiz.'}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  )
}
