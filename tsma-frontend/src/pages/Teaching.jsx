import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const FALLBACK_COURSES = [
  { id: 1, slug: 'sports-marketing-101', title: 'Sports Marketing 101', description: 'Misingi ya masoko ya michezo.', cover_image: null, session_count: 6 },
]
const FALLBACK_SESSIONS = [
  { id: 1, slug: 'intro-webinar', title: 'Utangulizi wa TSMA Courses and Training', session_type: 'live', instructor_name: 'Dkt. Amina Massawe', scheduled_start: '2026-09-20T14:00:00Z', course: null },
]

export default function Teaching() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [courses, setCourses] = useState(FALLBACK_COURSES)
  const [sessions, setSessions] = useState(FALLBACK_SESSIONS)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      apiClient.get('/teaching/courses/'),
      apiClient.get('/teaching/sessions/'),
    ]).then(([courseRes, sessionRes]) => {
      if (cancelled) return
      if (courseRes.status === 'fulfilled') {
        const results = courseRes.value.data?.results || courseRes.value.data
        if (Array.isArray(results) && results.length > 0) setCourses(results)
      }
      if (sessionRes.status === 'fulfilled') {
        const results = sessionRes.value.data?.results || sessionRes.value.data
        if (Array.isArray(results) && results.length > 0) setSessions(results)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const standaloneSessions = sessions.filter((s) => !s.course)

  return (
    <>
      <section className="bg-navy-deep bg-track-lines text-white text-center py-16 md:py-20">
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
          {isSw ? 'KOZI NA MAFUNZO' : 'COURSES AND TRAINING'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Jifunze na TSMA' : 'Learn with TSMA'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Kozi, vikao vya moja kwa moja, na video zilizorekodiwa kwa wataalamu wa usimamizi wa michezo.'
            : 'Courses, live sessions, and recorded videos for sports management professionals.'}
        </p>
      </section>

      {courses.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 py-14">
          <h2 className="font-serif font-bold text-xl text-navy mb-6">
            {isSw ? 'Kozi' : 'Courses'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/teaching/courses/${course.slug}`}
                className="block bg-white border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-navy to-green-dark flex items-center justify-center">
                  <span className="text-white/80 text-3xl">🎓</span>
                </div>
                <div className="p-5">
                  <h3 className="font-serif font-bold text-navy text-base">{course.title}</h3>
                  <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">{course.description}</p>
                  <p className="text-xs font-bold text-terracotta mt-2">
                    {course.session_count} {isSw ? 'vikao' : 'sessions'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {standaloneSessions.length > 0 && (
        <section className="bg-cream py-14">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <h2 className="font-serif font-bold text-xl text-navy mb-6">
              {isSw ? 'Vikao Huru' : 'Standalone Sessions'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {standaloneSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/teaching/sessions/${session.slug}`}
                  className="flex items-center gap-4 bg-white border border-black/10 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-lg bg-navy text-gold flex items-center justify-center text-xl shrink-0">
                    {session.session_type === 'live' ? '🔴' : '▶️'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-navy truncate">{session.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {session.instructor_name}
                      {session.scheduled_start && ` · ${new Date(session.scheduled_start).toLocaleDateString()}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
